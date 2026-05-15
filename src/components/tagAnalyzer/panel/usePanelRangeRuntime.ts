import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import type {
    BoardActions,
    GlobalTimeRangeState,
} from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import {
    convertTimeRangeConfigToTimeRangeMs,
} from '../domain/time/TimeBoundaryConverters';
import {
    resolveFullDataTimeRange,
    resolvePanelTimeRange,
} from '../domain/time/PanelTimeRangeResolver';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeMs,
    TimeRangeConfig,
} from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    createPanelRangeControlActions,
    normalizeNavigatorRange,
    normalizeNavigatorRangeForPanelRange,
} from './rangeControl/PanelRangeControlLogic';
import {
    loadPanelChartData,
    type PanelChartLoadResult,
} from './PanelSeriesDataLoader';
import type { PanelDatasetLoadPurpose } from '../domain/PanelSeriesFetchPlan';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelNavigatorShiftActions,
    PanelRangeChangeEvent,
    PanelRangeHandlers,
    PanelZoomActions,
} from './PanelTypes';

const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;

const INITIAL_PANEL_CHART_RANGE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
};

function showLimitReachedWarning(): void {
    Toast.warning('Only limit amount was displayed.', undefined);
}

function getChartLoadErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
        ? error.message
        : 'Failed to load chart data.';
}

function wasChartLoadErrorPresented(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { tagAnalyzerUserPresented?: unknown }).tagAnalyzerUserPresented === true
    );
}

type RefreshPanelDataRequest = {
    panelRange?: TimeRangeMs;
    navigatorRange?: TimeRangeMs;
    panelInfoOverride?: PanelInfo;
    refreshNavigator?: boolean;
};

type PanelRangeRefreshResult = {
    isStale: boolean;
    panelRange?: TimeRangeMs | undefined;
    navigatorRange?: TimeRangeMs | undefined;
};

function resolveNavigationSamplingEnabled(panelAxes: PanelInfo['axes']): boolean {
    return panelAxes.sampling.enabled || panelAxes.sampling.sample_count > 0;
}

type PanelChartLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type PanelRangeRuntime = {
    chartRangeState: PanelNavigateState;
    chartLoadStatus: PanelChartLoadStatus;
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    navigatorZoomActions: PanelZoomActions;
    refreshPanelData: (
        request: RefreshPanelDataRequest,
    ) => Promise<PanelRangeRefreshResult>;
    applyBoardTimeRange: (timeRange: TimeRangeConfig) => Promise<void>;
    applyGlobalTimeRange: (
        globalTimeRange: GlobalTimeRangeState | undefined,
    ) => Promise<void>;
    initializeAndApplyGlobalTimeRange: (
        globalTimeRange: GlobalTimeRangeState | undefined,
    ) => Promise<void>;
    reloadAfterPanelEdit: (nextPanelInfo: PanelInfo) => Promise<void>;
    refreshInitialTimeRange: () => Promise<void>;
    refreshCurrentVisibleData: () => Promise<void>;
    refreshInitialTimeRangeIfReady: () => Promise<void>;
    initializeWhenReady: () => Promise<void>;
};

export function usePanelRangeRuntime({
    panelInfo,
    boardTime,
    isActiveTab,
    isSelectedForOverlap,
    rollupTableList,
    chartAreaRef,
    panelChartApiRef,
    onPersistPanelState,
    onUpdateOverlapSelection,
}: {
    panelInfo: PanelInfo;
    boardTime: TimeRangeConfig;
    isActiveTab: boolean;
    isSelectedForOverlap: boolean;
    rollupTableList: string[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    panelChartApiRef: MutableRefObject<PanelChartHandle | null>;
    onPersistPanelState: BoardActions['onPersistPanelState'];
    onUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
}): PanelRangeRuntime {
    const { meta, data, time } = panelInfo;
    const [chartRangeState, setChartRangeState] = useState<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const [chartLoadStatus, setChartLoadStatus] =
        useState<PanelChartLoadStatus>('idle');
    const chartRangeStateRef = useRef<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const chartLoadStatusRef = useRef<PanelChartLoadStatus>('idle');
    const loadedDataRangeRef = useRef<TimeRangeMs>(EMPTY_TIME_RANGE);
    const panelLoadRequestIdRef = useRef(0);

    function updateChartLoadStatus(status: PanelChartLoadStatus): void {
        chartLoadStatusRef.current = status;
        setChartLoadStatus(status);
    }

    function getChartLoadWidth(): number {
        const sMeasuredChartWidth = chartAreaRef.current?.clientWidth;

        return typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
            ? sMeasuredChartWidth
            : 1;
    }

    function getNavigatorTrackPixelWidth(): number | undefined {
        const sMeasuredChartWidth = chartAreaRef.current?.clientWidth;

        return typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
            ? Math.max(sMeasuredChartWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1)
            : undefined;
    }

    function normalizeNavigatorRangeForVisiblePanel(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ): TimeRangeMs {
        const sNavigatorTrackPixelWidth = getNavigatorTrackPixelWidth();

        return sNavigatorTrackPixelWidth === undefined
            ? navigatorRange
            : normalizeNavigatorRangeForPanelRange({
                  panelRange: panelRange,
                  navigatorRange: navigatorRange,
                  navigatorPixelWidth: sNavigatorTrackPixelWidth,
              });
    }

    function handlePanelRangeApplied(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        isRaw: boolean,
    ): void {
        if (time.useTimeKeeper) {
            onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: panelRange,
                    navigatorRange: navigatorRange,
                },
                isRaw: isRaw,
            });
        }
        if (isSelectedForOverlap) {
            onUpdateOverlapSelection(panelRange.startTime, panelRange.endTime, isRaw);
        }
    }

    function updateChartRangeState(patch: Partial<PanelNavigateState>): void {
        const sNextChartRangeState = { ...chartRangeStateRef.current, ...patch };

        chartRangeStateRef.current = sNextChartRangeState;
        setChartRangeState(sNextChartRangeState);
    }

    async function loadPanelChartResult(
        panelInfoToLoad: PanelInfo,
        requestedRawMode: boolean,
        timeRange: TimeRangeMs,
        loadPurpose: PanelDatasetLoadPurpose,
    ): Promise<PanelChartLoadResult> {
        return loadPanelChartData({
            seriesConfigSet: panelInfoToLoad.data.tag_set ?? [],
            panelData: panelInfoToLoad.data,
            panelAxes: panelInfoToLoad.axes,
            chartWidth: getChartLoadWidth(),
            requestedRawMode: requestedRawMode,
            timeRange: timeRange,
            rollupTableList: rollupTableList,
            navigationSamplingEnabled:
                loadPurpose === 'navigator'
                    ? resolveNavigationSamplingEnabled(panelInfoToLoad.axes)
                    : panelInfoToLoad.axes.sampling.enabled,
            loadPurpose: loadPurpose,
        });
    }

    async function refreshPanelData({
        panelRange,
        navigatorRange,
        panelInfoOverride,
        refreshNavigator = true,
    }: RefreshPanelDataRequest): Promise<PanelRangeRefreshResult> {
        const sPanelInfo = panelInfoOverride ?? panelInfo;
        const sRequestedRawMode = sPanelInfo.toolbar.isRaw;
        const sMainRange = panelRange ?? chartRangeStateRef.current.panelRange;
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;
        const sRequestedNavigatorRange =
            navigatorRange ??
            (isConcreteTimeRange(sCurrentNavigatorRange)
                ? sCurrentNavigatorRange
                : sMainRange);
        const sRequestId = ++panelLoadRequestIdRef.current;

        updateChartLoadStatus('loading');

        try {
            const sLoadState = await loadPanelChartResult(
                sPanelInfo,
                sRequestedRawMode,
                sMainRange,
                'main',
            );
            const sLimitedDataRange = isConcreteTimeRange(sLoadState.limitedDataRange)
                ? sLoadState.limitedDataRange
                : undefined;
            const sAppliedPanelRange = sLimitedDataRange ?? sMainRange;
            const sAppliedNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
                sAppliedPanelRange,
                sRequestedNavigatorRange,
            );
            const sShouldRefreshNavigator =
                refreshNavigator && !isSameTimeRange(sAppliedNavigatorRange, sAppliedPanelRange);
            const sNavigatorLoadState = sShouldRefreshNavigator
                ? await loadPanelChartResult(
                      sPanelInfo,
                      sRequestedRawMode,
                      sAppliedNavigatorRange,
                      'navigator',
                  )
                : sLoadState;

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            if (sLoadState.isLimitReached) {
                showLimitReachedWarning();
            }
            loadedDataRangeRef.current = sAppliedPanelRange;

            updateChartRangeState({
                panelRange: sAppliedPanelRange,
                navigatorRange: sAppliedNavigatorRange,
                chartData: sLoadState.chartData.datasets,
                ...(refreshNavigator
                    ? { navigatorChartData: sNavigatorLoadState.chartData.datasets }
                    : {}),
                rangeOption: hasResolvedIntervalOption(sLoadState.rangeOption)
                    ? sLoadState.rangeOption
                    : hasResolvedIntervalOption(chartRangeStateRef.current.rangeOption)
                      ? chartRangeStateRef.current.rangeOption
                      : sLoadState.rangeOption,
            });
            updateChartLoadStatus('ready');

            return {
                isStale: false,
                panelRange: sAppliedPanelRange,
                navigatorRange: sAppliedNavigatorRange,
            };
        } catch (error) {
            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            updateChartLoadStatus('error');

            return {
                isStale: false,
            };
        }
    }

    async function refreshNavigatorData(
        navigatorRange: TimeRangeMs,
        panelInfoOverride: PanelInfo = panelInfo,
    ): Promise<PanelRangeRefreshResult> {
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            chartRangeStateRef.current.panelRange,
            navigatorRange,
        );
        const sRequestId = ++panelLoadRequestIdRef.current;

        updateChartLoadStatus('loading');

        try {
            const sLoadState = await loadPanelChartResult(
                panelInfoOverride,
                panelInfoOverride.toolbar.isRaw,
                sNavigatorRange,
                'navigator',
            );

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            updateChartRangeState({
                navigatorRange: sNavigatorRange,
                navigatorChartData: sLoadState.chartData.datasets,
            });
            updateChartLoadStatus('ready');

            return {
                isStale: false,
            };
        } catch (error) {
            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            updateChartLoadStatus('error');

            return {
                isStale: false,
            };
        }
    }

    function notifyPanelRangeApplied(
        panelRange: TimeRangeMs,
        panelInfoOverride: PanelInfo = panelInfo,
    ): void {
        handlePanelRangeApplied(
            panelRange,
            chartRangeStateRef.current.navigatorRange,
            panelInfoOverride.toolbar.isRaw,
        );
    }

    async function commitVisibleTimeRangeChange(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        panelInfoOverride: PanelInfo = panelInfo,
        preserveNavigatorRange = false,
    ): Promise<void> {
        const sNavigatorRange = preserveNavigatorRange
            ? navigatorRange
            : normalizeNavigatorRangeForVisiblePanel(
                  panelRange,
                  navigatorRange,
              );
        const sCurrentPanelRange = chartRangeStateRef.current.panelRange;
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;
        const sLoadedDataRange = loadedDataRangeRef.current;
        const sNavigatorRangeChanged = !isSameTimeRange(
            sNavigatorRange,
            sCurrentNavigatorRange,
        );
        const sPanelRangeChanged = !isSameTimeRange(panelRange, sCurrentPanelRange);

        if (sNavigatorRangeChanged && !sPanelRangeChanged) {
            updateChartRangeState({ navigatorRange: sNavigatorRange });

            const sRefreshResult = await refreshNavigatorData(
                sNavigatorRange,
                panelInfoOverride,
            );
            if (sRefreshResult.isStale) {
                return;
            }

            notifyPanelRangeApplied(panelRange, panelInfoOverride);
            return;
        }

        const sPreviousWidth = sCurrentPanelRange.endTime - sCurrentPanelRange.startTime;
        const sNextWidth = panelRange.endTime - panelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPreviousWidth > 0 &&
            Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoadedDataRange.startTime > 0 &&
            (panelRange.startTime < sLoadedDataRange.startTime ||
                panelRange.endTime > sLoadedDataRange.endTime);
        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;
        const sPreFetchNavigatorData = chartRangeStateRef.current.navigatorChartData;

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: sNavigatorRange,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(panelRange, panelInfoOverride);
            return;
        }

        const sRefreshResult = await refreshPanelData({
            panelRange: panelRange,
            navigatorRange: sNavigatorRangeChanged ? sNavigatorRange : undefined,
            panelInfoOverride: panelInfoOverride,
            refreshNavigator: sNavigatorRangeChanged,
        });
        if (sRefreshResult.isStale) {
            return;
        }

        const sAppliedPanelRange = sRefreshResult.panelRange ?? panelRange;

        if (!sNavigatorRangeChanged) {
            updateChartRangeState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sAppliedPanelRange, panelInfoOverride);
    }

    async function applyLoadedRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs = panelRange,
        panelInfoOverride?: PanelInfo,
    ): Promise<PanelRangeRefreshResult> {
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            panelRange,
            navigatorRange,
        );

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: sNavigatorRange,
        });

        const sRefreshResult = await refreshPanelData({
            panelRange: panelRange,
            navigatorRange: sNavigatorRange,
            panelInfoOverride: panelInfoOverride,
        });
        if (sRefreshResult.isStale) {
            return sRefreshResult;
        }

        const sAppliedPanelRange = sRefreshResult.panelRange ?? panelRange;
        const sAppliedNavigatorRange = sRefreshResult.navigatorRange ?? navigatorRange;

        updateChartRangeState({
            panelRange: sAppliedPanelRange,
            navigatorRange: sAppliedNavigatorRange,
        });

        return {
            isStale: false,
            panelRange: sAppliedPanelRange,
            navigatorRange: sAppliedNavigatorRange,
        };
    }

    async function resolveFreshTimeBoundaryRanges(
        panelInfoOverride: PanelInfo = panelInfo,
    ): Promise<FetchedTimeBoundaryRange | null> {
        return (
            (await resolveTimeBoundaryRanges(
                panelInfoOverride.data.tag_set,
                boardTime,
                panelInfoOverride.time.rangeConfig,
            )) ?? null
        );
    }

    async function reloadResolvedPanelRange(
        sResolvedRange: TimeRangeMs,
        panelInfoOverride?: PanelInfo,
    ): Promise<void> {
        if (!isConcreteTimeRange(sResolvedRange)) {
            return;
        }

        const sRefreshResult = await applyLoadedRanges(
            sResolvedRange,
            sResolvedRange,
            panelInfoOverride,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        notifyPanelRangeApplied(
            sRefreshResult.panelRange ?? sResolvedRange,
            panelInfoOverride,
        );
    }

    async function resolveFullDataRange(
        panelInfoOverride: PanelInfo = panelInfo,
    ): Promise<TimeRangeMs> {
        return (
            resolveFullDataTimeRange(
                (await resolveSeriesTimeBoundaryRanges(panelInfoOverride.data.tag_set)) ?? null,
            ) ?? EMPTY_TIME_RANGE
        );
    }

    async function reloadFullDataRange(panelInfoOverride?: PanelInfo): Promise<void> {
        if (!isActiveTab) {
            return;
        }

        const sFullDataRange = await resolveFullDataRange(panelInfoOverride);
        await reloadResolvedPanelRange(sFullDataRange, panelInfoOverride);
    }

    async function resolveBoardTimeRange(
        boardTimeOverride: TimeRangeConfig = boardTime,
    ): Promise<TimeRangeMs> {
        const sBoundaryRanges = (await resolveSeriesTimeBoundaryRanges(data.tag_set)) ?? null;
        const sBoardRange = convertTimeRangeConfigToTimeRangeMs(
            boardTimeOverride,
            sBoundaryRanges?.end.max.timestamp,
        );

        return isConcreteTimeRange(sBoardRange)
            ? sBoardRange
            : resolveFullDataTimeRange(sBoundaryRanges) ?? EMPTY_TIME_RANGE;
    }

    const initialize = async function initialize(
        panelInfoOverride: PanelInfo = panelInfo,
    ): Promise<void> {
        const sPanelTime = panelInfoOverride.time;

        updateChartLoadStatus('loading');

        const sResolvedRange = resolvePanelTimeRange({
            boardTime: boardTime,
            panelTime: sPanelTime,
            timeBoundaryRanges: await resolveFreshTimeBoundaryRanges(panelInfoOverride),
            mode: 'initialize',
        });
        let sPanelRange = sResolvedRange;
        let sNavigatorRange = sResolvedRange;

        if (sPanelTime.useTimeKeeper) {
            const sSavedPanelRange = sPanelTime.timeKeeper?.panelRange;
            const sSavedNavigatorRange = sPanelTime.timeKeeper?.navigatorRange;

            if (
                sSavedPanelRange?.startTime !== undefined &&
                sSavedPanelRange.endTime !== undefined &&
                sSavedNavigatorRange?.startTime !== undefined &&
                sSavedNavigatorRange.endTime !== undefined
            ) {
                sPanelRange = sSavedPanelRange;
                sNavigatorRange = sSavedNavigatorRange;
            }
        }

        await applyLoadedRanges(
            sPanelRange,
            sNavigatorRange,
            panelInfoOverride,
        );
    };

    const reloadAfterPanelEdit = async function reloadAfterPanelEdit(
        nextPanelInfo: PanelInfo,
    ): Promise<void> {
        if (!isActiveTab) {
            return;
        }

        await initialize(nextPanelInfo);
    };

    const refreshInitialTimeRange = async function refreshInitialTimeRange(): Promise<void> {
        await reloadFullDataRange();
    };

    async function refreshCurrentVisibleData(): Promise<void> {
        if (!panelChartApiRef.current) {
            return;
        }

        await refreshPanelData({
            panelRange: chartRangeStateRef.current.panelRange,
            navigatorRange: chartRangeStateRef.current.navigatorRange,
        });
    }

    async function refreshInitialTimeRangeIfReady(): Promise<void> {
        if (
            !panelChartApiRef.current ||
            chartLoadStatusRef.current !== 'ready'
        ) {
            return;
        }

        await refreshInitialTimeRange();
    }

    function handleNavigatorRangeChange(event: PanelRangeChangeEvent): void {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sPanelRange = chartRangeStateRef.current.panelRange;
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelRange,
            normalizeNavigatorRange({
                startTime: event.min,
                endTime: event.max,
            }),
        );

        if (
            !hasVisibleTimeRangeChanged(
                sPanelRange,
                sNavigatorRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        void commitVisibleTimeRangeChange(sPanelRange, sNavigatorRange);
    }

    async function handlePanelRangeChange(
        event: PanelRangeChangeEvent,
    ): Promise<void> {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sPanelRange = {
            startTime: event.min,
            endTime: event.max,
        };
        const sNavigatorRange = chartRangeStateRef.current.navigatorRange;

        if (
            !hasVisibleTimeRangeChanged(
                sPanelRange,
                sNavigatorRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        await commitVisibleTimeRangeChange(
            sPanelRange,
            sNavigatorRange,
            panelInfo,
            event.trigger === 'navigator',
        );
    }

    function commitRangeButtonChange(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs | undefined,
    ): void {
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            panelRange,
            navigatorRange ?? chartRangeStateRef.current.navigatorRange,
        );

        if (
            !hasVisibleTimeRangeChanged(
                panelRange,
                sNavigatorRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        void commitVisibleTimeRangeChange(panelRange, sNavigatorRange);
    }

    const { shiftActions, zoomActions } = createPanelRangeControlActions(
        commitRangeButtonChange,
        chartRangeState.panelRange,
        chartRangeState.navigatorRange,
    );
    const rangeHandlers: PanelRangeHandlers = {
        onPanelRangeChange: handlePanelRangeChange,
        onNavigatorRangeChange: handleNavigatorRangeChange,
        ...shiftActions,
    };
    const navigatorShiftActions: PanelNavigatorShiftActions = {
        onShiftLeft: shiftActions.onShiftNavigatorRangeLeft,
        onShiftRight: shiftActions.onShiftNavigatorRangeRight,
    };

    async function applyBoardTimeRange(timeRange: TimeRangeConfig): Promise<void> {
        if (
            !isActiveTab ||
            !panelChartApiRef.current ||
            chartLoadStatusRef.current !== 'ready'
        ) {
            return;
        }

        const sResolvedRange = await resolveBoardTimeRange(timeRange);

        if (
            !isConcreteTimeRange(sResolvedRange) ||
            !hasVisibleTimeRangeChanged(
                sResolvedRange,
                sResolvedRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        await commitVisibleTimeRangeChange(sResolvedRange, sResolvedRange);
    }

    async function applyGlobalTimeRange(
        globalTimeRange: GlobalTimeRangeState | undefined,
    ): Promise<void> {
        if (
            !globalTimeRange ||
            !isActiveTab ||
            chartLoadStatusRef.current !== 'ready'
        ) {
            return;
        }

        if (
            !hasVisibleTimeRangeChanged(
                globalTimeRange.data,
                globalTimeRange.navigator,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        await commitVisibleTimeRangeChange(
            globalTimeRange.data,
            globalTimeRange.navigator,
        );
    }

    async function initializeAndApplyGlobalTimeRange(
        globalTimeRange: GlobalTimeRangeState | undefined,
    ): Promise<void> {
        await initializeWhenReady();
        await applyGlobalTimeRange(globalTimeRange);
    }

    async function initializeWhenReady(): Promise<void> {
        if (
            isActiveTab &&
            chartAreaRef.current &&
            chartLoadStatusRef.current === 'idle'
        ) {
            await initialize();
        }
    }

    return {
        chartRangeState,
        chartLoadStatus,
        rangeHandlers,
        navigatorShiftActions,
        navigatorZoomActions: zoomActions,
        refreshPanelData,
        applyBoardTimeRange,
        applyGlobalTimeRange,
        initializeAndApplyGlobalTimeRange,
        reloadAfterPanelEdit,
        refreshInitialTimeRange,
        refreshCurrentVisibleData,
        refreshInitialTimeRangeIfReady,
        initializeWhenReady,
    };
}
