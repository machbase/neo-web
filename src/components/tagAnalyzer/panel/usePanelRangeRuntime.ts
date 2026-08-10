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
import { resolveRangeInput } from '../range/rangeInput';
import {
    enforceChartAreaWidth,
    resolveButtonPress,
    resolveRangeChange,
    type RangeChange,
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
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import { useStableCallback } from '../hooks/useStableCallback';

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO = 0.25;
const RANGE_ACTION_ERROR_MESSAGE = 'Failed to update panel range.';
const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

type RangeChangeType = RangeChange['type'];

export type PanelRangeRuntimeRequests = {
    boardRanges: Record<
        AxisKind,
        { input: RangeExpressionInput; applyVersion: number }
    >;
    globalRangeRequest: {
        axisKind: AxisKind | undefined;
        ranges: Partial<Record<AxisKind, RangeState>>;
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
        mainRange: createRangeFromCenterAndWidth(
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
    changeType: RangeChangeType,
    navigatorRangeInput?: RangeExpressionInput,
): ResolvedRangeState {
    return {
        ...current,
        range,
        navigatorRangeInput: changeType === 'navigator'
            ? { ...(navigatorRangeInput ?? EMPTY_RANGE_INPUT) }
            : changeType === 'replace' ||
                isSameRange(
                    range.navigatorRange,
                    current.range.navigatorRange,
                )
              ? current.navigatorRangeInput
              : { ...EMPTY_RANGE_INPUT },
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
        change: RangeChange,
        fullRange: AxisRange,
        fixedRange: 'main' | 'navigator' =
            change.type === 'navigator' ? 'navigator' : 'main',
    ): ResolvedRangeState {
        const sCurrentState: ResolvedRangeState = {
            range: current,
            fullRange,
            navigatorRangeInput: { ...EMPTY_RANGE_INPUT },
        };
        const sResolvedRange = resolveRangeChange(current, change);
        const sChartAreaWidth = sChartAreaWidthRef.current;
        const sRange = sChartAreaWidth === undefined
            ? sResolvedRange
            : enforceChartAreaWidth(
                  sResolvedRange,
                  sChartAreaWidth,
                  fixedRange,
              );
        return createNextRangeState(sCurrentState, sRange, change.type);
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
                nextRangeState.range.mainRange,
                sCurrentRangeState.range.mainRange,
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
            mainRange: fullRange,
            navigatorRange: fullRange,
        };
        const buildState = (
            requested: RangeState,
            fixedRange: 'main' | 'navigator' = 'main',
        ) => buildResolvedRangeState(
            sFullRangeState,
            { type: 'replace', range: requested },
            fullRange,
            fixedRange,
        );
        const sBoardRange = isRangeExpressionEmpty(boardRange)
            ? undefined
            : resolveRangeInput(
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
                          mainRange: sBoardRange,
                          navigatorRange: sBoardRange,
                      },
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
        const sMainRange = isRangeExpressionEmpty(sRangeInput)
            ? undefined
            : resolveRangeInput(
                  sRangeInput,
                  sAxisKind,
                  fullRange,
                  fullRange,
              );
        return buildState(
            !sMainRange &&
                isRangeExpressionEmpty(sRangeInput) &&
                applyInitialMainChartWindow
                ? createInitialRange(fullRange)
                : {
                      mainRange: sMainRange ?? fullRange,
                      navigatorRange: fullRange,
                  },
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
        const sExplicitStart =
            getPanelRangeKind(context.panelInfo) === 'numeric' &&
            isRangeExpressionEmpty(sBoardRange)
                ? parseRangeInputValue(sPanelRangeInput.start, 'numeric')
                : undefined;
        const sExplicitEnd = sExplicitStart !== undefined
            ? parseRangeInputValue(sPanelRangeInput.end, 'numeric')
            : undefined;
        const sExplicitFullRange =
            sExplicitStart !== undefined &&
            sExplicitEnd !== undefined &&
            sExplicitStart < sExplicitEnd
                ? { start: sExplicitStart, end: sExplicitEnd }
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
            mainRange: sFullRange,
            navigatorRange: sFullRange,
        };
        return buildResolvedRangeState(
            sFullRangeState,
            {
                type: 'replace',
                range: viewRange ?? sFullRangeState,
            },
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
        const sNavigatorRange = resolveRangeInput(
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
                type: 'navigator',
                range: sNavigatorRange,
            },
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
        return !isRangeExpressionEmpty(sRangeInput)
            ? applyNavigatorInput(
                  currentRangeState,
                  sFullRange,
                  sRangeInput,
                  getPanelAxisKind(context.panelInfo),
                  true,
              )
            : buildResolvedRangeState(
                  currentRangeState.range,
                  {
                      type: 'replace',
                      range: currentRangeState.range,
                  },
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
        const sMainRange = resolveRangeInput(
            context.panelInfo.time.rangeInput,
            getPanelAxisKind(context.panelInfo),
            sFullRange,
            currentRangeState.range.mainRange,
        );
        if (!sMainRange) {
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
                type: 'main',
                range: sMainRange,
            },
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
        const sGlobalRangeRequest =
            sInputsRef.current.globalRangeRequest;
        const sRangeKind = getPanelRangeKind(panelInfo);
        const sGlobalRange = sRangeKind
            ? sGlobalRangeRequest.ranges[sRangeKind]
            : undefined;
        const sShouldApplyNumericGlobalRange =
            !context.rangeState &&
            !panelInfo.time.useLastViewedRange &&
            sRangeKind === 'numeric' &&
            sGlobalRange !== undefined;

        if (sShouldApplyNumericGlobalRange) {
            return loadFullRangeState(context, sGlobalRange);
        }

        return loadBoardOrFallback(
            context,
            () =>
                context.rangeState
                    ? reloadRetainedRangeState(context, context.rangeState)
                    : !panelInfo.time.useLastViewedRange &&
                        sGlobalRange
                      ? loadFullRangeState(
                            context,
                            sGlobalRange,
                        )
                      : loadConfiguredRangeState(context, {
                            applyInitialMainChartWindow: true,
                            useLastViewedRange: true,
                        }),
        );
    }

    function commitRange(
        resolve: (current: RangeState) => RangeState,
        changeType: RangeChangeType,
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
                      changeType === 'navigator' ? 'navigator' : 'main',
                  );
            return createNextRangeState(
                sCurrentRangeState,
                sRange,
                changeType,
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
                action === 'shift-navigator-left' ||
                    action === 'shift-navigator-right'
                    ? 'navigator'
                    : 'main',
            ),
    );
    const onMainRangeChange = useStableCallback(
        (range: AxisRange) =>
            commitRange(
                (current) =>
                    resolveRangeChange(
                        current,
                        { type: 'main', range },
                    ),
                'main',
            ),
    );
    const onNavigatorRangeChange = useStableCallback(
        (range: AxisRange, input?: RangeExpressionInput) => {
            if (input && isRangeExpressionEmpty(input)) {
                void runRangeTask(reloadConfiguredRangeState);
                return;
            }

            commitRange(
                (current) =>
                    resolveRangeChange(
                        current,
                        { type: 'navigator', range },
                    ),
                'navigator',
                input,
            );
        },
    );
    const onRangeReplace = useStableCallback(
        (range: RangeState) =>
            commitRange(
                (current) =>
                    resolveRangeChange(
                        current,
                        { type: 'replace', range },
                    ),
                'replace',
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
        const sGlobalRange = sRangeKind
            ? globalRangeRequest.ranges[sRangeKind]
            : undefined;
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
            sRangeKind === globalRangeRequest.axisKind &&
            sGlobalRange &&
            sPrevious.globalRangeVersion !== sNext.globalRangeVersion
        ) {
            sBroadcastTask = {
                key: `global:${globalRangeRequest.applyVersion}`,
                task: (context) =>
                    sRangeKind === 'numeric'
                        ? loadFullRangeState(context, sGlobalRange)
                        : loadBoardOrFullRange(context, sGlobalRange),
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
    const sNavigatorRangeInput = rangeState?.navigatorRangeInput;
    return (
        sNavigatorRangeInput !== undefined &&
        !isRangeExpressionEmpty(sNavigatorRangeInput)
    );
}
