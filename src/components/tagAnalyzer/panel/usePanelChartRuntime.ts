import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { loadPanelChartState } from '../fetch/PanelChartDataLoader';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import type { BoardActions } from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import {
    convertTimeRangeConfigToTimeRangeMs,
} from '../time/TimeBoundaryConverters';
import { createTimeBoundaryFallbackRange } from '../time/TimeRangeResolution';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';
import { hasResolvedIntervalOption } from '../time/TimeIntervalOptionUtils';
import { isConcreteTimeRange } from '../time/TimeRangeUtils';
import { resolvePanelTimeRange } from './PanelTimeRangeResolver';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelRangeAppliedContext,
} from './PanelTypes';

const INITIAL_PANEL_CHART_RANGE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
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

    async function refreshPanelData(
        timeRange: TimeRangeMs | undefined,
        raw: boolean,
        dataRange: TimeRangeMs | undefined,
        panelInfoOverride?: PanelInfo,
    ) {
        const sPanelInfo = panelInfoOverride ?? panelInfo;
        const sRequestedRange = timeRange ?? chartRangeStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
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
                sLoadedDataRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            loadedDataRangeRef.current = sLoadedDataRange;

            updateChartRangeState({
                chartData: sLoadState.chartData.datasets,
                navigatorChartData: sLoadState.chartData.datasets,
                rangeOption: hasResolvedIntervalOption(sLoadState.rangeOption)
                    ? sLoadState.rangeOption
                    : hasResolvedIntervalOption(chartRangeStateRef.current.rangeOption)
                      ? chartRangeStateRef.current.rangeOption
                      : sLoadState.rangeOption,
            });

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
                navigatorRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            updateChartRangeState({
                navigatorChartData: sLoadState.chartData.datasets,
            });

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
    ) {
        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });

        const sRefreshResult = await refreshPanelData(
            panelRange,
            raw,
            navigatorRange,
            panelInfoOverride,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });
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

        await applyLoadedRanges(sResolvedRange, sResolvedRange, panelInfoOverride, raw);
        notifyPanelRangeApplied(sResolvedRange, raw);
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

        await refreshPanelData(
            chartRangeStateRef.current.panelRange,
            currentIsRaw,
            chartRangeStateRef.current.navigatorRange,
        );
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
    };
}

export type PanelChartRuntime = ReturnType<typeof usePanelChartRuntime>;
