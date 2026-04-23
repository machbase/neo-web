import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type {
    PanelChartRefs,
} from '../utils/panelRuntimeTypes';
import type { ChartSeriesItem } from '../utils/series/seriesTypes';
import type { TimeRangeMs } from '../utils/time/timeTypes';
import { buildVisibleSeriesList } from './options/ChartLegendVisibility';
import type {
    ChartInstance,
    ChartWrapperHandle,
} from './ChartRuntimeTypes';

type SyncPanelRange = (
    aRange: TimeRangeMs,
    aInstance: ChartInstance | undefined,
    aForce?: boolean,
) => void;

type UsePanelChartHandleBridgeParams = {
    chartRefs: Pick<PanelChartRefs, 'chartWrap'>;
    chartData: ChartSeriesItem[];
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    syncPanelRange: SyncPanelRange;
    getHighlightIndexAtClientPosition: (aClientX: number, aClientY: number) => number | undefined;
};

type UsePanelChartReadySyncParams = {
    panelRange: TimeRangeMs;
    syncBrushInteraction: (aInstance: ChartInstance | undefined) => void;
    syncPanelRange: SyncPanelRange;
    hoveredLegendSeriesRef: MutableRefObject<string | undefined>;
    applyLegendHoverState: (aHoveredLegendSeries: string | undefined, aForce?: boolean) => void;
};

/**
 * Owns access to the mounted ECharts wrapper instance.
 * Intent: Keep third-party wrapper ref shape out of the chart render component.
 * @returns The wrapper ref and a stable ECharts instance getter.
 */
export function useEChartsPanelInstance() {
    const chartWrapperRef = useRef<ChartWrapperHandle | null>(null);

    const setChartWrapper = useCallback((aChart: unknown) => {
        chartWrapperRef.current = aChart as ChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback((): ChartInstance | undefined => {
        return chartWrapperRef.current?.getEchartsInstance?.();
    }, []);

    return {
        chartWrapperRef,
        setChartWrapper,
        getChartInstance,
    };
}

/**
 * Exposes the narrow imperative chart handle used by parent panel controllers.
 * Intent: Keep parent-facing chart commands separate from ReactECharts rendering.
 * @param aParams The chart refs, current data, visible-series state, and range/highlight commands.
 * @returns Nothing.
 */
export function usePanelChartHandleBridge({
    chartRefs,
    chartData,
    visibleSeriesRef,
    syncPanelRange,
    getHighlightIndexAtClientPosition,
}: UsePanelChartHandleBridgeParams) {
    useEffect(() => {
        chartRefs.chartWrap.current = {
            setPanelRange: (aRange) => {
                syncPanelRange(aRange, undefined, undefined);
            },
            getVisibleSeries: () =>
                buildVisibleSeriesList(chartData, visibleSeriesRef.current),
            getHighlightIndexAtClientPosition,
        };
    }, [
        chartData,
        chartRefs.chartWrap,
        getHighlightIndexAtClientPosition,
        syncPanelRange,
        visibleSeriesRef,
    ]);
}

/**
 * Restores imperative chart state after ECharts reports a ready instance.
 * Intent: Reconnect brush, zoom, and legend-hover state after ref mounts or refreshes.
 * @param aParams The current panel range and callbacks that restore live chart state.
 * @returns A chart-ready handler for ReactECharts.
 */
export function usePanelChartReadySync({
    panelRange,
    syncBrushInteraction,
    syncPanelRange,
    hoveredLegendSeriesRef,
    applyLegendHoverState,
}: UsePanelChartReadySyncParams) {
    const readyChartInstanceRef = useRef<ChartInstance | undefined>(undefined);
    const latestPanelRangeRef = useRef<TimeRangeMs>(panelRange);
    latestPanelRangeRef.current = panelRange;

    return useCallback(
        (aInstance: ChartInstance) => {
            const sShouldForceSync = readyChartInstanceRef.current !== aInstance;
            readyChartInstanceRef.current = aInstance;
            syncBrushInteraction(aInstance);
            syncPanelRange(latestPanelRangeRef.current, aInstance, sShouldForceSync);
            if (hoveredLegendSeriesRef.current) {
                applyLegendHoverState(hoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, hoveredLegendSeriesRef, syncBrushInteraction, syncPanelRange],
    );
}
