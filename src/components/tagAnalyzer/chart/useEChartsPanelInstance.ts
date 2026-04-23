import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PanelChartRefs } from '../utils/panelRuntimeTypes';
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

export function useEChartsPanelInstance() {
    const chartWrapperRef = useRef<ChartWrapperHandle | null>(null);

    const setChartWrapper = useCallback((aChart: unknown) => {
        chartWrapperRef.current = aChart as ChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback((): ChartInstance | undefined => {
        return chartWrapperRef.current?.getEchartsInstance?.();
    }, []);

    return {
        setChartWrapper,
        getChartInstance,
    };
}

// Exposes the narrow imperative chart handle used by parent panel controllers.
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

// Restores imperative chart state after ECharts reports a ready instance.
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
