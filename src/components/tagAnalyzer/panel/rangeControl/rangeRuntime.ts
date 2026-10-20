import type { RangeControlConfig, RangeState, ResolvedRangeState } from './rangeControlModel';
import {
    useEffect,
    useState,
} from 'react';
import { resolveDistanceRange } from '@/utils/distanceRange';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../../hooks/useLatestAsyncRequest';
import { useStableCallback } from '../../hooks/useStableCallback';
import { isFiniteNumber } from '../../objectGuards';
import { getRangeWidth, isSameRange } from '../../rangeExpression/rangeArithmetic';
import { resolveRangeInput } from '../../rangeExpression/rangeInput';
import {
    isRangeExpressionEmpty,
    SINGLE_POINT_NUMERIC_WIDTH,
    SINGLE_POINT_TIME_WIDTH_MS,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from '../../rangeExpression/rangeModel';
import {
    enforceNavigatorTrackWidth,
    resolveButtonPress,
    resolveRangeChange,
    type RangeButtonAction,
    type RangeChange,
} from './rangeTransitions';

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

export function resolveSetGlobalRangeRequest(
    axisKind: AxisKind | undefined,
    isRaw: boolean,
    isChartReady: boolean,
    renderRange: RangeState | undefined,
): SetGlobalRangeRequest | undefined {
    const range = renderRange && normalizeRangeState(renderRange);

    if (
        !isChartReady ||
        !axisKind ||
        !range ||
        (isRaw && axisKind === 'time')
    ) {
        return undefined;
    }

    return { axisKind, range };
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
    const requestAxisKind = rangeReloadRequest.config.axisKind;

    useLatestAsyncRequest({
        enabled:
            inputs.isActive &&
            machine.chartAreaWidth !== undefined &&
            requestAxisKind !== undefined,
        requestKey: String(rangeReloadRequest.generation),
        fetch: () => rangeReloadRequest.config.loadFullRange(),
        onSuccess: (fullRange) => {
            if (!requestAxisKind) return;
            setMachine((current) => applyFullRangeResult(
                current,
                rangeReloadRequest,
                fullRange,
                inputs.config,
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
                    inputs.config,
                    inputs.rangeRequests,
                    Date.now(),
                ),
                inputs.config,
                inputs.commandVersions,
                Date.now(),
            ));
        }
    }, [
        inputs.isActive,
        inputs.config,
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
        rangeOrigin: machine.rangeOrigin,
        chartAreaWidth: machine.chartAreaWidth,
        navigatorTrackWidth: machine.navigatorTrackWidth,
        dataRefreshVersion: machine.dataRefreshVersion,
        previewEditorRange: (nextConfig: RangeControlConfig): RangeState | undefined => {
            if (!machine.rangeState) return undefined;
            const now = Date.now();
            const preview = queueEditorReload(machine, inputs.config, nextConfig, now);
            return applyFullRangeResult(
                preview,
                preview.rangeReloadRequest,
                machine.rangeState.fullRange,
                nextConfig,
                inputs.rangeRequests,
                now,
            ).rangeState?.range;
        },
        actions: {
            setChartWidths: (areaWidth: number | undefined, navigatorWidth: number | undefined) => setMachine((current) =>
                resizeRangeMachine(current, areaWidth, navigatorWidth),
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
                    inputs.config,
                    range,
                    input,
                    Date.now(),
                ),
            ),
            refreshData: () => updateActive(refreshMachineData),
            refreshRange: () => updateActive((current) => queueDataReload(
                current,
                inputs.config,
                'refresh',
                Date.now(),
            )),
            expandFullRange: () => updateActive((current) =>
                expandMachineRange(current, inputs.config, Date.now()),
            ),
            reloadAfterEditorSave: (nextConfig: RangeControlConfig) => setMachine((current) =>
                queueEditorReload(current, inputs.config, nextConfig, Date.now()),
            ),
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
    fixedRange: FixedRange = 'navigator',
): ResolvedRangeState | undefined {
    const range = resolveRuntimeRangeInput(
        input,
        axisKind,
        fullRange,
        current?.range.navigatorRange ?? fullRange,
        referenceTimeMs,
    );
    if (!range) return undefined;

    const currentRange = current?.range ?? createDefaultRangeState(fullRange, axisKind);
    return createResolvedRangeState(
        fixedRange === 'main'
            ? { mainRange: currentRange.mainRange, navigatorRange: range }
            : resolveRangeChange(currentRange, { type: 'navigator', range }),
        fullRange,
        current?.navigatorRangeInput ?? EMPTY_RANGE_INPUT,
    );
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

// -------------------- Local --------------------

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const PANEL_RANGE_REQUEST_FAILED_MESSAGE =
    'Failed to resolve the panel data range.';
const INVALID_BOARD_RANGE_MESSAGE =
    'The board range is invalid for this panel.';
const INVALID_GLOBAL_RANGE_MESSAGE =
    'The global range is invalid for this panel.';

type SetGlobalRangeRequest = { axisKind: AxisKind; range: RangeState };

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
    config: RangeControlConfig;
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
    rangeOrigin: 'configured' | 'chart';
    chartAreaWidth: number | undefined;
    navigatorTrackWidth: number | undefined;
    dataRefreshVersion: number;
    rangeReloadRequest: RangeReloadRequest;
    handledBoardVersions: Record<AxisKind, number>;
    handledGlobalVersion: number;
    handledCommandVersions: PanelBroadcastRequests['commandVersions'];
    rangeRevision: number;
    issues: RangeIssue[];
};

type PanelRangeRuntimeInputs = PanelBroadcastRequests & {
    config: RangeControlConfig;
    rangeState: ResolvedRangeState | undefined;
    isActive: boolean;
    onRangeStateChange: (rangeState: ResolvedRangeState) => void;
    onBroadcastError: (broadcastKey: string, message: string) => void;
};

function createRangeMachine(inputs: PanelRangeRuntimeInputs): RangeMachineState {
    const axisKind = inputs.config.axisKind;
    const boardVersion = axisKind
        ? inputs.rangeRequests.board[axisKind].applyVersion
        : 0;

    return {
        rangeState: inputs.rangeState,
        rangeOrigin: 'configured',
        chartAreaWidth: undefined,
        navigatorTrackWidth: undefined,
        dataRefreshVersion: 0,
        rangeReloadRequest: {
            generation: 0,
            config: inputs.config,
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
    requestedNavigatorWidth: number | undefined,
): RangeMachineState {
    const hasValidWidths = requestedWidth !== undefined &&
        Number.isFinite(requestedWidth) && requestedWidth > 0 &&
        requestedNavigatorWidth !== undefined &&
        Number.isFinite(requestedNavigatorWidth) && requestedNavigatorWidth > 0;
    const width = hasValidWidths ? requestedWidth : undefined;
    const navigatorTrackWidth = hasValidWidths ? requestedNavigatorWidth : undefined;
    if (width === state.chartAreaWidth && navigatorTrackWidth === state.navigatorTrackWidth) return state;
    const resized = { ...state, chartAreaWidth: width, navigatorTrackWidth };
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
    config: RangeControlConfig,
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
        return queueDataReload(cleared, config, 'refresh', now);
    }

    const axisKind = config.axisKind;
    const configuredMainState = state.rangeState && axisKind
        ? resolveConfiguredRangeState(
              axisKind,
              state.rangeState.fullRange,
              state.rangeState,
              config.rangeInput,
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
    rangeOrigin: RangeMachineState['rangeOrigin'] = 'chart',
): RangeMachineState {
    const adjustedRange = state.navigatorTrackWidth === undefined
        ? nextRangeState.range
        : enforceNavigatorTrackWidth(
              nextRangeState.range,
              state.navigatorTrackWidth,
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
              rangeOrigin,
              rangeRevision: state.rangeRevision + 1,
          };
}

function areConfiguredRangesEqual(left: RangeControlConfig, right: RangeControlConfig): boolean {
    return (['rangeInput', 'navigatorRangeInput'] as const).every((key) =>
        (left[key]?.start ?? '') === (right[key]?.start ?? '') &&
        (left[key]?.end ?? '') === (right[key]?.end ?? ''),
    );
}

function queueEditorReload(
    current: RangeMachineState,
    config: RangeControlConfig,
    nextConfig: RangeControlConfig,
    now: number,
): RangeMachineState {
    const preserveCurrent = current.rangeOrigin === 'configured' && areConfiguredRangesEqual(config, nextConfig);
    current = { ...current, rangeOrigin: 'configured' };
    const navigatorInput = nextConfig.navigatorRangeInput ?? EMPTY_RANGE_INPUT;
    if (current.rangeState && !isSameRangeInput(
        current.rangeState.navigatorRangeInput,
        navigatorInput,
    )) {
        current = {
            ...current,
            rangeState: { ...current.rangeState, navigatorRangeInput: navigatorInput },
        };
    }
    return queueDataReload(
        current,
        nextConfig,
        preserveCurrent ? 'preserveCurrent' : 'configured',
        now,
    );
}

function queueRangeReload(
    state: RangeMachineState,
    config: RangeControlConfig,
    intent: RangeReloadIntent,
    referenceTimeMs: number,
    boardRangeRequest?: BoardRangeReloadRequest,
): RangeMachineState {
    return {
        ...state,
        rangeReloadRequest: {
            generation: state.rangeReloadRequest.generation + 1,
            config,
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
    config: RangeControlConfig,
    intent: RangeReloadIntent,
    referenceTimeMs: number,
): RangeMachineState {
    return queueRangeReload(
        refreshMachineData(state),
        config,
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
    config: RangeControlConfig,
    requests: PanelBroadcastRequests['rangeRequests'],
    now: number,
): RangeMachineState {
    const axisKind = config.axisKind;
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
                next = queueRangeReload(next, config, 'board', now, {
                    input: boardRequest.input,
                    boardVersion,
                });
            } else {
                const configuredMainState = resolveConfiguredRangeState(
                    axisKind,
                    currentRange.fullRange,
                    currentRange,
                    config.rangeInput,
                    now,
                );
                const boardState = isClearing
                    ? configuredMainState ?? createDefaultResolvedRangeState(
                          currentRange.fullRange,
                          axisKind,
                      )
                    : resolveNavigatorRangeState(
                          axisKind,
                          currentRange.fullRange,
                          configuredMainState ?? currentRange,
                          boardRequest.input,
                          now,
                          configuredMainState ? 'main' : 'navigator',
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
    config: RangeControlConfig,
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
        return queueRangeReload(next, config, 'full', now);
    }
    if (refreshRangeCount > 0) {
        return queueRangeReload(next, config, 'refresh', now);
    }
    if (expandFullCount > 0) {
        next = expandMachineRange(next, config, now);
    }
    return next;
}

function expandMachineRange(
    state: RangeMachineState,
    config: RangeControlConfig,
    now: number,
): RangeMachineState {
    const axisKind = config.axisKind;
    if (!state.rangeState || !axisKind) {
        return queueRangeReload(state, config, 'full', now);
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
    config: RangeControlConfig,
    rangeRequests: PanelBroadcastRequests['rangeRequests'],
    now: number,
): RangeMachineState {
    if (request.generation !== state.rangeReloadRequest.generation) {
        return state;
    }
    if (request.globalVersionAtStart !== state.handledGlobalVersion) {
        return state;
    }

    const axisKind = request.config.axisKind;
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
        request.intent === 'preserveCurrent'
            ? state.rangeOrigin
            : request.intent === 'configured' || request.intent === 'initialize'
            ? 'configured'
            : 'chart',
    );
    return applyRangeBroadcasts(
        next,
        config,
        rangeRequests,
        now,
    );
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
        request.config.restoredRange
            ? createResolvedRangeState(
                  request.config.restoredRange,
                  fullRange,
                  request.config.navigatorRangeInput ?? EMPTY_RANGE_INPUT,
              )
            : undefined;
    if (restoredState) return createReloadResolution(restoredState);

    const configuredMainState = resolveConfiguredRangeState(
        axisKind,
        fullRange,
        current,
        request.config.rangeInput,
        request.referenceTimeMs,
    );
    const configuredNavigatorInput = current?.navigatorRangeInput ?? request.config.navigatorRangeInput;
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
        resolveNavigatorRangeState(
            axisKind,
            fullRange,
            baseState,
            input,
            request.referenceTimeMs,
            navigatorFixedRange,
        );

    if (hasConfiguredNavigator) {
        const configuredNavigatorState = resolveNavigator(
            configuredNavigatorInput,
        );
        return createReloadResolution(
            configuredNavigatorState
                ? { ...configuredNavigatorState, navigatorRangeInput: { ...configuredNavigatorInput } }
                : baseState,
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
    return `panel-range:${request.config.key}:${request.generation}`;
}
