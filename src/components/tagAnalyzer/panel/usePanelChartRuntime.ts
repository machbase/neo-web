import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import { loadPanelChartState } from '../application/panel/loadPanelChartState';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import type { BoardActions } from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import {
    convertTimeRangeConfigToTimeRangeMs,
} from '../domain/time/TimeBoundaryConverters';
import { createTimeBoundaryFallbackRange } from '../domain/time/TimeRangeResolution';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeMs,
    TimeRangeConfig,
} from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalOptionUtils';
import {
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import { resolvePanelTimeRange } from './PanelTimeRangeResolver';
import {
    normalizeNavigatorRangeForPanelRange,
} from './rangeControl/PanelRangeControlLogic';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelRangeAppliedContext,
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

export type RefreshPanelDataRequest = {
    panelRange?: TimeRangeMs;
    raw: boolean;
    navigatorRange?: TimeRangeMs;
    panelInfoOverride?: PanelInfo;
    refreshNavigator?: boolean;
};

type PanelRangeRefreshResult = {
    isStale: boolean;
    panelRange?: TimeRangeMs | undefined;
    navigatorRange?: TimeRangeMs | undefined;
};

export function usePanelChartRuntime({
    panelInfo,
    boardTime,
    isActiveTab,
    isSelectedForOverlap,
    rollupTableList,
    chartAreaRef,
    panelChartApiRef,
    currentIsRaw,
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
    currentIsRaw: boolean;
    onPersistPanelState: BoardActions['onPersistPanelState'];
    onUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
}) {
    const { meta, data, time } = panelInfo;
    const [chartRangeState, setChartRangeState] = useState<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const [hasInitializedChartRanges, setHasInitializedChartRanges] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const chartRangeStateRef = useRef<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<TimeRangeMs>(EMPTY_TIME_RANGE);
    const hasLoadedChartData = chartRangeState.rangeOption !== undefined;

    function getChartLoadWidth() {
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
        context: PanelRangeAppliedContext,
    ) {
        if (time.useTimeKeeper) {
            onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: panelRange,
                    navigatorRange: context.navigatorRange,
                },
                isRaw: context.isRaw,
            });
        }
        if (isSelectedForOverlap) {
            onUpdateOverlapSelection(panelRange.startTime, panelRange.endTime, context.isRaw);
        }
    }

    function updateChartRangeState(patch: Partial<PanelNavigateState>) {
        const sNextChartRangeState = { ...chartRangeStateRef.current, ...patch };

        chartRangeStateRef.current = sNextChartRangeState;
        setChartRangeState(sNextChartRangeState);
    }

    async function refreshPanelData({
        panelRange,
        raw,
        navigatorRange,
        panelInfoOverride,
        refreshNavigator = true,
    }: RefreshPanelDataRequest): Promise<PanelRangeRefreshResult> {
        const sPanelInfo = panelInfoOverride ?? panelInfo;
        const sMainRange = panelRange ?? chartRangeStateRef.current.panelRange;
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;
        const sRequestedNavigatorRange =
            navigatorRange ??
            (isConcreteTimeRange(sCurrentNavigatorRange)
                ? sCurrentNavigatorRange
                : sMainRange);
        const sRequestId = ++panelLoadRequestIdRef.current;

        setIsChartLoading(true);

        try {
            const sLoadState = await loadPanelChartState(
                sPanelInfo.data,
                sPanelInfo.time,
                sPanelInfo.axes,
                boardTime,
                getChartLoadWidth(),
                raw,
                sMainRange,
                rollupTableList,
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
                ? await loadPanelChartState(
                      sPanelInfo.data,
                      sPanelInfo.time,
                      sPanelInfo.axes,
                      boardTime,
                      getChartLoadWidth(),
                      raw,
                      sAppliedNavigatorRange,
                      rollupTableList,
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

            return {
                isStale: false,
            };
        } finally {
            if (sRequestId === panelLoadRequestIdRef.current) {
                setIsChartLoading(false);
            }
        }
    }

    async function refreshNavigatorData(
        navigatorRange: TimeRangeMs,
        raw = currentIsRaw,
    ) {
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            chartRangeStateRef.current.panelRange,
            navigatorRange,
        );
        const sRequestId = ++panelLoadRequestIdRef.current;

        setIsChartLoading(true);

        try {
            const sLoadState = await loadPanelChartState(
                panelInfo.data,
                panelInfo.time,
                panelInfo.axes,
                boardTime,
                getChartLoadWidth(),
                raw,
                sNavigatorRange,
                rollupTableList,
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

            return {
                isStale: false,
            };
        } finally {
            if (sRequestId === panelLoadRequestIdRef.current) {
                setIsChartLoading(false);
            }
        }
    }

    function notifyPanelRangeApplied(panelRange: TimeRangeMs, raw = currentIsRaw) {
        handlePanelRangeApplied(panelRange, {
            navigatorRange: chartRangeStateRef.current.navigatorRange,
            isRaw: raw,
        });
    }

    async function applyLoadedRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs = panelRange,
        panelInfoOverride?: PanelInfo,
        raw = panelInfoOverride?.toolbar.isRaw ?? currentIsRaw,
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
            raw: raw,
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
        raw = panelInfoOverride?.toolbar.isRaw ?? currentIsRaw,
    ) {
        if (!isConcreteTimeRange(sResolvedRange)) {
            return;
        }

        const sRefreshResult = await applyLoadedRanges(
            sResolvedRange,
            sResolvedRange,
            panelInfoOverride,
            raw,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        notifyPanelRangeApplied(sRefreshResult.panelRange ?? sResolvedRange, raw);
    }

    async function resolveFullDataRange(
        panelInfoOverride: PanelInfo = panelInfo,
    ): Promise<TimeRangeMs> {
        return (
            createTimeBoundaryFallbackRange(
                (await resolveSeriesTimeBoundaryRanges(panelInfoOverride.data.tag_set)) ?? null,
            ) ?? EMPTY_TIME_RANGE
        );
    }

    async function reloadFullDataRange(panelInfoOverride?: PanelInfo) {
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
            : createTimeBoundaryFallbackRange(sBoundaryRanges) ?? EMPTY_TIME_RANGE;
    }

    const initialize = async function initialize(panelInfoOverride: PanelInfo = panelInfo) {
        const sPanelData = panelInfoOverride.data;
        const sPanelTime = panelInfoOverride.time;

        setHasInitializedChartRanges(false);

        const sResolvedRange = await resolvePanelTimeRange(
            boardTime,
            sPanelData,
            sPanelTime,
            await resolveFreshTimeBoundaryRanges(panelInfoOverride),
            'initialize',
        );
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
            panelInfoOverride.toolbar.isRaw,
        );
        setHasInitializedChartRanges(true);
    };

    const reloadAfterPanelEdit = async function reloadAfterPanelEdit(
        nextPanelInfo: PanelInfo,
    ) {
        if (!isActiveTab) {
            return;
        }

        await initialize(nextPanelInfo);
    };

    const refreshInitialTimeRange = async function refreshInitialTimeRange() {
        await reloadFullDataRange();
    };

    async function refreshCurrentVisibleData() {
        if (!panelChartApiRef.current) {
            return;
        }

        await refreshPanelData({
            panelRange: chartRangeStateRef.current.panelRange,
            raw: currentIsRaw,
            navigatorRange: chartRangeStateRef.current.navigatorRange,
        });
    }

    async function refreshInitialTimeRangeIfReady() {
        if (
            !panelChartApiRef.current ||
            !hasLoadedChartData ||
            !hasInitializedChartRanges
        ) {
            return;
        }

        await refreshInitialTimeRange();
    }

    async function initializeWhenReady() {
        if (
            isActiveTab &&
            chartAreaRef.current &&
            chartRangeStateRef.current.rangeOption === undefined
        ) {
            await initialize();
        }
    }

    return {
        chartRangeState,
        chartRangeStateRef,
        loadedDataRangeRef,
        hasLoadedChartData,
        hasInitializedChartRanges,
        isChartLoading,
        updateChartRangeState,
        refreshPanelData,
        refreshNavigatorData,
        notifyPanelRangeApplied,
        resolveBoardTimeRange,
        reloadAfterPanelEdit,
        refreshInitialTimeRange,
        refreshCurrentVisibleData,
        refreshInitialTimeRangeIfReady,
        initializeWhenReady,
        normalizeNavigatorRangeForPanelRange: normalizeNavigatorRangeForVisiblePanel,
    };
}

export type PanelChartRuntime = ReturnType<typeof usePanelChartRuntime>;
