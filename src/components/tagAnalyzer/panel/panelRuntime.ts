import {
    useEffect,
    useState,
} from 'react';
import { resolveDistanceRange } from '@/utils/distanceRange';
import {
    seriesDataApi,
    SINGLE_POINT_NUMERIC_WIDTH,
    SINGLE_POINT_TIME_WIDTH_MS,
} from '../api/seriesDataApi';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../hooks/useLatestAsyncRequest';
import { useStableCallback } from '../hooks/useStableCallback';
import { isFiniteNumber } from '../objectGuards';
import { getRangeWidth, isSameRange } from '../range/rangeArithmetic';
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
    type RangeChange,
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

type SetGlobalRangeRequest = { axisKind: AxisKind; range: RangeState };

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
    boardVersion: number;
};

type RangeReloadRequest = {
    generation: number;
    panelInfo: PanelInfo;
    intent: RangeReloadIntent;
    referenceTimeMs: number;
    globalVersionAtStart: number;
    boardRangeRequest?: BoardRangeReloadRequest;
};

type DirectRangeChange = Exclude<RangeChange, { type: 'replace' }>;
type FixedRange = DirectRangeChange['type'];

type RangeIssue = { key: string; message: string };

type ReloadResolution = {
    state: ResolvedRangeState;
    fixedRange: FixedRange;
    issue?: RangeIssue;
};

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
            globalVersionAtStart: 0,
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

function applyDirectRangeChange(
    state: RangeMachineState,
    change: DirectRangeChange,
    navigatorRangeInput?: RangeExpressionInput,
): RangeMachineState {
    if (!state.rangeState || !isFiniteIncreasingRange(change.range)) {
        return state;
    }
    return commitMachineRange(
        state,
        {
            ...state.rangeState,
            range: resolveRangeChange(state.rangeState.range, change),
            navigatorRangeInput: navigatorRangeInput
                ? { ...navigatorRangeInput }
                : state.rangeState.navigatorRangeInput,
        },
        change.type,
    );
}

function applyRangeReplacement(
    state: RangeMachineState,
    sourceRange: RangeState,
    constrainedRange: RangeState,
): RangeMachineState {
    const normalizedRange = normalizeRangeState(constrainedRange);
    if (!state.rangeState || !normalizedRange) return state;
    const currentRange = state.rangeState.range;
    if (
        !isSameRange(currentRange.mainRange, sourceRange.mainRange) ||
        !isSameRange(currentRange.navigatorRange, sourceRange.navigatorRange)
    ) {
        return state;
    }
    return commitMachineRange(
        state,
        { ...state.rangeState, range: normalizedRange },
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
    if (input && isRangeExpressionEmpty(input)) {
        if (!state.rangeState || !isFiniteIncreasingRange(range)) return state;
        const cleared = commitMachineRange(
            state,
            {
                ...state.rangeState,
                navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
            },
            'main',
        );
        return queueDataReload(cleared, panelInfo, 'refresh', now);
    }

    const axisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    const configuredMainState = state.rangeState && axisKind
        ? resolveConfiguredRangeState(
              axisKind,
              state.rangeState.fullRange,
              state.rangeState,
              panelInfo.time.rangeInput,
              now,
          )
        : undefined;
    if (
        configuredMainState &&
        input &&
        !isRangeExpressionEmpty(input) &&
        isFiniteIncreasingRange(range)
    ) {
        const configuredNavigatorState = createResolvedRangeState(
            {
                mainRange: configuredMainState.range.mainRange,
                navigatorRange: range,
            },
            configuredMainState.fullRange,
            input,
        );
        return configuredNavigatorState
            ? commitMachineRange(state, configuredNavigatorState, 'main')
            : state;
    }

    return applyDirectRangeChange(
        state,
        {
            type: 'navigator',
            range,
        },
        input,
    );
}

function commitMachineRange(
    state: RangeMachineState,
    nextRangeState: ResolvedRangeState,
    fixedRange: FixedRange,
): RangeMachineState {
    const adjustedRange = state.chartAreaWidth === undefined
        ? nextRangeState.range
        : enforceNavigatorTrackWidth(
              nextRangeState.range,
              getNavigatorTrackWidth(state.chartAreaWidth),
              fixedRange,
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
            globalVersionAtStart: state.handledGlobalVersion,
            boardRangeRequest: boardRangeRequest && {
                ...boardRangeRequest,
                input: { ...boardRangeRequest.input },
            },
        },
    };
}

function queueDataReload(
    state: RangeMachineState,
    panelInfo: PanelInfo,
    intent: RangeReloadIntent,
    referenceTimeMs: number,
): RangeMachineState {
    return queueRangeReload(
        refreshMachineData(state),
        panelInfo,
        intent,
        referenceTimeMs,
    );
}

function refreshMachineData(
    state: RangeMachineState,
    count = 1,
): RangeMachineState {
    return count > 0
        ? { ...state, dataRefreshVersion: state.dataRefreshVersion + count }
        : state;
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
                    boardVersion,
                });
            } else {
                const configuredMainState = resolveConfiguredRangeState(
                    axisKind,
                    currentRange.fullRange,
                    currentRange,
                    panelInfo.time.rangeInput,
                    now,
                );
                const boardState = isClearing
                    ? configuredMainState ?? createDefaultResolvedRangeState(
                          currentRange.fullRange,
                          axisKind,
                      )
                    : configuredMainState
                      ? resolveNavigatorRangeAroundMain(
                            axisKind,
                            currentRange.fullRange,
                            configuredMainState,
                            boardRequest.input,
                            now,
                        )
                      : resolveNavigatorRangeState(
                            axisKind,
                            currentRange.fullRange,
                            currentRange,
                            boardRequest.input,
                            now,
                        );
                if (boardState) {
                    next = commitMachineRange(
                        next,
                        boardState,
                        isClearing || configuredMainState
                            ? 'main'
                            : 'navigator',
                    );
                } else {
                    const fallback = configuredMainState
                        ? commitMachineRange(
                              next,
                              configuredMainState,
                              'main',
                          )
                        : next;
                    next = queueRangeIssue(
                        fallback,
                        `board-range:${axisKind}:${boardVersion}`,
                        INVALID_BOARD_RANGE_MESSAGE,
                    );
                }
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
    const pendingCount = (key: keyof typeof versions) =>
        Math.max(0, versions[key] - handled[key]);
    const refreshDataCount = pendingCount('refreshDataVersion');
    const refreshRangeCount = pendingCount('refreshRangeVersion');
    const expandFullCount = pendingCount('expandFullRangeVersion');
    if (
        versions.refreshDataVersion === handled.refreshDataVersion &&
        versions.refreshRangeVersion === handled.refreshRangeVersion &&
        versions.expandFullRangeVersion === handled.expandFullRangeVersion
    ) {
        return state;
    }
    let next = {
        ...refreshMachineData(state, refreshDataCount + refreshRangeCount),
        handledCommandVersions: { ...versions },
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
    if (request.globalVersionAtStart !== state.handledGlobalVersion) {
        return state;
    }

    const axisKind = getSeriesListAxisKind(
        request.panelInfo.query.tagSet,
    );
    if (!axisKind) return state;

    const boardGuard = request.boardRangeRequest;
    if (
        request.intent === 'board' && boardGuard &&
        state.handledBoardVersions[axisKind] !== boardGuard.boardVersion
    ) {
        return state;
    }

    const boardRequest = rangeRequests.board[axisKind];
    const resolution = resolveReloadedRangeState(
        request,
        axisKind,
        fullRange,
        state.rangeState,
        boardRequest,
    );
    if (!resolution) {
        return queueRangeIssue(
            state,
            createRangeReloadErrorKey(request),
            request.intent === 'board'
                ? INVALID_BOARD_RANGE_MESSAGE
                : PANEL_RANGE_REQUEST_FAILED_MESSAGE,
        );
    }

    let next = resolution.issue
        ? queueRangeIssue(state, resolution.issue.key, resolution.issue.message)
        : state;
    next = commitMachineRange(
        next,
        resolution.state,
        resolution.fixedRange,
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

    useLatestAsyncRequest({
        enabled:
            inputs.isActive &&
            machine.chartAreaWidth !== undefined &&
            requestAxisKind !== undefined,
        requestKey: String(rangeReloadRequest.generation),
        fetch: () => seriesDataApi.fetchSeriesFullRange(
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
                applyDirectRangeChange(current, { type: 'main', range }),
            ),
            applyRawLimitRange: (
                sourceRange: RangeState,
                constrainedRange: RangeState,
            ) => updateActive((current) =>
                applyRangeReplacement(
                    current,
                    sourceRange,
                    constrainedRange,
                ),
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
            refreshData: () => updateActive(refreshMachineData),
            refreshRange: () => updateActive((current) => queueDataReload(
                current,
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
                return queueDataReload(
                    current,
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
    const configuredRange = resolveRuntimeRangeInput(
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
        current?.navigatorRangeInput ?? EMPTY_RANGE_INPUT,
    );
}

export function resolveNavigatorRangeState(
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
    input: RangeExpressionInput,
    referenceTimeMs: number,
): ResolvedRangeState | undefined {
    const range = resolveRuntimeRangeInput(
        input,
        axisKind,
        fullRange,
        current?.range.navigatorRange ?? fullRange,
        referenceTimeMs,
    );
    return range
        ? createResolvedRangeState(
              resolveRangeChange(
                  current?.range ?? createDefaultRangeState(fullRange, axisKind),
                  { type: 'navigator', range },
              ),
              fullRange,
              current?.navigatorRangeInput ?? EMPTY_RANGE_INPUT,
          )
        : undefined;
}

function resolveNavigatorRangeAroundMain(
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState,
    input: RangeExpressionInput,
    referenceTimeMs: number,
): ResolvedRangeState | undefined {
    const navigatorRange = resolveRuntimeRangeInput(
        input,
        axisKind,
        fullRange,
        current.range.navigatorRange,
        referenceTimeMs,
    );
    return navigatorRange
        ? createResolvedRangeState(
              {
                  mainRange: current.range.mainRange,
                  navigatorRange,
              },
              fullRange,
              current.navigatorRangeInput,
          )
        : undefined;
}

function resolveRuntimeRangeInput(
    input: RangeExpressionInput,
    axisKind: AxisKind,
    fullRange: AxisRange,
    currentRange: AxisRange,
    referenceTimeMs: number,
): AxisRange | undefined {
    if (axisKind === 'time') {
        return resolveRangeInput(
            input,
            axisKind,
            fullRange,
            currentRange,
            referenceTimeMs,
        );
    }

    if (isRangeExpressionEmpty(input)) return undefined;

    const resolved = resolveDistanceRange(
        input.start,
        input.end,
        { min: fullRange.start, max: fullRange.end },
    );
    if (
        resolved.from === null ||
        resolved.to === null ||
        resolved.from >= resolved.to
    ) {
        return undefined;
    }

    return { start: resolved.from, end: resolved.to };
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

function createReloadResolution(
    state: ResolvedRangeState | undefined,
    fixedRange: FixedRange = 'main',
): ReloadResolution | undefined {
    return state
        ? { state, fixedRange }
        : undefined;
}

function resolveReloadedRangeState(
    request: RangeReloadRequest,
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
    boardRequest: PanelBroadcastRequests['rangeRequests']['board'][AxisKind],
): ReloadResolution | undefined {
    if (request.intent === 'full') {
        return createReloadResolution(createFullRangeState(fullRange));
    }

    if (request.intent === 'preserveCurrent' && current) {
        return createReloadResolution(
            createResolvedRangeState(
                current.range,
                fullRange,
                current.navigatorRangeInput,
            ),
        );
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
    if (restoredState) return createReloadResolution(restoredState);

    const configuredMainState = resolveConfiguredRangeState(
        axisKind,
        fullRange,
        current,
        request.panelInfo.time.rangeInput,
        request.referenceTimeMs,
    );
    const configuredNavigatorInput = current?.navigatorRangeInput;
    const hasConfiguredNavigator = configuredNavigatorInput !== undefined &&
        !isRangeExpressionEmpty(configuredNavigatorInput);
    const currentWithFullRange = current
        ? createResolvedRangeState(
              current.range,
              fullRange,
              current.navigatorRangeInput,
          )
        : undefined;
    const baseState =
        configuredMainState ??
        ((hasConfiguredNavigator || request.intent === 'board')
            ? currentWithFullRange
            : undefined) ??
        createDefaultResolvedRangeState(fullRange, axisKind);
    const navigatorFixedRange = configuredMainState ? 'main' : 'navigator';
    const resolveNavigator = (input: RangeExpressionInput) =>
        configuredMainState
            ? resolveNavigatorRangeAroundMain(
                  axisKind,
                  fullRange,
                  baseState,
                  input,
                  request.referenceTimeMs,
              )
            : resolveNavigatorRangeState(
                  axisKind,
                  fullRange,
                  baseState,
                  input,
                  request.referenceTimeMs,
              );

    if (hasConfiguredNavigator) {
        const configuredNavigatorState = resolveNavigator(
            configuredNavigatorInput,
        );
        return createReloadResolution(
            configuredNavigatorState ?? baseState,
            configuredNavigatorState ? navigatorFixedRange : 'main',
        );
    }

    const boardInput = request.intent === 'board'
        ? request.boardRangeRequest?.input
        : boardRequest.input;
    if (!boardInput) return undefined;
    if (isRangeExpressionEmpty(boardInput)) {
        return createReloadResolution(baseState);
    }

    const boardState = resolveNavigator(boardInput);
    return boardState
        ? createReloadResolution(boardState, navigatorFixedRange)
        : {
              state: baseState,
              fixedRange: 'main',
              issue: {
                  key: request.intent === 'board'
                      ? createRangeReloadErrorKey(request)
                      : `board-range:${axisKind}:${boardRequest.applyVersion}`,
                  message: INVALID_BOARD_RANGE_MESSAGE,
              },
          };
}

function createDefaultResolvedRangeState(
    fullRange: AxisRange,
    axisKind: AxisKind,
): ResolvedRangeState {
    return {
        range: createDefaultRangeState(fullRange, axisKind),
        fullRange: { ...fullRange },
        navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
    };
}

function createDefaultRangeState(
    fullRange: AxisRange,
    axisKind: AxisKind,
): RangeState {
    const fullRangeState = {
        mainRange: fullRange,
        navigatorRange: fullRange,
    };
    const minimumWidth = axisKind === 'time'
        ? SINGLE_POINT_TIME_WIDTH_MS
        : SINGLE_POINT_NUMERIC_WIDTH;

    return getRangeWidth(fullRange) <= minimumWidth
        ? fullRangeState
        : resolveButtonPress(fullRangeState, 'zoom-in-large');
}

function createResolvedRangeState(
    range: RangeState,
    fullRange: AxisRange,
    navigatorRangeInput: RangeExpressionInput,
): ResolvedRangeState | undefined {
    const normalizedRange = normalizeRangeState(range);
    if (!normalizedRange || !isFiniteIncreasingRange(fullRange)) return undefined;

    return {
        range: normalizedRange,
        fullRange: { ...fullRange },
        navigatorRangeInput: { ...navigatorRangeInput },
    };
}

function normalizeRangeState(range: RangeState): RangeState | undefined {
    if (
        !isFiniteIncreasingRange(range.mainRange) ||
        !isFiniteIncreasingRange(range.navigatorRange)
    ) {
        return undefined;
    }

    return resolveRangeChange(range, { type: 'replace', range });
}

function isFiniteIncreasingRange(range: AxisRange): boolean {
    return (
        isFiniteNumber(range.start) &&
        isFiniteNumber(range.end) &&
        range.start < range.end
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
        return `board-range:numeric:${request.boardRangeRequest.boardVersion}`;
    }
    return `panel-range:${request.panelInfo.key}:${request.generation}`;
}
