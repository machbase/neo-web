import {
    useEffect,
    useMemo,
    useRef,
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
    enforceChartAreaWidth,
    resolveButtonPress,
    resolveRangeChange,
    type RangeButtonAction,
} from '../range/rangeResolver';
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
    rangeRequests:
        | {
              boardRangeRequest: {
                  input: RangeExpressionInput;
                  applyVersion: number;
              };
              globalRangeRequest:
                  | { range: RangeState; applyVersion: number }
                  | undefined;
          }
        | undefined;
    commandVersions: {
        refreshDataVersion: number;
        refreshRangeVersion: number;
        expandFullRangeVersion: number;
    };
};

type PanelRangeSelection =
    | { kind: 'initialize' }
    | { kind: 'preserveCurrent' }
    | { kind: 'configured' }
    | { kind: 'input'; input: RangeExpressionInput }
    | { kind: 'concrete'; range: RangeState }
    | { kind: 'full' };

type PanelRangeResolution =
    | { kind: 'resolved'; state: ResolvedRangeState }
    | {
          kind: 'invalid';
          reason: 'invalidRangeInput' | 'currentRangeUnavailable';
      };

export function resolvePanelRangeState(
    params: {
        axisKind: AxisKind;
        fullRange: AxisRange;
        current: ResolvedRangeState | undefined;
        timeConfig: PanelInfo['time'];
        selection: PanelRangeSelection;
        referenceTimeMs: number;
    },
): PanelRangeResolution {
    const {
        axisKind,
        fullRange,
        current,
        timeConfig,
        selection,
        referenceTimeMs,
    } = params;

    if (!isValidAxisRange(fullRange)) {
        return { kind: 'invalid', reason: 'invalidRangeInput' };
    }

    const currentNavigatorInput =
        current?.navigatorRangeInput ?? EMPTY_RANGE_INPUT;

    switch (selection.kind) {
        case 'initialize': {
            if (timeConfig.useLastViewedRange && timeConfig.lastViewedRange) {
                const restoredState = createResolvedRangeState(
                    timeConfig.lastViewedRange,
                    fullRange,
                    EMPTY_RANGE_INPUT,
                );
                if (restoredState) {
                    return { kind: 'resolved', state: restoredState };
                }
            }

            const configuredState = resolveConfiguredRangeState(
                axisKind,
                fullRange,
                current,
                timeConfig.rangeInput,
                referenceTimeMs,
            );
            return configuredState ?? {
                kind: 'resolved',
                state: createDefaultResolvedRangeState(fullRange),
            };
        }
        case 'preserveCurrent': {
            if (!current) {
                return {
                    kind: 'invalid',
                    reason: 'currentRangeUnavailable',
                };
            }

            const preservedState = createResolvedRangeState(
                current.range,
                fullRange,
                current.navigatorRangeInput,
            );
            return preservedState
                ? { kind: 'resolved', state: preservedState }
                : { kind: 'invalid', reason: 'invalidRangeInput' };
        }
        case 'configured': {
            if (isRangeExpressionEmpty(timeConfig.rangeInput)) {
                return {
                    kind: 'resolved',
                    state: createDefaultResolvedRangeState(fullRange),
                };
            }

            return resolveConfiguredRangeState(
                axisKind,
                fullRange,
                current,
                timeConfig.rangeInput,
                referenceTimeMs,
            ) ?? { kind: 'invalid', reason: 'invalidRangeInput' };
        }
        case 'input': {
            const inputRange = resolveRangeInput(
                selection.input,
                axisKind,
                fullRange,
                current?.range.navigatorRange ?? fullRange,
                referenceTimeMs,
            );
            if (!inputRange) {
                return { kind: 'invalid', reason: 'invalidRangeInput' };
            }

            const currentRange =
                current?.range ?? createDefaultRangeState(fullRange);
            const resolvedState = createResolvedRangeState(
                resolveRangeChange(currentRange, {
                    type: 'navigator',
                    range: inputRange,
                }),
                fullRange,
                currentNavigatorInput,
            );
            return resolvedState
                ? { kind: 'resolved', state: resolvedState }
                : { kind: 'invalid', reason: 'invalidRangeInput' };
        }
        case 'concrete': {
            const concreteState = createResolvedRangeState(
                selection.range,
                fullRange,
                EMPTY_RANGE_INPUT,
            );
            return concreteState
                ? { kind: 'resolved', state: concreteState }
                : { kind: 'invalid', reason: 'invalidRangeInput' };
        }
        case 'full':
            return {
                kind: 'resolved',
                state: {
                    range: {
                        mainRange: { ...fullRange },
                        navigatorRange: { ...fullRange },
                    },
                    fullRange: { ...fullRange },
                    navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
                },
            };
    }
}

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
    resolution: PanelRangeResolution;
    commitPolicy: RangeCommitPolicy;
    applyBoardRange: boolean;
};

export function usePanelRangeRuntime(
    inputs: PanelBroadcastRequests & {
        panelInfo: PanelInfo;
        rangeState: ResolvedRangeState | undefined;
        isActive: boolean;
        onRangeStateChange: (rangeState: ResolvedRangeState) => void;
        onBroadcastError: (
            broadcastKey: string,
            message: string,
        ) => void;
    },
): {
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
    actions: {
        setChartAreaWidth: (width: number | undefined) => void;
        applyRangeAction: (action: RangeButtonAction) => void;
        setMainRange: (range: AxisRange) => void;
        setNavigatorRange: (
            range: AxisRange,
            input?: RangeExpressionInput,
        ) => void;
        refreshData: () => void;
        refreshRange: () => void;
        expandFullRange: () => void;
        reloadAfterEditorSave: (
            nextPanelInfo: PanelInfo,
        ) => void;
    };
} {
    const inputsRef = useRef(inputs);
    inputsRef.current = inputs;

    const rangeStateRef = useRef(inputs.rangeState);
    const rangeStatePropRef = useRef(inputs.rangeState);
    if (rangeStatePropRef.current !== inputs.rangeState) {
        rangeStatePropRef.current = inputs.rangeState;
        rangeStateRef.current = inputs.rangeState;
    }

    const [chartAreaWidth, setChartAreaWidthState] = useState<
        number | undefined
    >();
    const chartAreaWidthRef = useRef(chartAreaWidth);
    const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
    const [rangeReloadRequest, setRangeReloadRequest] =
        useState<RangeReloadRequest>(() => ({
            generation: 0,
            panelInfo: inputs.panelInfo,
            intent: inputs.rangeState
                ? 'preserveCurrent'
                : 'initialize',
            referenceTimeMs: Date.now(),
        }));

    const initialAxisKind = getSeriesListAxisKind(
        inputs.panelInfo.query.tagSet,
    );
    const initialBoardRangeVersion =
        inputs.rangeRequests?.boardRangeRequest.applyVersion ?? 0;
    const handledBoardRangeVersionsRef = useRef<Record<AxisKind, number>>({
        time: initialAxisKind === 'time' ? initialBoardRangeVersion : 0,
        numeric:
            initialAxisKind === 'numeric' ? initialBoardRangeVersion : 0,
    });
    const handledGlobalRangeVersionsRef = useRef<Record<AxisKind, number>>({
        time: 0,
        numeric: 0,
    });
    const handledCommandVersionsRef = useRef({
        ...inputs.commandVersions,
    });

    const scheduleRangeReload = useStableCallback((
        panelInfo: PanelInfo,
        intent: RangeReloadIntent,
        boardRangeRequest?: BoardRangeReloadRequest,
    ): void => {
        setRangeReloadRequest((current) => ({
            generation: current.generation + 1,
            panelInfo,
            intent,
            referenceTimeMs: Date.now(),
            boardRangeRequest: boardRangeRequest
                ? {
                      ...boardRangeRequest,
                      input: { ...boardRangeRequest.input },
                  }
                : undefined,
        }));
    });

    const commitRangeState = useStableCallback((
        nextState: ResolvedRangeState,
        policy: RangeCommitPolicy,
    ): ResolvedRangeState => {
        const width = chartAreaWidthRef.current;
        const adjustedRange = width === undefined
            ? nextState.range
            : enforceChartAreaWidth(nextState.range, width, policy);
        const adjustedState = adjustedRange === nextState.range
            ? nextState
            : { ...nextState, range: adjustedRange };

        if (isSameResolvedRangeState(rangeStateRef.current, adjustedState)) {
            return rangeStateRef.current as ResolvedRangeState;
        }

        rangeStateRef.current = adjustedState;
        inputsRef.current.onRangeStateChange(adjustedState);
        return adjustedState;
    });

    const reportRangeError = useStableCallback((
        key: string,
        message: string,
    ): void => {
        inputsRef.current.onBroadcastError(key, message);
    });

    const applyPendingRangeBroadcasts = useStableCallback((): void => {
        const currentInputs = inputsRef.current;
        if (!currentInputs.isActive) return;

        const axisKind = getSeriesListAxisKind(
            currentInputs.panelInfo.query.tagSet,
        );
        const requests = currentInputs.rangeRequests;
        let currentState = rangeStateRef.current;
        if (!axisKind || !requests || !currentState) return;

        const boardVersion = requests.boardRangeRequest.applyVersion;
        const handledBoardVersion =
            handledBoardRangeVersionsRef.current[axisKind];
        if (boardVersion < handledBoardVersion) {
            handledBoardRangeVersionsRef.current[axisKind] = boardVersion;
        } else if (boardVersion > handledBoardVersion) {
            handledBoardRangeVersionsRef.current[axisKind] = boardVersion;

            if (isRangeExpressionEmpty(currentState.navigatorRangeInput)) {
                const isClearingBoardRange = isRangeExpressionEmpty(
                    requests.boardRangeRequest.input,
                );
                if (axisKind === 'numeric' && !isClearingBoardRange) {
                    scheduleRangeReload(
                        currentInputs.panelInfo,
                        'board',
                        {
                            input: requests.boardRangeRequest.input,
                            applyVersion: boardVersion,
                            handledGlobalVersion:
                                handledGlobalRangeVersionsRef.current[axisKind],
                        },
                    );
                } else {
                    let boardResolution = isClearingBoardRange
                        ? resolvePanelRangeState({
                          axisKind,
                          fullRange: currentState.fullRange,
                          current: currentState,
                          timeConfig: currentInputs.panelInfo.time,
                          selection: { kind: 'configured' },
                          referenceTimeMs: Date.now(),
                          })
                        : resolvePanelRangeState({
                          axisKind,
                          fullRange: currentState.fullRange,
                          current: currentState,
                          timeConfig: currentInputs.panelInfo.time,
                          selection: {
                              kind: 'input',
                              input: requests.boardRangeRequest.input,
                          },
                          referenceTimeMs: Date.now(),
                          });
                    if (
                        isClearingBoardRange &&
                        boardResolution.kind === 'invalid'
                    ) {
                        boardResolution = {
                            kind: 'resolved',
                            state: createDefaultResolvedRangeState(
                                currentState.fullRange,
                            ),
                        };
                    }

                    if (boardResolution.kind === 'resolved') {
                        currentState = commitRangeState(
                            boardResolution.state,
                            isClearingBoardRange ? 'main' : 'navigator',
                        );
                    } else {
                        reportRangeError(
                            `board-range:${axisKind}:${boardVersion}`,
                            INVALID_BOARD_RANGE_MESSAGE,
                        );
                    }
                }
            }
        }

        const globalRequest = requests.globalRangeRequest;
        if (!globalRequest) return;

        const handledGlobalVersion =
            handledGlobalRangeVersionsRef.current[axisKind];
        if (globalRequest.applyVersion < handledGlobalVersion) {
            handledGlobalRangeVersionsRef.current[axisKind] =
                globalRequest.applyVersion;
            return;
        }
        if (globalRequest.applyVersion === handledGlobalVersion) return;

        handledGlobalRangeVersionsRef.current[axisKind] =
            globalRequest.applyVersion;
        const globalResolution = resolvePanelRangeState({
            axisKind,
            fullRange: currentState.fullRange,
            current: currentState,
            timeConfig: currentInputs.panelInfo.time,
            selection: {
                kind: 'concrete',
                range: globalRequest.range,
            },
            referenceTimeMs: Date.now(),
        });

        if (globalResolution.kind === 'resolved') {
            commitRangeState(globalResolution.state, 'main');
        } else {
            reportRangeError(
                `global-range:${axisKind}:${globalRequest.applyVersion}`,
                INVALID_GLOBAL_RANGE_MESSAGE,
            );
        }
    });

    const requestAxisKind = getSeriesListAxisKind(
        rangeReloadRequest.panelInfo.query.tagSet,
    );
    const fullRangeRequestKey = createFullRangeRequestKey(
        rangeReloadRequest,
        requestAxisKind,
    );
    const explicitNumericFullRange = requestAxisKind === 'numeric' &&
        rangeReloadRequest.intent !== 'board' &&
        isRangeExpressionEmpty(
            inputs.rangeRequests?.boardRangeRequest.input ?? EMPTY_RANGE_INPUT,
        )
        ? getExplicitNumericRange(rangeReloadRequest.panelInfo)
        : undefined;

    useLatestAsyncRequest({
        enabled:
            inputs.isActive &&
            chartAreaWidth !== undefined &&
            requestAxisKind !== undefined,
        requestKey: fullRangeRequestKey,
        fetch: () => explicitNumericFullRange
            ? Promise.resolve(explicitNumericFullRange)
            : seriesDataApi.fetchSeriesFullRange(
                  rangeReloadRequest.panelInfo.query.tagSet,
              ),
        onSuccess: (fullRange) => {
            if (!requestAxisKind) return;

            const boardRangeRequest =
                rangeReloadRequest.boardRangeRequest;
            if (
                rangeReloadRequest.intent === 'board' &&
                boardRangeRequest &&
                (handledBoardRangeVersionsRef.current[requestAxisKind] !==
                    boardRangeRequest.applyVersion ||
                    handledGlobalRangeVersionsRef.current[requestAxisKind] !==
                        boardRangeRequest.handledGlobalVersion)
            ) {
                return;
            }

            let reloadResolution = resolveReloadedRangeState(
                rangeReloadRequest,
                requestAxisKind,
                fullRange,
                rangeStateRef.current,
            );
            if (reloadResolution.resolution.kind === 'invalid') {
                reportRangeError(
                    createRangeReloadErrorKey(rangeReloadRequest),
                    rangeReloadRequest.intent === 'board'
                        ? INVALID_BOARD_RANGE_MESSAGE
                        : PANEL_RANGE_REQUEST_FAILED_MESSAGE,
                );
                return;
            }

            if (
                reloadResolution.applyBoardRange &&
                inputsRef.current.rangeRequests &&
                isRangeExpressionEmpty(
                    reloadResolution.resolution.state.navigatorRangeInput,
                ) &&
                !isRangeExpressionEmpty(
                    inputsRef.current.rangeRequests.boardRangeRequest.input,
                )
            ) {
                const boardResolution = resolvePanelRangeState({
                    axisKind: requestAxisKind,
                    fullRange,
                    current: reloadResolution.resolution.state,
                    timeConfig: rangeReloadRequest.panelInfo.time,
                    selection: {
                        kind: 'input',
                        input: inputsRef.current.rangeRequests
                            .boardRangeRequest.input,
                    },
                    referenceTimeMs: rangeReloadRequest.referenceTimeMs,
                });
                if (boardResolution.kind === 'resolved') {
                    reloadResolution = {
                        resolution: boardResolution,
                        commitPolicy: 'navigator',
                        applyBoardRange: false,
                    };
                } else {
                    reportRangeError(
                        `board-range:${requestAxisKind}:${inputsRef.current.rangeRequests.boardRangeRequest.applyVersion}`,
                        INVALID_BOARD_RANGE_MESSAGE,
                    );
                }
            }

            if (reloadResolution.resolution.kind === 'resolved') {
                commitRangeState(
                    reloadResolution.resolution.state,
                    reloadResolution.commitPolicy,
                );
                applyPendingRangeBroadcasts();
            }
        },
        onError: (error) =>
            reportRangeError(
                createRangeReloadErrorKey(rangeReloadRequest),
                getAsyncRequestErrorMessage(
                    error,
                    PANEL_RANGE_REQUEST_FAILED_MESSAGE,
                ),
            ),
    });

    useEffect(() => {
        applyPendingRangeBroadcasts();
    }, [
        applyPendingRangeBroadcasts,
        inputs.isActive,
        inputs.rangeRequests,
        inputs.rangeState,
    ]);

    useEffect(() => {
        if (!inputs.isActive) return;

        const handledVersions = handledCommandVersionsRef.current;
        const refreshDataCount = consumeBroadcastVersion(
            handledVersions,
            'refreshDataVersion',
            inputs.commandVersions.refreshDataVersion,
        );
        const refreshRangeCount = consumeBroadcastVersion(
            handledVersions,
            'refreshRangeVersion',
            inputs.commandVersions.refreshRangeVersion,
        );
        const expandFullRangeCount = consumeBroadcastVersion(
            handledVersions,
            'expandFullRangeVersion',
            inputs.commandVersions.expandFullRangeVersion,
        );

        const dataRefreshCount = refreshDataCount + refreshRangeCount;
        if (dataRefreshCount > 0) {
            setDataRefreshVersion((current) =>
                current + dataRefreshCount,
            );
        }

        if (expandFullRangeCount > 0 && refreshRangeCount > 0) {
            scheduleRangeReload(inputs.panelInfo, 'full');
        } else if (refreshRangeCount > 0) {
            scheduleRangeReload(inputs.panelInfo, 'refresh');
        } else if (expandFullRangeCount > 0) {
            const currentState = rangeStateRef.current;
            const axisKind = getSeriesListAxisKind(
                inputs.panelInfo.query.tagSet,
            );
            if (currentState && axisKind) {
                const resolution = resolvePanelRangeState({
                    axisKind,
                    fullRange: currentState.fullRange,
                    current: currentState,
                    timeConfig: inputs.panelInfo.time,
                    selection: { kind: 'full' },
                    referenceTimeMs: Date.now(),
                });
                if (resolution.kind === 'resolved') {
                    commitRangeState(resolution.state, 'main');
                }
            } else {
                scheduleRangeReload(inputs.panelInfo, 'full');
            }
        }
    }, [
        commitRangeState,
        inputs.commandVersions.expandFullRangeVersion,
        inputs.commandVersions.refreshDataVersion,
        inputs.commandVersions.refreshRangeVersion,
        inputs.isActive,
        inputs.panelInfo,
        scheduleRangeReload,
    ]);

    const setChartAreaWidth = useStableCallback((
        width: number | undefined,
    ): void => {
        const nextWidth =
            width !== undefined && Number.isFinite(width) && width > 0
                ? width
                : undefined;
        chartAreaWidthRef.current = nextWidth;
        setChartAreaWidthState(nextWidth);

        const currentState = rangeStateRef.current;
        if (!currentState || nextWidth === undefined) return;

        commitRangeState(currentState, 'main');
    });

    const applyRangeAction = useStableCallback((
        action: RangeButtonAction,
    ): void => {
        if (!inputsRef.current.isActive) return;

        const currentState = rangeStateRef.current;
        if (!currentState) return;

        commitRangeState(
            {
                ...currentState,
                range: resolveButtonPress(currentState.range, action),
            },
            action === 'shift-navigator-left' ||
                action === 'shift-navigator-right'
                ? 'navigator'
                : 'main',
        );
    });

    const setMainRange = useStableCallback((range: AxisRange): void => {
        if (!inputsRef.current.isActive || !isValidAxisRange(range)) return;

        const currentState = rangeStateRef.current;
        if (!currentState) return;

        commitRangeState(
            {
                ...currentState,
                range: resolveRangeChange(currentState.range, {
                    type: 'main',
                    range,
                }),
            },
            'main',
        );
    });

    const setNavigatorRange = useStableCallback((
        range: AxisRange,
        input?: RangeExpressionInput,
    ): void => {
        if (!inputsRef.current.isActive || !isValidAxisRange(range)) return;

        const currentState = rangeStateRef.current;
        if (!currentState) return;

        if (input && isRangeExpressionEmpty(input)) {
            commitRangeState(
                {
                    ...currentState,
                    navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
                },
                'main',
            );
            setDataRefreshVersion((current) => current + 1);
            scheduleRangeReload(inputsRef.current.panelInfo, 'refresh');
            return;
        }

        commitRangeState(
            {
                ...currentState,
                range: resolveRangeChange(currentState.range, {
                    type: 'navigator',
                    range,
                }),
                navigatorRangeInput: input
                    ? { ...input }
                    : currentState.navigatorRangeInput,
            },
            'navigator',
        );
    });

    const refreshData = useStableCallback((): void => {
        if (inputsRef.current.isActive) {
            setDataRefreshVersion((current) => current + 1);
        }
    });

    const refreshRange = useStableCallback((): void => {
        if (!inputsRef.current.isActive) return;

        setDataRefreshVersion((current) => current + 1);
        scheduleRangeReload(inputsRef.current.panelInfo, 'refresh');
    });

    const expandFullRange = useStableCallback((): void => {
        if (!inputsRef.current.isActive) return;

        const currentState = rangeStateRef.current;
        const axisKind = getSeriesListAxisKind(
            inputsRef.current.panelInfo.query.tagSet,
        );
        if (!currentState || !axisKind) {
            scheduleRangeReload(inputsRef.current.panelInfo, 'full');
            return;
        }

        const resolution = resolvePanelRangeState({
            axisKind,
            fullRange: currentState.fullRange,
            current: currentState,
            timeConfig: inputsRef.current.panelInfo.time,
            selection: { kind: 'full' },
            referenceTimeMs: Date.now(),
        });
        if (resolution.kind === 'resolved') {
            commitRangeState(resolution.state, 'main');
        }
    });

    const reloadAfterEditorSave = useStableCallback((
        nextPanelInfo: PanelInfo,
    ): void => {
        setDataRefreshVersion((current) => current + 1);

        const currentRangeInput =
            inputsRef.current.panelInfo.time.rangeInput;
        const nextRangeInput = nextPanelInfo.time.rangeInput;
        const configuredRangeChanged =
            currentRangeInput.start !== nextRangeInput.start ||
            currentRangeInput.end !== nextRangeInput.end;
        scheduleRangeReload(
            nextPanelInfo,
            configuredRangeChanged
                ? 'configured'
                : 'preserveCurrent',
        );
    });

    const actions = useMemo(
        () => ({
            setChartAreaWidth,
            applyRangeAction,
            setMainRange,
            setNavigatorRange,
            refreshData,
            refreshRange,
            expandFullRange,
            reloadAfterEditorSave,
        }),
        [
            applyRangeAction,
            expandFullRange,
            refreshData,
            refreshRange,
            reloadAfterEditorSave,
            setChartAreaWidth,
            setMainRange,
            setNavigatorRange,
        ],
    );

    return { chartAreaWidth, dataRefreshVersion, actions };
}

function resolveConfiguredRangeState(
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
    input: RangeExpressionInput,
    referenceTimeMs: number,
): PanelRangeResolution | undefined {
    if (isRangeExpressionEmpty(input)) return undefined;

    const configuredRange = resolveRangeInput(
        input,
        axisKind,
        fullRange,
        current?.range.mainRange ?? fullRange,
        referenceTimeMs,
    );
    if (!configuredRange) return undefined;

    const state = createResolvedRangeState(
        {
            mainRange: configuredRange,
            navigatorRange: fullRange,
        },
        fullRange,
        EMPTY_RANGE_INPUT,
    );
    return state ? { kind: 'resolved', state } : undefined;
}

function resolveReloadedRangeState(
    request: RangeReloadRequest,
    axisKind: AxisKind,
    fullRange: AxisRange,
    current: ResolvedRangeState | undefined,
): ReloadResolution {
    const params = {
        axisKind,
        fullRange,
        current,
        timeConfig: request.panelInfo.time,
        referenceTimeMs: request.referenceTimeMs,
    };

    if (request.intent === 'board') {
        return {
            resolution: request.boardRangeRequest
                ? resolvePanelRangeState({
                      ...params,
                      selection: {
                          kind: 'input',
                          input: request.boardRangeRequest.input,
                      },
                  })
                : { kind: 'invalid', reason: 'invalidRangeInput' },
            commitPolicy: 'navigator',
            applyBoardRange: false,
        };
    }

    if (request.intent === 'full') {
        return {
            resolution: resolvePanelRangeState({
                ...params,
                selection: { kind: 'full' },
            }),
            commitPolicy: 'main',
            applyBoardRange: false,
        };
    }

    if (request.intent === 'preserveCurrent' && current) {
        return {
            resolution: resolvePanelRangeState({
                ...params,
                selection: { kind: 'preserveCurrent' },
            }),
            commitPolicy: 'main',
            applyBoardRange: false,
        };
    }

    if (
        request.intent === 'refresh' &&
        current &&
        !isRangeExpressionEmpty(current.navigatorRangeInput)
    ) {
        const resolution = resolvePanelRangeState({
            ...params,
            selection: {
                kind: 'input',
                input: current.navigatorRangeInput,
            },
        });
        return {
            resolution:
                resolution.kind === 'resolved'
                    ? resolution
                    : resolvePanelRangeState({
                          ...params,
                          selection: { kind: 'preserveCurrent' },
                      }),
            commitPolicy:
                resolution.kind === 'resolved' ? 'navigator' : 'main',
            applyBoardRange: false,
        };
    }

    const selection = request.intent === 'initialize'
        ? { kind: 'initialize' as const }
        : { kind: 'configured' as const };
    let resolution = resolvePanelRangeState({ ...params, selection });
    const configuredResolution = resolvePanelRangeState({
        ...params,
        selection: { kind: 'configured' },
    });
    if (resolution.kind === 'invalid') {
        resolution = {
            kind: 'resolved',
            state: createDefaultResolvedRangeState(fullRange),
        };
    }

    const restoredLastViewedRange =
        request.intent === 'initialize' &&
        request.panelInfo.time.useLastViewedRange &&
        request.panelInfo.time.lastViewedRange !== undefined &&
        createResolvedRangeState(
            request.panelInfo.time.lastViewedRange,
            fullRange,
            EMPTY_RANGE_INPUT,
        ) !== undefined;

    return {
        resolution,
        commitPolicy: 'main',
        applyBoardRange:
            !restoredLastViewedRange &&
            (isRangeExpressionEmpty(
                request.panelInfo.time.rangeInput,
            ) || configuredResolution.kind === 'invalid'),
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

function createFullRangeRequestKey(
    request: RangeReloadRequest,
    axisKind: AxisKind | undefined,
): string {
    const sources = request.panelInfo.query.tagSet.map((series) => ({
        table: series.table,
        sourceTagName: series.sourceTagName,
        sourceColumns: series.sourceColumns,
    }));

    return [
        request.panelInfo.key,
        request.generation,
        axisKind ?? 'invalid',
        JSON.stringify(sources),
    ].join('\0');
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

function consumeBroadcastVersion(
    handledVersions: PanelBroadcastRequests['commandVersions'],
    key: keyof PanelBroadcastRequests['commandVersions'],
    version: number,
): number {
    const handledVersion = handledVersions[key];
    handledVersions[key] = version;
    return version > handledVersion ? version - handledVersion : 0;
}
