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
import { parseRangeInputValue } from '../format/inputFormat';
import type { PanelInfo } from './panelModel';
import {
    resolveRangeExpression,
    resolveRangeInput,
} from '../range/rangeInput';
import {
    enforceChartAreaWidth,
    resolveButtonPress,
    resolveRangeChange,
    type RangeAuthority,
    type RangeButtonAction,
} from '../range/rangeResolver';
import {
    getSeriesListAxisKind,
    type PanelSeriesDefinition,
} from '../seriesModel';
import {
    createRangeFromCenterAndWidth,
    getRangeCenter,
    getRangeWidth,
    isSameRange,
} from '../range/rangeArithmetic';
import {
    INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO,
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
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
        range: RangeState | undefined;
        applyVersion: number;
    };
    commandVersions: {
        refreshDataVersion: number;
        refreshRangeVersion: number;
        expandFullRangeVersion: number;
    };
};

type RangeTaskContext = {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    requestGeneration: number;
};

type RangeTaskResult =
    | ResolvedRangeState
    | Promise<ResolvedRangeState>;

type RangeTask = (
    context: RangeTaskContext,
) => RangeTaskResult | void;

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
    rangeState: ResolvedRangeState | undefined;
    isActive: boolean;
    onRangeStateChange: (rangeState: ResolvedRangeState) => void;
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

function getPanelRangeKind(panelInfo: PanelInfo): AxisKind | undefined {
    return getSeriesListAxisKind(panelInfo.query.tagSet);
}

function getPanelAxisKind(panelInfo: PanelInfo): AxisKind {
    return getPanelRangeKind(panelInfo) ?? 'time';
}

function getBoardRangeInput(
    panelInfo: PanelInfo,
    boardRanges: PanelRangeRuntimeRequests['boardRanges'],
): RangeExpressionInput {
    const sRangeKind = getPanelRangeKind(panelInfo);
    return sRangeKind ? boardRanges[sRangeKind].input : EMPTY_RANGE_INPUT;
}

function resolveExpressionRangeInput(
    input: RangeExpressionInput,
    axisKind: AxisKind,
    fullRange: AxisRange,
    currentRange: AxisRange,
): AxisRange | undefined {
    return resolveRangeInput(
        resolveRangeExpression(
            input.start,
            axisKind,
            fullRange,
            currentRange.startTime,
        ),
        resolveRangeExpression(
            input.end,
            axisKind,
            fullRange,
            currentRange.endTime,
        ),
    );
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

function createInitialRange(navigatorRange: AxisRange): RangeState {
    return {
        panelRange: createRangeFromCenterAndWidth(
            getRangeCenter(navigatorRange),
            getRangeWidth(navigatorRange) *
                INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO,
        ),
        navigatorRange,
    };
}

function createNextRangeState(
    current: ResolvedRangeState,
    range: RangeState,
    authority: RangeAuthority,
    navigatorRangeInput?: RangeExpressionInput,
): ResolvedRangeState {
    return {
        ...current,
        range,
        navigatorRangeInput: authority === 'navigator'
            ? navigatorRangeInput && { ...navigatorRangeInput }
            : authority === 'exact' ||
                isSameRange(
                    range.navigatorRange,
                    current.range.navigatorRange,
                )
              ? current.navigatorRangeInput
              : undefined,
    };
}

export function usePanelRangeRuntime(inputs: RuntimeInputs) {
    const {
        panelInfo,
        rangeState,
        boardRanges,
        globalRangeRequest,
        commandVersions,
        isActive,
        onRangeStateChange,
    } = inputs;
    const [sChartAreaWidth, setChartAreaWidth] = useState<
        number | undefined
    >(undefined);
    const [sDataRefreshVersion, setDataRefreshVersion] = useState(0);
    const sChartAreaWidthRef = useRef(sChartAreaWidth);
    const sInputsRef = useRef(inputs);
    const sRequestRef = useRef<PanelRequestState>({ generation: 0 });
    const sInitializedRef = useRef(false);
    const sSeenVersionsRef = useRef(
        getBroadcastVersions(
            boardRanges,
            globalRangeRequest,
            commandVersions,
        ),
    );

    function buildResolvedRangeState(
        current: RangeState,
        requested: RangeState,
        authority: RangeAuthority,
        fullRange: AxisRange,
        fixedRange: 'main' | 'navigator' =
            authority === 'navigator' ? 'navigator' : 'main',
    ): ResolvedRangeState {
        const sCurrentState: ResolvedRangeState = {
            range: current,
            fullRange,
            navigatorRangeInput: undefined,
        };
        const sResolvedRange = resolveRangeChange(
            current,
            requested,
            authority,
        );
        const sChartAreaWidth = sChartAreaWidthRef.current;
        const sRange = sChartAreaWidth === undefined
            ? sResolvedRange
            : enforceChartAreaWidth(
                  sResolvedRange,
                  sChartAreaWidth,
                  fixedRange,
              );
        return createNextRangeState(sCurrentState, sRange, authority);
    }

    useLayoutEffect(() => {
        sInputsRef.current = inputs;
    }, [inputs]);

    useLayoutEffect(() => {
        if (
            sChartAreaWidth === undefined ||
            !rangeState
        ) {
            return;
        }

        const sRange = enforceChartAreaWidth(
            rangeState.range,
            sChartAreaWidth,
            'main',
        );
        if (isSameRange(sRange.navigatorRange, rangeState.range.navigatorRange)) {
            return;
        }

        onRangeStateChange({
            ...rangeState,
            range: sRange,
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
        }: RangeTaskContext,
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
        nextRangeState: ResolvedRangeState,
        requestGeneration: number,
    ): void {
        if (!isCurrentPanelRangeRequest(requestGeneration)) return;

        const sCurrentRangeState = sInputsRef.current.rangeState;
        const sDidChange =
            !sCurrentRangeState ||
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

    async function runRangeTask(
        task: RangeTask,
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
        let sHasUsableRange = sContext.rangeState !== undefined;

        try {
            const sResult = task(sContext);
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

    function buildConfiguredRangeState(
        panelInfo: PanelInfo,
        fullRange: AxisRange,
        {
            applyInitialMainChartWindow,
            boardRange = getBoardRangeInput(
                panelInfo,
                sInputsRef.current.boardRanges,
            ),
            useLastViewedRange = false,
        }: ConfiguredPanelRangeOptions,
    ): ResolvedRangeState {
        const sAxisKind = getPanelAxisKind(panelInfo);
        const sFullRangeState = {
            panelRange: fullRange,
            navigatorRange: fullRange,
        };
        const buildState = (
            requested: RangeState,
            authority: RangeAuthority = 'exact',
            fixedRange: 'main' | 'navigator' = 'main',
        ) => buildResolvedRangeState(
            sFullRangeState,
            requested,
            authority,
            fullRange,
            fixedRange,
        );
        const sBoardRange = isRangeExpressionEmpty(boardRange)
            ? undefined
            : resolveExpressionRangeInput(
                  boardRange,
                  sAxisKind,
                  fullRange,
                  fullRange,
              );
        if (sBoardRange) {
            return buildState(
                applyInitialMainChartWindow
                    ? createInitialRange(sBoardRange)
                    : {
                          panelRange: sBoardRange,
                          navigatorRange: sBoardRange,
                      },
                applyInitialMainChartWindow ? 'navigator' : 'exact',
                'navigator',
            );
        }

        const sLastViewedRange =
            useLastViewedRange && panelInfo.time.useLastViewedRange
                ? panelInfo.time.lastViewedRange
                : undefined;
        if (sLastViewedRange) {
            return buildState(sLastViewedRange);
        }

        const sRangeInput = panelInfo.time.rangeInput;
        const sPanelRange = isRangeExpressionEmpty(sRangeInput)
            ? undefined
            : resolveExpressionRangeInput(
                  sRangeInput,
                  sAxisKind,
                  fullRange,
                  fullRange,
              );
        return buildState(
            !sPanelRange &&
                isRangeExpressionEmpty(sRangeInput) &&
                applyInitialMainChartWindow
                ? createInitialRange(fullRange)
                : {
                      panelRange: sPanelRange ?? fullRange,
                      navigatorRange: fullRange,
                  },
            !sPanelRange &&
                isRangeExpressionEmpty(sRangeInput) &&
                applyInitialMainChartWindow
                ? 'navigator'
                : 'exact',
        );
    }

    function loadConfiguredRangeState(
        context: RangeTaskContext,
        options: ConfiguredPanelRangeOptions,
    ): RangeTaskResult {
        const sBoardRange =
            options.boardRange ??
            getBoardRangeInput(
                context.panelInfo,
                sInputsRef.current.boardRanges,
            );
        const buildRangeState = (fullRange: AxisRange) =>
            buildConfiguredRangeState(context.panelInfo, fullRange, {
                ...options,
                boardRange: sBoardRange,
            });
        const sPanelRangeInput = context.panelInfo.time.rangeInput;
        const sExplicitFullRange =
            getPanelRangeKind(context.panelInfo) === 'numeric' &&
            isRangeExpressionEmpty(sBoardRange)
                ? resolveRangeInput(
                      parseRangeInputValue(sPanelRangeInput.start, 'numeric'),
                      parseRangeInputValue(sPanelRangeInput.end, 'numeric'),
                  )
                : undefined;

        return sExplicitFullRange
            ? buildRangeState(sExplicitFullRange)
            : fetchPanelFullRange(context).then(buildRangeState);
    }

    async function loadFullRangeState(
        context: RangeTaskContext,
        viewRange?: RangeState,
    ): Promise<ResolvedRangeState> {
        const sFullRange = await fetchPanelFullRange(context);
        const sFullRangeState = {
            panelRange: sFullRange,
            navigatorRange: sFullRange,
        };
        return buildResolvedRangeState(
            sFullRangeState,
            viewRange ?? sFullRangeState,
            'exact',
            sFullRange,
        );
    }

    function applyNavigatorInput(
        currentRangeState: ResolvedRangeState,
        fullRange: AxisRange,
        input: RangeExpressionInput,
        axisKind: AxisKind,
        retainInput = false,
    ): ResolvedRangeState {
        const sNavigatorRange = resolveExpressionRangeInput(
            input,
            axisKind,
            fullRange,
            currentRangeState.range.navigatorRange,
        );
        if (!sNavigatorRange) return currentRangeState;

        const sCurrentState = { ...currentRangeState, fullRange };
        const sResolvedRange = resolveRangeChange(
            currentRangeState.range,
            {
                ...currentRangeState.range,
                navigatorRange: sNavigatorRange,
            },
            'navigator',
        );
        const sChartAreaWidth = sChartAreaWidthRef.current;
        const sRange = sChartAreaWidth === undefined
            ? sResolvedRange
            : enforceChartAreaWidth(
                  sResolvedRange,
                  sChartAreaWidth,
                  'navigator',
              );
        return createNextRangeState(
            sCurrentState,
            sRange,
            'navigator',
            retainInput ? input : undefined,
        );
    }

    async function reloadRetainedRangeState(
        context: RangeTaskContext,
        currentRangeState: ResolvedRangeState,
    ): Promise<ResolvedRangeState> {
        const sFullRange = await fetchPanelFullRange(context);
        const sRangeInput = currentRangeState.navigatorRangeInput;
        return sRangeInput
            ? applyNavigatorInput(
                  currentRangeState,
                  sFullRange,
                  sRangeInput,
                  getPanelAxisKind(context.panelInfo),
                  true,
              )
            : buildResolvedRangeState(
                  currentRangeState.range,
                  currentRangeState.range,
                  'exact',
                  sFullRange,
              );
    }

    function loadBoardOrFallback(
        context: RangeTaskContext,
        loadFallback: () => RangeTaskResult,
    ): RangeTaskResult {
        if (hasUserNavigatorRangeInput(context.rangeState)) {
            return loadFallback();
        }

        const sBoardRange = getBoardRangeInput(
            context.panelInfo,
            sInputsRef.current.boardRanges,
        );
        if (isRangeExpressionEmpty(sBoardRange)) return loadFallback();

        const sCurrentRangeState = context.rangeState;
        return sCurrentRangeState
            ? fetchPanelFullRange(context).then((fullRange) =>
                  applyNavigatorInput(
                      sCurrentRangeState,
                      fullRange,
                      sBoardRange,
                      getPanelAxisKind(context.panelInfo),
                  ),
              )
            : loadConfiguredRangeState(context, {
                  applyInitialMainChartWindow: true,
                  boardRange: sBoardRange,
              });
    }

    function ensureRangeForDataRefresh(
        context: RangeTaskContext,
    ): RangeTaskResult | void {
        if (!context.rangeState) {
            return loadConfiguredRangeState(context, {
                applyInitialMainChartWindow: false,
            });
        }

        requestDataRefresh(context.requestGeneration, true);
    }

    function reloadConfiguredRangeState(
        context: RangeTaskContext,
    ): RangeTaskResult {
        return loadConfiguredRangeState(context, {
            applyInitialMainChartWindow: true,
        });
    }

    function loadBoardOrFullRange(
        context: RangeTaskContext,
        viewRange?: RangeState,
    ): RangeTaskResult {
        return loadBoardOrFallback(
            context,
            () => loadFullRangeState(context, viewRange),
        );
    }

    function loadBoardRangeState(
        context: RangeTaskContext,
        boardRangeToApply: RangeExpressionInput,
    ): RangeTaskResult | void {
        if (hasUserNavigatorRangeInput(context.rangeState)) return;

        if (isRangeExpressionEmpty(boardRangeToApply)) {
            return context.rangeState
                ? undefined
                : loadInitialRangeState(context);
        }

        const { rangeState } = context;
        if (!rangeState) {
            return loadConfiguredRangeState(context, {
                applyInitialMainChartWindow: true,
                boardRange: boardRangeToApply,
            });
        }

        const applyBoardRange = (fullRange: AxisRange) =>
            applyNavigatorInput(
                rangeState,
                fullRange,
                boardRangeToApply,
                getPanelAxisKind(context.panelInfo),
            );
        return getPanelRangeKind(context.panelInfo) === 'numeric'
            ? fetchPanelFullRange(context).then(applyBoardRange)
            : applyBoardRange(rangeState.fullRange);
    }

    async function reloadEditorRangeState(
        context: RangeTaskContext,
        currentRangeState: ResolvedRangeState,
    ): Promise<ResolvedRangeState> {
        const sFullRange = await fetchPanelFullRange(context);
        const sPanelRange = resolveExpressionRangeInput(
            context.panelInfo.time.rangeInput,
            getPanelAxisKind(context.panelInfo),
            sFullRange,
            currentRangeState.range.panelRange,
        );
        if (!sPanelRange) {
            return buildConfiguredRangeState(
                context.panelInfo,
                sFullRange,
                { applyInitialMainChartWindow: false },
            );
        }

        const sCurrentState = {
            ...currentRangeState,
            fullRange: sFullRange,
        };
        const sResolvedRange = resolveRangeChange(
            currentRangeState.range,
            {
                ...currentRangeState.range,
                panelRange: sPanelRange,
            },
            'main',
        );
        const sChartAreaWidth = sChartAreaWidthRef.current;
        const sRange = sChartAreaWidth === undefined
            ? sResolvedRange
            : enforceChartAreaWidth(sResolvedRange, sChartAreaWidth, 'main');
        return createNextRangeState(
            sCurrentState,
            sRange,
            'main',
        );
    }

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ): void {
        const sRangeKindChanged =
            getPanelRangeKind(sInputsRef.current.panelInfo) !==
            getPanelRangeKind(nextPanelInfo);
        void runRangeTask((context) => {
            const sCurrentRangeState = context.rangeState;
            if (
                preserveCurrentVisibleRange &&
                sCurrentRangeState
            ) {
                requestDataRefresh(context.requestGeneration, true);
                return loadBoardOrFallback(
                    context,
                    () => reloadRetainedRangeState(context, sCurrentRangeState),
                );
            }

            requestDataRefresh(context.requestGeneration, false);
            if (
                !sRangeKindChanged &&
                sCurrentRangeState
            ) {
                return reloadEditorRangeState(
                    context,
                    sCurrentRangeState,
                );
            }

            return loadConfiguredRangeState(context, {
                applyInitialMainChartWindow: false,
                useLastViewedRange: true,
            });
        }, { panelInfo: nextPanelInfo });
    }

    function loadInitialRangeState(
        context: RangeTaskContext,
    ): RangeTaskResult {
        const { panelInfo } = context;
        const sGlobalRange = sInputsRef.current.globalRangeRequest.range;
        return loadBoardOrFallback(
            context,
            () =>
                context.rangeState
                    ? reloadRetainedRangeState(context, context.rangeState)
                    : !panelInfo.time.useLastViewedRange &&
                        sGlobalRange &&
                        getPanelRangeKind(panelInfo) === 'time'
                      ? loadFullRangeState(context, sGlobalRange)
                      : loadConfiguredRangeState(context, {
                            applyInitialMainChartWindow: true,
                            useLastViewedRange: true,
                        }),
        );
    }

    function commitRange(
        resolve: (current: RangeState) => RangeState,
        authority: RangeAuthority,
        navigatorRangeInput?: RangeExpressionInput,
    ): void {
        const sCurrentRangeState = sInputsRef.current.rangeState;
        if (!sCurrentRangeState) return;

        void runRangeTask(() => {
            const sResolvedRange = resolve(sCurrentRangeState.range);
            const sChartAreaWidth = sChartAreaWidthRef.current;
            const sRange = sChartAreaWidth === undefined
                ? sResolvedRange
                : enforceChartAreaWidth(
                      sResolvedRange,
                      sChartAreaWidth,
                      authority === 'navigator' ? 'navigator' : 'main',
                  );
            return createNextRangeState(
                sCurrentRangeState,
                sRange,
                authority,
                navigatorRangeInput,
            );
        });
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

        void runRangeTask(loadInitialRangeState, {
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
        (action: RangeButtonAction) =>
            commitRange(
                (current) => resolveButtonPress(current, action),
                'main',
            ),
    );
    const onMainRangeChange = useStableCallback(
        (range: AxisRange) =>
            commitRange(
                (current) =>
                    resolveRangeChange(
                        current,
                        { ...current, panelRange: range },
                        'main',
                    ),
                'main',
            ),
    );
    const onNavigatorRangeChange = useStableCallback(
        (range: AxisRange, input?: RangeExpressionInput) =>
            commitRange(
                (current) =>
                    resolveRangeChange(
                        current,
                        { ...current, navigatorRange: range },
                        'navigator',
                    ),
                'navigator',
                input,
            ),
    );
    const onRangeReplace = useStableCallback(
        (range: RangeState) =>
            commitRange(
                (current) => resolveRangeChange(current, range, 'exact'),
                'exact',
            ),
    );
    const onRefreshData = useStableCallback(() => {
        const sCurrentRangeState = sInputsRef.current.rangeState;
        if (sCurrentRangeState) {
            requestDataRefresh(sRequestRef.current.generation, true);
        } else {
            void runRangeTask(ensureRangeForDataRefresh);
        }
    });
    const onRefreshRange = useStableCallback(() => {
        void runRangeTask(reloadConfiguredRangeState);
    });
    const onExpandFullRange = useStableCallback(() => {
        void runRangeTask(loadBoardOrFullRange);
    });
    const onReloadAfterEditorSave = useStableCallback(
        reloadAfterEditorSave,
    );

    useLayoutEffect(() => {
        syncPanelInitialization();
    }, [isActive, panelInfo, syncPanelInitialization]);

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
        let sBroadcastTask:
            | { key: string; task: RangeTask }
            | undefined;

        if (sRangeKind) {
            const sVersionKey = sRangeKind === 'time'
                ? 'boardTimeRangeVersion'
                : 'boardNumericRangeVersion';
            if (sPrevious[sVersionKey] !== sNext[sVersionKey]) {
                const sBoardRange = boardRanges[sRangeKind];
                sBroadcastTask = {
                    key: `board-${sRangeKind}:${sBoardRange.applyVersion}`,
                    task: (context) =>
                        loadBoardRangeState(
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
            sBroadcastTask = {
                key: `global:${globalRangeRequest.applyVersion}`,
                task: (context) =>
                    loadBoardOrFullRange(
                        context,
                        globalRangeRequest.range,
                    ),
            };
        }
        if (
            sPrevious.refreshRangeVersion !== sNext.refreshRangeVersion
        ) {
            sBroadcastTask = {
                key: `refresh-range:${sNext.refreshRangeVersion}`,
                task: reloadConfiguredRangeState,
            };
        }
        if (
            sPrevious.expandFullRangeVersion !==
            sNext.expandFullRangeVersion
        ) {
            sBroadcastTask = {
                key: `expand-full-range:${sNext.expandFullRangeVersion}`,
                task: loadBoardOrFullRange,
            };
        }

        if (sBroadcastTask) {
            void runRangeTask(sBroadcastTask.task, {
                broadcastKey: sBroadcastTask.key,
                refreshDataAfter: sRefreshDataChanged,
            });
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
            onMainRangeChange,
            onNavigatorRangeChange,
            onRangeReplace,
            onRefreshData,
            onRefreshRange,
            onExpandFullRange,
            onReloadAfterEditorSave,
        }),
        [
            onChartAreaWidthChange,
            onExpandFullRange,
            onMainRangeChange,
            onNavigatorRangeChange,
            onRangeButtonAction,
            onRangeReplace,
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
    rangeState: ResolvedRangeState | undefined,
): boolean {
    return (
        rangeState !== undefined &&
        rangeState.navigatorRangeInput !== undefined &&
        !isRangeExpressionEmpty(rangeState.navigatorRangeInput)
    );
}
