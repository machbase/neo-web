import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Toast } from '@/design-system/components';
import { seriesDataApi } from '../api/seriesDataApi';
import { getErrorMessageFromValue } from '../errorMessage';
import type { PanelInfo } from './panelModel';
import {
    createResolvedPanelRangeState,
    resolveConcretePanelRangeState,
    resolveEnteredMainRangeState,
    resolveNavigatorDisplayRange,
    resolveNavigatorInputRangeState,
    resolvePanelRangeCandidate,
    resolveRequestedNavigatorRangeState,
} from './panelRangeResolution';
import {
    isResolvedPanelRangeState,
    type PanelRangeSourceState,
    type ResolvedPanelRangeState,
} from './panelRangeSourceState';
import { parseNumericRangeExpression } from '../range/format/numericRangeFormat';
import {
    createPanelRangeButtonCandidate,
    createPanelRangeUpdateCandidate,
    type PanelRangeCandidate,
    type PanelRangeButtonAction,
    type PanelRangeUpdate,
} from '../range/panelRangeCommands';
import {
    getSeriesListAxisKind,
    type PanelSeriesDefinition,
} from '../seriesModel';
import { isSameRange, isValidRange } from '../range/rangeArithmetic';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type PanelRangeState,
    type RangeExpressionInput,
} from '../range/rangeModel';
import { useStableCallback } from '../hooks/useStableCallback';

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const RANGE_ACTION_ERROR_MESSAGE = 'Failed to update panel range.';
const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

export type PanelRangeRuntimeRequests = {
    boardRanges: Record<
        AxisKind,
        { input: RangeExpressionInput; applyVersion: number }
    >;
    globalRangeRequest: {
        range: PanelRangeState | undefined;
        applyVersion: number;
    };
    commandVersions: {
        refreshDataVersion: number;
        refreshRangeVersion: number;
        expandFullRangeVersion: number;
    };
};

type PanelRangeCommandContext = {
    panelInfo: PanelInfo;
    rangeState: PanelRangeSourceState;
    requestGeneration: number;
};

type ResolvedPanelRangeResult =
    | ResolvedPanelRangeState
    | Promise<ResolvedPanelRangeState>;

type PanelRangeCommand = (
    context: PanelRangeCommandContext,
) => ResolvedPanelRangeResult | void;

type ConfiguredPanelRangeOptions = {
    applyInitialMainChartWindow: boolean;
    boardRange?: RangeExpressionInput;
    useLastViewedRange?: boolean;
};

type PanelRequestState = {
    generation: number;
    initializing?: boolean;
    broadcastKey?: string;
};

type PanelRequestOptions = {
    panelInfo?: PanelInfo;
    initializing?: boolean;
    broadcastKey?: string;
    refreshDataAfter?: boolean;
};

type RuntimeInputs = PanelRangeRuntimeRequests & {
    panelInfo: PanelInfo;
    rangeState: PanelRangeSourceState;
    isActive: boolean;
    onRangeStateChange: (rangeState: PanelRangeSourceState) => void;
    onBroadcastError?: (broadcastKey: string, message: string) => void;
};

function isSameRangeInput(
    left: RangeExpressionInput | undefined,
    right: RangeExpressionInput | undefined,
): boolean {
    return left?.start === right?.start && left?.end === right?.end;
}

class RequiredFullRangeError extends Error {
    constructor() {
        super(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        this.name = 'RequiredFullRangeError';
    }
}

async function fetchRequiredFullRange(
    seriesList: PanelSeriesDefinition[],
    onError: (message: string) => void,
): Promise<AxisRange> {
    const sSeriesErrors: string[] = [];
    let sFullRange: AxisRange | undefined;

    try {
        sFullRange = await seriesDataApi.fetchSeriesFullRange(
            seriesList,
            (message) => sSeriesErrors.push(message),
        );
    } catch (error) {
        if (sSeriesErrors.length === 0) {
            sSeriesErrors.push(
                error instanceof Error && error.message.trim()
                    ? error.message
                    : PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE,
            );
        }
    }

    for (const sMessage of new Set(sSeriesErrors)) {
        onError(sMessage);
    }

    if (!sFullRange) throw new RequiredFullRangeError();
    return sFullRange;
}

function resolveExplicitNumericFullRange(
    rangeInput: RangeExpressionInput,
): AxisRange | undefined {
    const sStart = parseNumericRangeExpression(rangeInput.start);
    const sEnd = parseNumericRangeExpression(rangeInput.end);

    if (sStart?.anchor !== 'value' || sEnd?.anchor !== 'value') {
        return undefined;
    }

    const sFullRange = {
        startTime: sStart.value,
        endTime: sEnd.value,
    };
    return isValidRange(sFullRange) ? sFullRange : undefined;
}

function getPanelRangeKind(panelInfo: PanelInfo): AxisKind | undefined {
    return getSeriesListAxisKind(panelInfo.query.tagSet);
}

function getBoardRangeInput(
    panelInfo: PanelInfo,
    boardRanges: PanelRangeRuntimeRequests['boardRanges'],
): RangeExpressionInput {
    const sRangeKind = getPanelRangeKind(panelInfo);
    return sRangeKind ? boardRanges[sRangeKind].input : EMPTY_RANGE_INPUT;
}

function getBroadcastVersions(
    boardRanges: PanelRangeRuntimeRequests['boardRanges'],
    globalRangeRequest: PanelRangeRuntimeRequests['globalRangeRequest'],
    commandVersions: PanelRangeRuntimeRequests['commandVersions'],
) {
    return {
        ...commandVersions,
        boardTimeRangeVersion: boardRanges.time.applyVersion,
        boardNumericRangeVersion: boardRanges.numeric.applyVersion,
        globalRangeVersion: globalRangeRequest.applyVersion,
    };
}

export function usePanelRangeRuntime({
    panelInfo,
    rangeState,
    boardRanges,
    globalRangeRequest,
    commandVersions,
    isActive,
    onRangeStateChange,
    onBroadcastError,
}: RuntimeInputs) {
    const [sChartAreaWidth, setChartAreaWidth] = useState<
        number | undefined
    >(undefined);
    const [sDataRefreshVersion, setDataRefreshVersion] = useState(0);
    const sChartAreaWidthRef = useRef(sChartAreaWidth);
    const sInputsRef = useRef<Omit<RuntimeInputs, 'commandVersions'>>({
        panelInfo,
        rangeState,
        boardRanges,
        globalRangeRequest,
        isActive,
        onRangeStateChange,
        onBroadcastError,
    });
    const sRequestRef = useRef<PanelRequestState>({ generation: 0 });
    const sInitializedRef = useRef(false);
    const sSeenVersionsRef = useRef(
        getBroadcastVersions(
            boardRanges,
            globalRangeRequest,
            commandVersions,
        ),
    );

    useLayoutEffect(() => {
        sInputsRef.current = {
            panelInfo,
            rangeState,
            boardRanges,
            globalRangeRequest,
            isActive,
            onRangeStateChange,
            onBroadcastError,
        };
    }, [
        boardRanges,
        globalRangeRequest,
        isActive,
        onBroadcastError,
        onRangeStateChange,
        panelInfo,
        rangeState,
    ]);

    useLayoutEffect(() => {
        if (
            sChartAreaWidth === undefined ||
            !isResolvedPanelRangeState(rangeState)
        ) {
            return;
        }

        const sNavigatorRange = resolveNavigatorDisplayRange(
            rangeState.range.panelRange,
            rangeState.range.navigatorRange,
            sChartAreaWidth,
        );
        if (isSameRange(sNavigatorRange, rangeState.range.navigatorRange)) {
            return;
        }

        onRangeStateChange({
            ...rangeState,
            range: {
                ...rangeState.range,
                navigatorRange: sNavigatorRange,
            },
        });
    }, [onRangeStateChange, rangeState, sChartAreaWidth]);

    useLayoutEffect(() => () => {
        sRequestRef.current = {
            generation: sRequestRef.current.generation + 1,
        };
    }, []);

    function isCurrentPanelRangeRequest(requestGeneration: number): boolean {
        return sRequestRef.current.generation === requestGeneration;
    }

    function reportRequestError(
        requestGeneration: number,
        message: string,
    ): void {
        if (!isCurrentPanelRangeRequest(requestGeneration)) return;

        const { broadcastKey } = sRequestRef.current;
        const sOnBroadcastError =
            sInputsRef.current.onBroadcastError;
        if (broadcastKey && sOnBroadcastError) {
            sOnBroadcastError(broadcastKey, message);
        } else {
            Toast.error(message);
        }
    }

    function fetchPanelFullRange(
        {
            panelInfo,
            requestGeneration,
        }: PanelRangeCommandContext,
    ): Promise<AxisRange> {
        return fetchRequiredFullRange(
            panelInfo.query.tagSet,
            (message) =>
                reportRequestError(requestGeneration, message),
        );
    }

    function requestDataRefresh(
        requestGeneration: number,
        hasUsableRange: boolean,
    ): void {
        if (!isCurrentPanelRangeRequest(requestGeneration)) return;

        if (hasUsableRange) sInitializedRef.current = true;
        setDataRefreshVersion((version) => version + 1);
    }

    function applyRangeToPanel(
        nextRangeState: ResolvedPanelRangeState,
        requestGeneration: number,
    ): void {
        if (!isCurrentPanelRangeRequest(requestGeneration)) return;

        const sCurrentRangeState = sInputsRef.current.rangeState;
        const sDidChange =
            !isResolvedPanelRangeState(sCurrentRangeState) ||
            !isSameRangeInput(
                nextRangeState.navigatorRangeInput,
                sCurrentRangeState.navigatorRangeInput,
            ) ||
            !isSameRange(
                nextRangeState.range.panelRange,
                sCurrentRangeState.range.panelRange,
            ) ||
            !isSameRange(
                nextRangeState.range.navigatorRange,
                sCurrentRangeState.range.navigatorRange,
            ) ||
            !isSameRange(
                nextRangeState.fullRange,
                sCurrentRangeState.fullRange,
            );

        sInitializedRef.current = true;
        if (sDidChange) {
            sInputsRef.current.onRangeStateChange(nextRangeState);
        }
    }

    async function runPanelRangeCommand(
        command: PanelRangeCommand,
        options: PanelRequestOptions = {},
    ): Promise<void> {
        const sRequestGeneration =
            sRequestRef.current.generation + 1;
        sRequestRef.current = {
            generation: sRequestGeneration,
            initializing: options.initializing,
            broadcastKey: options.broadcastKey,
        };
        const sInputs = sInputsRef.current;
        const sContext = {
            panelInfo: options.panelInfo ?? sInputs.panelInfo,
            rangeState: sInputs.rangeState,
            requestGeneration: sRequestGeneration,
        };
        let sHasUsableRange = isResolvedPanelRangeState(
            sContext.rangeState,
        );

        try {
            const sResult = command(sContext);
            const sNextRangeState = sResult instanceof Promise
                ? await sResult
                : sResult;
            if (sNextRangeState) {
                sHasUsableRange = true;
                applyRangeToPanel(
                    sNextRangeState,
                    sRequestGeneration,
                );
            }
        } catch (error) {
            if (error instanceof RequiredFullRangeError) return;

            const sMessage = getErrorMessageFromValue(error).trim();
            reportRequestError(
                sRequestGeneration,
                sMessage || RANGE_ACTION_ERROR_MESSAGE,
            );
        } finally {
            if (options.refreshDataAfter) {
                requestDataRefresh(
                    sRequestGeneration,
                    sHasUsableRange,
                );
            }
            if (
                options.initializing &&
                isCurrentPanelRangeRequest(sRequestGeneration)
            ) {
                sRequestRef.current.initializing = false;
            }
        }
    }

    function resolveConfiguredPanelRange(
        context: PanelRangeCommandContext,
        {
            applyInitialMainChartWindow,
            boardRange = getBoardRangeInput(
                context.panelInfo,
                sInputsRef.current.boardRanges,
            ),
            useLastViewedRange = false,
        }: ConfiguredPanelRangeOptions,
    ): ResolvedPanelRangeResult {
        const { panelInfo } = context;
        const sIsNumericAxis =
            getPanelRangeKind(panelInfo) === 'numeric';
        const sBoardRangeIsEmpty = isRangeExpressionEmpty(boardRange);
        const resolveRange = (
            fullRange: AxisRange,
        ): ResolvedPanelRangeState =>
            resolveConcretePanelRangeState({
                fullRange,
                rangeInput: panelInfo.time.rangeInput,
                isNumericAxis: sIsNumericAxis,
                lastViewedRange:
                    useLastViewedRange &&
                    panelInfo.time.useLastViewedRange
                        ? panelInfo.time.lastViewedRange
                        : undefined,
                boardRange,
                applyInitialMainChartWindow,
                chartAreaWidth: sChartAreaWidthRef.current,
            });
        const sExplicitFullRange =
            sIsNumericAxis && sBoardRangeIsEmpty
                ? resolveExplicitNumericFullRange(
                      panelInfo.time.rangeInput,
                  )
                : undefined;

        return sExplicitFullRange
            ? resolveRange(sExplicitFullRange)
            : fetchPanelFullRange(context).then(
                  resolveRange,
              );
    }

    async function resolveFullPanelRange(
        context: PanelRangeCommandContext,
        viewRange?: PanelRangeState,
    ): Promise<ResolvedPanelRangeState> {
        const sFullRange = await fetchPanelFullRange(context);
        return createResolvedPanelRangeState(
            viewRange ?? {
                panelRange: sFullRange,
                navigatorRange: sFullRange,
            },
            sFullRange,
        );
    }

    async function resolveRetainedPanelRange(
        context: PanelRangeCommandContext,
        currentRangeState: ResolvedPanelRangeState,
    ): Promise<ResolvedPanelRangeState> {
        const sFullRange = await fetchPanelFullRange(context);
        const sRangeInput = currentRangeState.navigatorRangeInput;
        return sRangeInput
            ? resolveNavigatorInputRangeState(
                  currentRangeState,
                  sFullRange,
                  sRangeInput,
                  getPanelRangeKind(context.panelInfo) === 'numeric',
                  sChartAreaWidthRef.current,
                  true,
              )
            : createResolvedPanelRangeState(
                  currentRangeState.range,
                  sFullRange,
              );
    }

    function resolveBoardOrFallback(
        context: PanelRangeCommandContext,
        resolveFallback: () => ResolvedPanelRangeResult,
    ): ResolvedPanelRangeResult {
        if (hasUserNavigatorRangeInput(context.rangeState)) {
            return resolveFallback();
        }

        const sBoardRange = getBoardRangeInput(
            context.panelInfo,
            sInputsRef.current.boardRanges,
        );
        if (isRangeExpressionEmpty(sBoardRange)) return resolveFallback();

        const sCurrentRangeState = context.rangeState;
        return isResolvedPanelRangeState(sCurrentRangeState)
            ? fetchPanelFullRange(context).then((fullRange) =>
                  resolveNavigatorInputRangeState(
                      sCurrentRangeState,
                      fullRange,
                      sBoardRange,
                      getPanelRangeKind(context.panelInfo) === 'numeric',
                      sChartAreaWidthRef.current,
                  ),
              )
            : resolveConfiguredPanelRange(context, {
                  applyInitialMainChartWindow: true,
                  boardRange: sBoardRange,
              });
    }

    function resolveRangeForDataRefresh(
        context: PanelRangeCommandContext,
    ): ResolvedPanelRangeResult | void {
        if (!isResolvedPanelRangeState(context.rangeState)) {
            return resolveConfiguredPanelRange(
                context,
                { applyInitialMainChartWindow: false },
            );
        }

        requestDataRefresh(context.requestGeneration, true);
    }

    function resolveRefreshedPanelRange(
        context: PanelRangeCommandContext,
    ): ResolvedPanelRangeResult {
        return resolveConfiguredPanelRange(
            context,
            { applyInitialMainChartWindow: true },
        );
    }

    function resolveBoardOrFullRange(
        context: PanelRangeCommandContext,
        viewRange?: PanelRangeState,
    ): ResolvedPanelRangeResult {
        return resolveBoardOrFallback(
            context,
            () => resolveFullPanelRange(context, viewRange),
        );
    }

    function resolveBoardRange(
        context: PanelRangeCommandContext,
        boardRangeToApply: RangeExpressionInput,
    ): ResolvedPanelRangeResult | void {
        if (hasUserNavigatorRangeInput(context.rangeState)) return;

        if (isRangeExpressionEmpty(boardRangeToApply)) {
            return isResolvedPanelRangeState(context.rangeState)
                ? undefined
                : initializePanelRange(context);
        }

        const { panelInfo, rangeState } = context;
        const sIsNumericAxis =
            getPanelRangeKind(panelInfo) === 'numeric';

        if (!isResolvedPanelRangeState(rangeState)) {
            return resolveConfiguredPanelRange(context, {
                applyInitialMainChartWindow: true,
                boardRange: boardRangeToApply,
            });
        }

        const resolveRange = (fullRange: AxisRange) =>
            resolveNavigatorInputRangeState(
                rangeState,
                fullRange,
                boardRangeToApply,
                sIsNumericAxis,
                sChartAreaWidthRef.current,
            );

        return sIsNumericAxis
            ? fetchPanelFullRange(context).then(resolveRange)
            : resolveRange(rangeState.fullRange);
    }

    async function resolveEditorMainRange(
        context: PanelRangeCommandContext,
        currentRangeState: ResolvedPanelRangeState,
    ): Promise<ResolvedPanelRangeState> {
        const sIsNumericAxis =
            getPanelRangeKind(context.panelInfo) === 'numeric';
        const sRangeInput = context.panelInfo.time.rangeInput;
        const sFullRange = await fetchPanelFullRange(context);
        const sResolvedRange = resolveEnteredMainRangeState(
            currentRangeState,
            sFullRange,
            sRangeInput,
            sIsNumericAxis,
        );
        if (!sResolvedRange) {
            return resolveConcretePanelRangeState({
                fullRange: sFullRange,
                rangeInput: sRangeInput,
                isNumericAxis: sIsNumericAxis,
                lastViewedRange: undefined,
                boardRange: getBoardRangeInput(
                    context.panelInfo,
                    sInputsRef.current.boardRanges,
                ),
                applyInitialMainChartWindow: false,
                chartAreaWidth: sChartAreaWidthRef.current,
            });
        }
        return sResolvedRange;
    }

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ): void {
        const sRangeKindChanged =
            getPanelRangeKind(sInputsRef.current.panelInfo) !==
            getPanelRangeKind(nextPanelInfo);
        void runPanelRangeCommand((context) => {
            const sCurrentRangeState = context.rangeState;
            if (
                preserveCurrentVisibleRange &&
                isResolvedPanelRangeState(sCurrentRangeState)
            ) {
                requestDataRefresh(context.requestGeneration, true);
                return resolveBoardOrFallback(
                    context,
                    () => resolveRetainedPanelRange(context, sCurrentRangeState),
                );
            }

            requestDataRefresh(context.requestGeneration, false);
            if (
                !sRangeKindChanged &&
                isResolvedPanelRangeState(sCurrentRangeState)
            ) {
                return resolveEditorMainRange(
                    context,
                    sCurrentRangeState,
                );
            }

            return resolveConfiguredPanelRange(context, {
                applyInitialMainChartWindow: false,
                useLastViewedRange: true,
            });
        }, { panelInfo: nextPanelInfo });
    }

    function initializePanelRange(
        context: PanelRangeCommandContext,
    ): ResolvedPanelRangeResult {
        const { panelInfo } = context;
        const sGlobalRange = sInputsRef.current.globalRangeRequest.range;
        return resolveBoardOrFallback(
            context,
            () =>
                isResolvedPanelRangeState(context.rangeState)
                    ? resolveRetainedPanelRange(context, context.rangeState)
                    : !panelInfo.time.useLastViewedRange &&
                        sGlobalRange &&
                        getPanelRangeKind(panelInfo) === 'time'
                      ? resolveFullPanelRange(context, sGlobalRange)
                      : resolveConfiguredPanelRange(context, {
                            applyInitialMainChartWindow: true,
                            useLastViewedRange: true,
                        }),
        );
    }

    function applyPanelRangeCandidate(
        createCandidate: (range: PanelRangeState) => PanelRangeCandidate,
        {
            navigatorRangeInput,
            preservesNavigatorInput = false,
            replacesNavigatorInput = false,
        }: {
            navigatorRangeInput?: RangeExpressionInput;
            preservesNavigatorInput?: boolean;
            replacesNavigatorInput?: boolean;
        } = {},
    ): void {
        const sCurrentRangeState = sInputsRef.current.rangeState;
        if (!isResolvedPanelRangeState(sCurrentRangeState)) return;

        const sResolvedRange = resolvePanelRangeCandidate(
            sCurrentRangeState.range,
            createCandidate(sCurrentRangeState.range),
        );
        const sNavigatorChanged = !isSameRange(
            sResolvedRange.navigatorRange,
            sCurrentRangeState.range.navigatorRange,
        );
        const sNextRangeState = {
            ...sCurrentRangeState,
            range: sResolvedRange,
            navigatorRangeInput: replacesNavigatorInput
                ? navigatorRangeInput && { ...navigatorRangeInput }
                : preservesNavigatorInput
                  ? sCurrentRangeState.navigatorRangeInput
                : sNavigatorChanged
                  ? undefined
                  : sCurrentRangeState.navigatorRangeInput,
        };
        void runPanelRangeCommand(() => sNextRangeState);
    }

    function applyPanelRangeUpdate(update: PanelRangeUpdate): void {
        applyPanelRangeCandidate(
            (currentRange) =>
                update.type === 'navigator-range-entered'
                    ? {
                          authority: 'navigator',
                          requestedRange:
                              resolveRequestedNavigatorRangeState(
                                  currentRange,
                                  update.range,
                                  sChartAreaWidthRef.current,
                              ),
                      }
                    : createPanelRangeUpdateCandidate(
                          currentRange,
                          update,
                      ),
            {
                preservesNavigatorInput:
                    update.type === 'navigator-selection-dragged',
                replacesNavigatorInput:
                    update.type === 'navigator-range-entered',
                navigatorRangeInput:
                    update.type === 'navigator-range-entered'
                        ? update.rangeInput
                        : undefined,
            },
        );
    }

    const syncPanelInitialization = useStableCallback(() => {
        if (
            !sInputsRef.current.isActive ||
            sChartAreaWidthRef.current === undefined
        ) {
            sRequestRef.current = {
                generation: sRequestRef.current.generation + 1,
            };
            sInitializedRef.current = false;
            return;
        }

        if (
            sInitializedRef.current ||
            sRequestRef.current.initializing
        ) {
            return;
        }

        void runPanelRangeCommand(initializePanelRange, {
            initializing: true,
        });
    });
    const onChartAreaWidthChange = useStableCallback(
        (width: number | undefined) => {
            sChartAreaWidthRef.current = width;
            setChartAreaWidth(width);
            syncPanelInitialization();
        },
    );
    const onRangeButtonAction = useStableCallback(
        (action: PanelRangeButtonAction) =>
            applyPanelRangeCandidate((currentRange) => {
                const sUsesVisibleNavigator =
                    action === 'shift-navigator-left' ||
                    action === 'shift-navigator-right';
                const sButtonRange = sUsesVisibleNavigator
                    ? {
                          ...currentRange,
                          navigatorRange: resolveNavigatorDisplayRange(
                              currentRange.panelRange,
                              currentRange.navigatorRange,
                              sChartAreaWidthRef.current,
                          ),
                      }
                    : currentRange;

                return createPanelRangeButtonCandidate(
                    sButtonRange,
                    action,
                );
            }),
    );
    const onRangeUpdate = useStableCallback(applyPanelRangeUpdate);
    const onRefreshData = useStableCallback(() => {
        const sCurrentRangeState = sInputsRef.current.rangeState;
        if (isResolvedPanelRangeState(sCurrentRangeState)) {
            requestDataRefresh(sRequestRef.current.generation, true);
        } else {
            void runPanelRangeCommand(resolveRangeForDataRefresh);
        }
    });
    const onRefreshRange = useStableCallback(() => {
        void runPanelRangeCommand(resolveRefreshedPanelRange);
    });
    const onExpandFullRange = useStableCallback(() => {
        void runPanelRangeCommand(resolveBoardOrFullRange);
    });
    const onReloadAfterEditorSave = useStableCallback(
        reloadAfterEditorSave,
    );

    useLayoutEffect(() => {
        syncPanelInitialization();
    }, [isActive, panelInfo, syncPanelInitialization]);

    const runBroadcastAction = useStableCallback(
        (
            broadcastKey: string,
            command: PanelRangeCommand,
            refreshDataAfter: boolean = false,
        ): void => {
            void runPanelRangeCommand(command, {
                broadcastKey,
                refreshDataAfter,
            });
        },
    );

    const syncBroadcastRequests = useStableCallback(() => {
        const sPrevious = sSeenVersionsRef.current;
        const sNext = getBroadcastVersions(
            boardRanges,
            globalRangeRequest,
            commandVersions,
        );
        sSeenVersionsRef.current = sNext;
        const sRangeKind = getPanelRangeKind(panelInfo);
        const sRefreshDataChanged =
            sPrevious.refreshDataVersion !== sNext.refreshDataVersion;
        let sRangeBroadcast:
            | { key: string; command: PanelRangeCommand }
            | undefined;

        if (sRangeKind) {
            const sVersionKey = sRangeKind === 'time'
                ? 'boardTimeRangeVersion'
                : 'boardNumericRangeVersion';
            if (sPrevious[sVersionKey] !== sNext[sVersionKey]) {
                const sBoardRange = boardRanges[sRangeKind];
                sRangeBroadcast = {
                    key: `board-${sRangeKind}:${sBoardRange.applyVersion}`,
                    command: (context) =>
                        resolveBoardRange(
                            context,
                            sBoardRange.input,
                        ),
                };
            }
        }

        if (
            sRangeKind === 'time' &&
            globalRangeRequest.range &&
            sPrevious.globalRangeVersion !== sNext.globalRangeVersion
        ) {
            sRangeBroadcast = {
                key: `global:${globalRangeRequest.applyVersion}`,
                command: (context) =>
                    resolveBoardOrFullRange(
                        context,
                        globalRangeRequest.range,
                    ),
            };
        }
        if (
            sPrevious.refreshRangeVersion !== sNext.refreshRangeVersion
        ) {
            sRangeBroadcast = {
                key: `refresh-range:${sNext.refreshRangeVersion}`,
                command: resolveRefreshedPanelRange,
            };
        }
        if (
            sPrevious.expandFullRangeVersion !==
            sNext.expandFullRangeVersion
        ) {
            sRangeBroadcast = {
                key: `expand-full-range:${sNext.expandFullRangeVersion}`,
                command: resolveBoardOrFullRange,
            };
        }

        if (sRangeBroadcast) {
            runBroadcastAction(
                sRangeBroadcast.key,
                sRangeBroadcast.command,
                sRefreshDataChanged,
            );
        } else if (sRefreshDataChanged) {
            onRefreshData();
        }
    });

    useEffect(() => {
        syncBroadcastRequests();
    }, [
        boardRanges,
        commandVersions,
        globalRangeRequest,
        panelInfo,
        syncBroadcastRequests,
    ]);

    const actions = useMemo(
        () => ({
            onChartAreaWidthChange,
            onRangeButtonAction,
            onRangeUpdate,
            onRefreshData,
            onRefreshRange,
            onExpandFullRange,
            onReloadAfterEditorSave,
        }),
        [
            onChartAreaWidthChange,
            onExpandFullRange,
            onRangeButtonAction,
            onRangeUpdate,
            onRefreshData,
            onRefreshRange,
            onReloadAfterEditorSave,
        ],
    );

    return {
        chartAreaWidth: sChartAreaWidth,
        dataRefreshVersion: sDataRefreshVersion,
        actions,
    };
}

function hasUserNavigatorRangeInput(
    rangeState: PanelRangeSourceState,
): boolean {
    return (
        isResolvedPanelRangeState(rangeState) &&
        rangeState.navigatorRangeInput !== undefined &&
        !isRangeExpressionEmpty(rangeState.navigatorRangeInput)
    );
}
