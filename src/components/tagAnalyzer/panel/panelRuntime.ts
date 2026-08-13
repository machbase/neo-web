import {
    useEffect,
    useState,
} from 'react';
import { seriesDataApi } from '../api/seriesDataApi';
import { parseRangeInputValue } from '../format/inputFormat';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../hooks/useLatestAsyncRequest';
import { useStableCallback } from '../hooks/useStableCallback';
import {
    getRangeWidth,
    isSameRange,
} from '../range/rangeArithmetic';
import { resolveRangeInput } from '../range/rangeInput';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import {
    enforceNavigatorTrackWidth,
    resolveButtonPress,
    resolveRangeChange,
    type RangeButtonAction,
} from '../range/rangeResolver';
import { getNavigatorTrackWidth } from '../chart/chartGeometry';
import { getSeriesListAxisKind } from '../seriesModel';
import type { PanelInfo } from './panelModel';

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const PANEL_RANGE_REQUEST_FAILED_MESSAGE =
    'Failed to resolve the panel data range.';
const INVALID_BOARD_RANGE_MESSAGE =
    'The board range is invalid for this panel.';
const INVALID_GLOBAL_RANGE_MESSAGE =
    'The global range is invalid for this panel.';

export type PanelBroadcastRequests = {
    rangeRequests: {
        board: Record<AxisKind, {
            input: RangeExpressionInput;
            applyVersion: number;
        }>;
        global?: {
            axisKind: AxisKind;
            range: RangeState;
            applyVersion: number;
        };
    };
    commandVersions: {
        refreshDataVersion: number;
        refreshRangeVersion: number;
        expandFullRangeVersion: number;
    };
};

type SetGlobalRangeRequest = {
    axisKind: AxisKind;
    range: RangeState;
};

export function resolveSetGlobalRangeRequest(
    panelInfo: Pick<PanelInfo, 'query' | 'mode'>,
    isChartReady: boolean,
    renderRange: RangeState | undefined,
): SetGlobalRangeRequest | undefined {
    const axisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    const range = renderRange && normalizeRangeState(renderRange);

    if (
        !isChartReady ||
        !axisKind ||
        !range ||
        (panelInfo.mode.isRaw && axisKind === 'time')
    ) {
        return undefined;
    }

    return { axisKind, range };
}

type RangeReloadIntent =
    | 'initialize'
    | 'preserveCurrent'
    | 'configured'
    | 'refresh'
    | 'full'
    | 'board';

type BoardRangeReloadRequest = {
    input: RangeExpressionInput;
    applyVersion: number;
    handledGlobalVersion: number;
};

type RangeReloadRequest = {
    generation: number;
    panelInfo: PanelInfo;
    intent: RangeReloadIntent;
    referenceTimeMs: number;
    boardRangeRequest?: BoardRangeReloadRequest;
};

type RangeCommitPolicy = 'main' | 'navigator';

type ReloadResolution = {
    state: ResolvedRangeState | undefined;
    commitPolicy: RangeCommitPolicy;
    applyBoardRange: boolean;
};

type RangeIssue = { key: string; message: string };

type RangeMachineState = {
    rangeState: ResolvedRangeState | undefined;
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
    rangeReloadRequest: RangeReloadRequest;
    handledBoardVersions: Record<AxisKind, number>;
    handledGlobalVersion: number;
    handledCommandVersions: PanelBroadcastRequests['commandVersions'];
    rangeRevision: number;
    issues: RangeIssue[];
};

type PanelRangeRuntimeInputs = PanelBroadcastRequests & {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    isActive: boolean;
    onRangeStateChange: (rangeState: ResolvedRangeState) => void;
    onBroadcastError: (broadcastKey: string, message: string) => void;
};

function createRangeMachine(inputs: PanelRangeRuntimeInputs): RangeMachineState {
    const axisKind = getSeriesListAxisKind(inputs.panelInfo.query.tagSet);
    const boardVersion = axisKind
        ? inputs.rangeRequests.board[axisKind].applyVersion
        : 0;

    return {
        rangeState: inputs.rangeState,
        chartAreaWidth: undefined,
        dataRefreshVersion: 0,
        rangeReloadRequest: {
            generation: 0,
            panelInfo: inputs.panelInfo,
            intent: inputs.rangeState ? 'preserveCurrent' : 'initialize',
            referenceTimeMs: Date.now(),
        },
        handledBoardVersions: {
            time: axisKind === 'time' ? boardVersion : 0,
            numeric: axisKind === 'numeric' ? boardVersion : 0,
        },
        handledGlobalVersion: 0,
        handledCommandVersions: { ...inputs.commandVersions },
        rangeRevision: 0,
        issues: [],
    };
}

function resizeRangeMachine(
    state: RangeMachineState,
    requestedWidth: number | undefined,
): RangeMachineState {
    const width = requestedWidth !== undefined &&
        Number.isFinite(requestedWidth) && requestedWidth > 0
        ? requestedWidth
        : undefined;
    if (width === state.chartAreaWidth) return state;
    const resized = { ...state, chartAreaWidth: width };
    return resized.rangeState && width !== undefined
        ? commitMachineRange(resized, resized.rangeState, 'main')
        : resized;
}

function applyRangeButton(
    state: RangeMachineState,
    action: RangeButtonAction,
): RangeMachineState {
    if (!state.rangeState) return state;
    return commitMachineRange(
        state,
        {
            ...state.rangeState,
            range: resolveButtonPress(state.rangeState.range, action),
        },
        action === 'shift-navigator-left' ||
            action === 'shift-navigator-right'
            ? 'navigator'
            : 'main',
    );
}

function applyMainRange(
    state: RangeMachineState,
    range: AxisRange,
): RangeMachineState {
    if (!state.rangeState || !isValidAxisRange(range)) return state;
    return commitMachineRange(
        state,
        {
            ...state.rangeState,
            range: resolveRangeChange(state.rangeState.range, {
                type: 'main',
                range,
            }),
        },
        'main',
    );
}

function applyNavigatorRange(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    range: AxisRange,
    input: RangeExpressionInput | undefined,
    now: number,
): RangeMachineState {
    if (!state.rangeState || !isValidAxisRange(range)) return state;
    if (input && isRangeExpressionEmpty(input)) {
        const cleared = commitMachineRange(
            state,
            {
                ...state.rangeState,
                navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
            },
            'main',
        );
        return queueRangeReload(
            {
                ...cleared,
                dataRefreshVersion: cleared.dataRefreshVersion + 1,
            },
            panelInfo,
            'refresh',
            now,
        );
    }
    return commitMachineRange(
        state,
        {
            ...state.rangeState,
            range: resolveRangeChange(state.rangeState.range, {
                type: 'navigator',
                range,
            }),
            navigatorRangeInput: input
                ? { ...input }
                : state.rangeState.navigatorRangeInput,
        },
        'navigator',
    );
}

function commitMachineRange(
    state: RangeMachineState,
    nextRangeState: ResolvedRangeState,
    policy: RangeCommitPolicy,
): RangeMachineState {
    const adjustedRange = state.chartAreaWidth === undefined
        ? nextRangeState.range
        : enforceNavigatorTrackWidth(
              nextRangeState.range,
              getNavigatorTrackWidth(state.chartAreaWidth),
              policy,
          );
    const adjustedState = adjustedRange === nextRangeState.range
        ? nextRangeState
        : { ...nextRangeState, range: adjustedRange };

    return isSameResolvedRangeState(state.rangeState, adjustedState)
        ? state
        : {
              ...state,
              rangeState: adjustedState,
              rangeRevision: state.rangeRevision + 1,
          };
}

function queueRangeReload(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    intent: RangeReloadIntent,
    referenceTimeMs: number,
    boardRangeRequest?: BoardRangeReloadRequest,
): RangeMachineState {
    return {
        ...state,
        rangeReloadRequest: {
            generation: state.rangeReloadRequest.generation + 1,
            panelInfo,
            intent,
            referenceTimeMs,
            boardRangeRequest: boardRangeRequest && {
                ...boardRangeRequest,
                input: { ...boardRangeRequest.input },
            },
        },
    };
}

function queueRangeIssue(
    state: RangeMachineState,
    key: string,
    message: string,
): RangeMachineState {
    return { ...state, issues: [...state.issues, { key, message }] };
}

function applyRangeBroadcasts(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    requests: PanelBroadcastRequests['rangeRequests'],
    now: number,
): RangeMachineState {
    const axisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    const initialRangeState = state.rangeState;
    if (!axisKind || !initialRangeState) return state;

    let next = state;
    const boardRequest = requests.board[axisKind];
    const boardVersion = boardRequest.applyVersion;
    const handledBoardVersion = next.handledBoardVersions[axisKind];
    if (boardVersion !== handledBoardVersion) {
        next = {
            ...next,
            handledBoardVersions: {
                ...next.handledBoardVersions,
                [axisKind]: boardVersion,
            },
        };
    }
    if (boardVersion > handledBoardVersion) {
        const currentRange = next.rangeState ?? initialRangeState;
        if (isRangeExpressionEmpty(currentRange.navigatorRangeInput)) {
            const isClearing = isRangeExpressionEmpty(boardRequest.input);
            if (axisKind === 'numeric' && !isClearing) {
                next = queueRangeReload(next, panelInfo, 'board', now, {
                    input: boardRequest.input,
                    applyVersion: boardVersion,
                    handledGlobalVersion: next.handledGlobalVersion,
                });
            } else {
                const boardState = isClearing
                    ? resolveConfiguredRangeState(
                          axisKind,
                          currentRange.fullRange,
                          currentRange,
                          panelInfo.time.rangeInput,
                          now,
                      ) ?? createDefaultResolvedRangeState(
                          currentRange.fullRange,
                      )
                    : resolveNavigatorRangeState(
                          axisKind,
                          currentRange.fullRange,
                          currentRange,
                          boardRequest.input,
                          now,
                      );
                next = boardState
                    ? commitMachineRange(
                          next,
                          boardState,
                          isClearing ? 'main' : 'navigator',
                      )
                    : queueRangeIssue(
                          next,
                          `board-range:${axisKind}:${boardVersion}`,
                          INVALID_BOARD_RANGE_MESSAGE,
                      );
            }
        }
    }

    const globalRequest = requests.global;
    if (!globalRequest || globalRequest.axisKind !== axisKind) return next;

    const handledGlobalVersion = next.handledGlobalVersion;
    if (globalRequest.applyVersion !== handledGlobalVersion) {
        next = {
            ...next,
            handledGlobalVersion: globalRequest.applyVersion,
        };
    }
    if (globalRequest.applyVersion <= handledGlobalVersion) return next;

    const globalState = createResolvedRangeState(
        globalRequest.range,
        next.rangeState?.fullRange ?? initialRangeState.fullRange,
        EMPTY_RANGE_INPUT,
    );
    return globalState
        ? commitMachineRange(next, globalState, 'main')
        : queueRangeIssue(
              next,
              `global-range:${axisKind}:${globalRequest.applyVersion}`,
              INVALID_GLOBAL_RANGE_MESSAGE,
          );
}

function applyCommandBroadcasts(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    versions: PanelBroadcastRequests['commandVersions'],
    now: number,
): RangeMachineState {
    const handled = state.handledCommandVersions;
    const refreshDataCount = Math.max(
        0,
        versions.refreshDataVersion - handled.refreshDataVersion,
    );
    const refreshRangeCount = Math.max(
        0,
        versions.refreshRangeVersion - handled.refreshRangeVersion,
    );
    const expandFullCount = Math.max(
        0,
        versions.expandFullRangeVersion - handled.expandFullRangeVersion,
    );
    if (
        versions.refreshDataVersion === handled.refreshDataVersion &&
        versions.refreshRangeVersion === handled.refreshRangeVersion &&
        versions.expandFullRangeVersion === handled.expandFullRangeVersion
    ) {
        return state;
    }
    let next = {
        ...state,
        handledCommandVersions: { ...versions },
        dataRefreshVersion:
            state.dataRefreshVersion + refreshDataCount + refreshRangeCount,
    };

    if (refreshRangeCount > 0 && expandFullCount > 0) {
        return queueRangeReload(next, panelInfo, 'full', now);
    }
    if (refreshRangeCount > 0) {
        return queueRangeReload(next, panelInfo, 'refresh', now);
    }
    if (expandFullCount > 0) {
        next = expandMachineRange(next, panelInfo, now);
    }
    return next;
}

function expandMachineRange(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    now: number,
): RangeMachineState {
    const axisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    if (!state.rangeState || !axisKind) {
        return queueRangeReload(state, panelInfo, 'full', now);
    }
    const expandedState = createFullRangeState(state.rangeState.fullRange);
    return expandedState
        ? commitMachineRange(state, expandedState, 'main')
        : state;
}

function applyFullRangeResult(
    state: RangeMachineState,
    request: RangeReloadRequest,
    fullRange: AxisRange,
    panelInfo: PanelInfo,
    rangeRequests: PanelBroadcastRequests['rangeRequests'],
    now: number,
): RangeMachineState {
    if (request.generation !== state.rangeReloadRequest.generation) {
        return state;
    }

    const axisKind = getSeriesListAxisKind(
        request.panelInfo.query.tagSet,
    );
    if (!axisKind) return state;

    const boardGuard = request.boardRangeRequest;
    if (
        request.intent === 'board' && boardGuard &&
        (state.handledBoardVersions[axisKind] !== boardGuard.applyVersion ||
            state.handledGlobalVersion !== boardGuard.handledGlobalVersion)
    ) {
        return state;
    }

    let resolution = resolveReloadedRangeState(
        request,
        axisKind,
        fullRange,
        state.rangeState,
    );
    if (!resolution.state) {
        return queueRangeIssue(
            state,
            createRangeReloadErrorKey(request),
            request.intent === 'board'
                ? INVALID_BOARD_RANGE_MESSAGE
                : PANEL_RANGE_REQUEST_FAILED_MESSAGE,
        );
    }

    const currentBoardRequest = rangeRequests.board[axisKind];
    let next = state;
    if (
        resolution.applyBoardRange &&
        isRangeExpressionEmpty(resolution.state.navigatorRangeInput) &&
        !isRangeExpressionEmpty(currentBoardRequest.input)
    ) {
        const boardState = resolveNavigatorRangeState(
            axisKind,
            fullRange,
            resolution.state,
            currentBoardRequest.input,
            request.referenceTimeMs,
        );
        if (boardState) {
            resolution = {
                state: boardState,
                commitPolicy: 'navigator',
                applyBoardRange: false,
            };
        } else {
            next = queueRangeIssue(
                next,
                `board-range:${axisKind}:${currentBoardRequest.applyVersion}`,
                INVALID_BOARD_RANGE_MESSAGE,
            );
        }
    }

    const resolvedState = resolution.state;
    if (!resolvedState) return next;
    next = commitMachineRange(
        next,
        resolvedState,
        resolution.commitPolicy,
    );
    return applyRangeBroadcasts(
        next,
        panelInfo,
        rangeRequests,
        now,
    );
}

export function usePanelRangeRuntime(
    inputs: PanelRangeRuntimeInputs,
) {
    const [machine, setMachine] = useState(() =>
        createRangeMachine(inputs),
    );
    const reportBroadcastError = useStableCallback(inputs.onBroadcastError);
    const persistRangeState = useStableCallback(inputs.onRangeStateChange);
    const rangeReloadRequest = machine.rangeReloadRequest;
    const requestAxisKind = getSeriesListAxisKind(
        rangeReloadRequest.panelInfo.query.tagSet,
    );
    const explicitNumericFullRange = requestAxisKind === 'numeric' &&
        rangeReloadRequest.intent !== 'board' &&
        isRangeExpressionEmpty(inputs.rangeRequests.board.numeric.input)
        ? getExplicitNumericRange(rangeReloadRequest.panelInfo)
        : undefined;

    useLatestAsyncRequest({
        enabled:
            inputs.isActive &&
            machine.chartAreaWidth !== undefined &&
            requestAxisKind !== undefined,
        requestKey: String(rangeReloadRequest.generation),
        fetch: () => explicitNumericFullRange
            ? Promise.resolve(explicitNumericFullRange)
            : seriesDataApi.fetchSeriesFullRange(
                  rangeReloadRequest.panelInfo.query.tagSet,
              ),
        onSuccess: (fullRange) => {
            if (!requestAxisKind) return;
            setMachine((current) => applyFullRangeResult(
                current,
                rangeReloadRequest,
                fullRange,
                inputs.panelInfo,
                inputs.rangeRequests,
                Date.now(),
            ));
        },
        onError: (error) =>
            reportBroadcastError(
                createRangeReloadErrorKey(rangeReloadRequest),
                getAsyncRequestErrorMessage(
                    error,
                    PANEL_RANGE_REQUEST_FAILED_MESSAGE,
                ),
            ),
    });

    useEffect(() => {
        if (inputs.isActive) {
            setMachine((current) => applyCommandBroadcasts(
                applyRangeBroadcasts(
                    current,
                    inputs.panelInfo,
                    inputs.rangeRequests,
                    Date.now(),
                ),
                inputs.panelInfo,
                inputs.commandVersions,
                Date.now(),
            ));
        }
    }, [
        inputs.isActive,
        inputs.panelInfo,
        inputs.commandVersions,
        inputs.rangeRequests,
    ]);

    useEffect(() => {
        if (machine.rangeRevision > 0 && machine.rangeState) {
            persistRangeState(machine.rangeState);
        }
    }, [machine.rangeRevision, machine.rangeState, persistRangeState]);

    useEffect(() => {
        if (machine.issues.length === 0) return;
        for (const issue of machine.issues) {
            reportBroadcastError(issue.key, issue.message);
        }
        const reportedCount = machine.issues.length;
        setMachine((current) => ({
            ...current,
            issues: current.issues.slice(reportedCount),
        }));
    }, [machine.issues, reportBroadcastError]);

    const updateActive = (
        update: (current: RangeMachineState) => RangeMachineState,
    ): void => {
        if (inputs.isActive) setMachine(update);
    };

    return {
        rangeState: machine.rangeState,
        chartAreaWidth: machine.chartAreaWidth,
        dataRefreshVersion: machine.dataRefreshVersion,
        actions: {
            setChartAreaWidth: (width: number | undefined) => setMachine((current) =>
                resizeRangeMachine(current, width),
            ),
            applyRangeAction: (action: RangeButtonAction) => updateActive((current) =>
                applyRangeButton(current, action),
            ),
            setMainRange: (range: AxisRange) => updateActive((current) =>
                applyMainRange(current, range),
            ),
            setNavigatorRange: (
                range: AxisRange,
                input?: RangeExpressionInput,
            ) => updateActive((current) =>
                applyNavigatorRange(
                    current,
                    inputs.panelInfo,
                    range,
                    input,
                    Date.now(),
                ),
            ),
            refreshData: () => updateActive((current) => ({
                ...current,
                dataRefreshVersion: current.dataRefreshVersion + 1,
            })),
            refreshRange: () => updateActive((current) => queueRangeReload(
                {
                    ...current,
                    dataRefreshVersion: current.dataRefreshVersion + 1,
                },
                inputs.panelInfo,
                'refresh',
                Date.now(),
            )),
            expandFullRange: () => updateActive((current) =>
                expandMachineRange(current, inputs.panelInfo, Date.now()),
            ),
            reloadAfterEditorSave: (nextPanelInfo: PanelInfo) => setMachine((current) => {
                const currentInput = inputs.panelInfo.time.rangeInput;
                const nextInput = nextPanelInfo.time.rangeInput;
                return queueRangeReload(
                    {
                        ...current,
                        dataRefreshVersion: current.dataRefreshVersion + 1,
                    },
                    nextPanelInfo,
                    currentInput.start !== nextInput.start ||
                        currentInput.end !== nextInput.end
                        ? 'configured'
                        : 'preserveCurrent',
                    Date.now(),
                );
            }),
        },
    };
}

export function resolveConfiguredRangeState(
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
    input: RangeExpressionInput,
    referenceTimeMs: number,
): ResolvedRangeState | undefined {
    if (isRangeExpressionEmpty(input)) return undefined;

    const configuredRange = resolveRangeInput(
        input,
        axisKind,
        fullRange,
        current?.range.mainRange ?? fullRange,
        referenceTimeMs,
    );
    if (!configuredRange) return undefined;

    return createResolvedRangeState(
        {
            mainRange: configuredRange,
            navigatorRange: fullRange,
        },
        fullRange,
        EMPTY_RANGE_INPUT,
    );
}

export function resolveNavigatorRangeState(
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
    input: RangeExpressionInput,
    referenceTimeMs: number,
): ResolvedRangeState | undefined {
    const range = resolveRangeInput(
        input,
        axisKind,
        fullRange,
        current?.range.navigatorRange ?? fullRange,
        referenceTimeMs,
    );
    return range
        ? createResolvedRangeState(
              resolveRangeChange(
                  current?.range ?? createDefaultRangeState(fullRange),
                  { type: 'navigator', range },
              ),
              fullRange,
              current?.navigatorRangeInput ?? EMPTY_RANGE_INPUT,
          )
        : undefined;
}

export function createFullRangeState(
    fullRange: AxisRange,
): ResolvedRangeState | undefined {
    return createResolvedRangeState(
        { mainRange: fullRange, navigatorRange: fullRange },
        fullRange,
        EMPTY_RANGE_INPUT,
    );
}

function resolveReloadedRangeState(
    request: RangeReloadRequest,
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
): ReloadResolution {
    if (request.intent === 'board') {
        return {
            state: request.boardRangeRequest
                ? resolveNavigatorRangeState(
                      axisKind,
                      fullRange,
                      current,
                      request.boardRangeRequest.input,
                      request.referenceTimeMs,
                  )
                : undefined,
            commitPolicy: 'navigator',
            applyBoardRange: false,
        };
    }

    if (request.intent === 'full') {
        return {
            state: createFullRangeState(fullRange),
            commitPolicy: 'main',
            applyBoardRange: false,
        };
    }

    if (request.intent === 'preserveCurrent' && current) {
        return {
            state: createResolvedRangeState(
                current.range,
                fullRange,
                current.navigatorRangeInput,
            ),
            commitPolicy: 'main',
            applyBoardRange: false,
        };
    }

    if (
        request.intent === 'refresh' &&
        current &&
        !isRangeExpressionEmpty(current.navigatorRangeInput)
    ) {
        const refreshedState = resolveNavigatorRangeState(
            axisKind,
            fullRange,
            current,
            current.navigatorRangeInput,
            request.referenceTimeMs,
        );
        return {
            state: refreshedState ?? createResolvedRangeState(
                current.range,
                fullRange,
                current.navigatorRangeInput,
            ),
            commitPolicy: refreshedState ? 'navigator' : 'main',
            applyBoardRange: false,
        };
    }

    const restoredState =
        request.intent === 'initialize' &&
        request.panelInfo.time.useLastViewedRange &&
        request.panelInfo.time.lastViewedRange
            ? createResolvedRangeState(
                  request.panelInfo.time.lastViewedRange,
                  fullRange,
                  EMPTY_RANGE_INPUT,
              )
            : undefined;
    const configuredState = resolveConfiguredRangeState(
        axisKind,
        fullRange,
        current,
        request.panelInfo.time.rangeInput,
        request.referenceTimeMs,
    );

    return {
        state:
            restoredState ??
            configuredState ??
            createDefaultResolvedRangeState(fullRange),
        commitPolicy: 'main',
        applyBoardRange: !restoredState && !configuredState,
    };
}

function createDefaultResolvedRangeState(
    fullRange: AxisRange,
): ResolvedRangeState {
    return {
        range: createDefaultRangeState(fullRange),
        fullRange: { ...fullRange },
        navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
    };
}

function createDefaultRangeState(fullRange: AxisRange): RangeState {
    return resolveButtonPress(
        {
            mainRange: fullRange,
            navigatorRange: fullRange,
        },
        'zoom-in-large',
    );
}

function createResolvedRangeState(
    range: RangeState,
    fullRange: AxisRange,
    navigatorRangeInput: RangeExpressionInput,
): ResolvedRangeState | undefined {
    const normalizedRange = normalizeRangeState(range);
    if (!normalizedRange || !isValidAxisRange(fullRange)) return undefined;

    return {
        range: normalizedRange,
        fullRange: { ...fullRange },
        navigatorRangeInput: { ...navigatorRangeInput },
    };
}

function normalizeRangeState(range: RangeState): RangeState | undefined {
    if (
        !isValidAxisRange(range.mainRange) ||
        !isValidAxisRange(range.navigatorRange)
    ) {
        return undefined;
    }

    return resolveRangeChange(range, { type: 'replace', range });
}

function isValidAxisRange(range: AxisRange): boolean {
    return (
        Number.isFinite(range.start) &&
        Number.isFinite(range.end) &&
        getRangeWidth(range) > 0
    );
}

function isSameResolvedRangeState(
    current: ResolvedRangeState | undefined,
    next: ResolvedRangeState,
): boolean {
    return (
        current !== undefined &&
        isSameRange(current.range.mainRange, next.range.mainRange) &&
        isSameRange(
            current.range.navigatorRange,
            next.range.navigatorRange,
        ) &&
        isSameRange(current.fullRange, next.fullRange) &&
        isSameRangeInput(
            current.navigatorRangeInput,
            next.navigatorRangeInput,
        )
    );
}

function isSameRangeInput(
    left: RangeExpressionInput,
    right: RangeExpressionInput,
): boolean {
    return (
        left.start.trim() === right.start.trim() &&
        left.end.trim() === right.end.trim()
    );
}

function createRangeReloadErrorKey(request: RangeReloadRequest): string {
    if (request.intent === 'board' && request.boardRangeRequest) {
        return `board-range:numeric:${request.boardRangeRequest.applyVersion}`;
    }
    return `panel-range:${request.panelInfo.key}:${request.generation}`;
}

function getExplicitNumericRange(
    panelInfo: PanelInfo,
): AxisRange | undefined {
    const start = parseRangeInputValue(
        panelInfo.time.rangeInput.start,
        'numeric',
    );
    const end = parseRangeInputValue(
        panelInfo.time.rangeInput.end,
        'numeric',
    );

    return start !== undefined &&
        end !== undefined &&
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start < end
        ? { start, end }
        : undefined;
}
