import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PanelChartRefs } from '../utils/panelRuntimeTypes';
import type { ChartSeriesItem } from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { buildVisibleSeriesList } from './options/ChartLegendVisibility';
import type {
    PanelChartInstance,
    PanelChartWrapperHandle,
} from './PanelChartRuntimeTypes';

type SyncPanelRange = (
    range: TimeRangeMs,
    instance: PanelChartInstance | undefined,
    force?: boolean,
) => void;

type UsePanelChartHandleBridgeParams = {
    chartRefs: Pick<PanelChartRefs, 'chartWrap'>;
    chartData: ChartSeriesItem[];
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    syncPanelRange: SyncPanelRange;
    getHighlightIndexAtClientPosition: (clientX: number, clientY: number) => number | undefined;
};

export function useEChartsPanelInstance() {
    const chartWrapperRef = useRef<PanelChartWrapperHandle | null>(null);

    const setChartWrapper = useCallback((chart: unknown) => {
        chartWrapperRef.current = chart as PanelChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback((): PanelChartInstance | undefined => {
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
            setPanelRange: (range) => {
                syncPanelRange(range, undefined, undefined);
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
}: {
    panelRange: TimeRangeMs;
    syncBrushInteraction: (instance: PanelChartInstance | undefined) => void;
    syncPanelRange: SyncPanelRange;
    hoveredLegendSeriesRef: MutableRefObject<string | undefined>;
    applyLegendHoverState: (hoveredLegendSeries: string | undefined, force?: boolean) => void;
}) {
    const readyChartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const latestPanelRangeRef = useRef<TimeRangeMs>(panelRange);
    latestPanelRangeRef.current = panelRange;

    return useCallback(
        (instance: PanelChartInstance) => {
            const sShouldForceSync = readyChartInstanceRef.current !== instance;
            readyChartInstanceRef.current = instance;
            syncBrushInteraction(instance);
            syncPanelRange(latestPanelRangeRef.current, instance, sShouldForceSync);
            if (hoveredLegendSeriesRef.current) {
                applyLegendHoverState(hoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, hoveredLegendSeriesRef, syncBrushInteraction, syncPanelRange],
    );
}
