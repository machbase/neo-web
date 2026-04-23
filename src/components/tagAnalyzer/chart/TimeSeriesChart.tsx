import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PANEL_CHART_HEIGHT } from './options/ChartOptionConstants';
import { buildChartOption } from './options/ChartOptionBuilder';
import {
    buildDefaultVisibleSeriesMap,
} from './options/ChartLegendVisibility';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';
import { getHighlightIndexAtClientPosition } from './ChartHighlightHitTesting';
import {
    useEChartsPanelInstance,
    usePanelChartHandleBridge,
    usePanelChartReadySync,
} from './useEChartsPanelInstance';
import { usePanelChartBrushSync } from './usePanelChartBrushSync';
import { usePanelChartEvents } from './usePanelChartEvents';
import { usePanelChartLegendHover } from './usePanelChartLegendHover';
import { usePanelChartRangeSync } from './usePanelChartRangeSync';

/**
 * Displays the main panel graph and its navigator/scroll area.
 * Intent: Keep the chart shell in sync with panel state without rebuilding live interaction state.
 * @param props The chart refs, state, and callbacks used to drive the panel chart.
 * @returns The rendered ECharts panel.
 */
const TimeSeriesChart = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: Pick<PanelState, 'isRaw' | 'isDragSelectActive' | 'isHighlightActive'>;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
}) => {
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const { getChartInstance, setChartWrapper } = useEChartsPanelInstance();
    const sIsSelectionMode = pPanelState.isDragSelectActive || pPanelState.isHighlightActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;
    const sAxesOptionKey = JSON.stringify(pChartState.axes);
    const sDisplayOptionKey = JSON.stringify(pChartState.display);
    const sStableAxesRef = useRef(pChartState.axes);
    const sStableAxesKeyRef = useRef(sAxesOptionKey);
    const sStableDisplayRef = useRef(pChartState.display);
    const sStableDisplayKeyRef = useRef(sDisplayOptionKey);
    if (sStableAxesKeyRef.current !== sAxesOptionKey) {
        sStableAxesKeyRef.current = sAxesOptionKey;
        sStableAxesRef.current = pChartState.axes;
    }
    if (sStableDisplayKeyRef.current !== sDisplayOptionKey) {
        sStableDisplayKeyRef.current = sDisplayOptionKey;
        sStableDisplayRef.current = pChartState.display;
    }

    const sStableAxes = sStableAxesRef.current;
    const sStableDisplay = sStableDisplayRef.current;

    const {
        appliedZoomRangeRef,
        lastZoomRangeRef,
        skipNextPanelRangeSyncRef,
        syncPanelRange,
    } = usePanelChartRangeSync({
        getChartInstance,
        panelRange: pNavigateState.panelRange,
        navigatorRange: pNavigateState.navigatorRange,
    });
    const syncBrushInteraction = usePanelChartBrushSync({
        getChartInstance,
        isBrushActive: sIsBrushActive,
    });
    const {
        applyLegendHoverState,
        hoveredLegendSeriesRef,
    } = usePanelChartLegendHover({
        getChartInstance,
        chartState: pChartState,
        navigateState: pNavigateState,
        panelState: pPanelState,
    });

    /**
     * Resolves which saved highlight contains the requested client position.
     * Intent: Let the outer chart wrapper intercept highlight right clicks before the panel context menu opens.
     * @param aClientX The viewport x coordinate from the mouse event.
     * @param aClientY The viewport y coordinate from the mouse event.
     * @returns The matched highlight index, or `undefined` when the position is not inside a saved highlight.
     */
    const getHighlightIndexAtClientPositionForChart = useCallback(
        (aClientX: number, aClientY: number): number | undefined =>
            getHighlightIndexAtClientPosition({
                areaChartRef: pChartRefs.areaChart,
                chartInstance: getChartInstance(),
                highlights: pChartState.highlights,
                clientX: aClientX,
                clientY: aClientY,
            }),
        [getChartInstance, pChartRefs.areaChart, pChartState.highlights],
    );

    usePanelChartHandleBridge({
        chartRefs: pChartRefs,
        chartData: pNavigateState.chartData,
        visibleSeriesRef: sVisibleSeriesRef,
        syncPanelRange,
        getHighlightIndexAtClientPosition: getHighlightIndexAtClientPositionForChart,
    });

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(pNavigateState.chartData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [pNavigateState.chartData]);

    const sOption = useMemo(
        () =>
            buildChartOption(
                pNavigateState.chartData,
                pNavigateState.navigatorRange,
                sStableAxes,
                sStableDisplay,
                pPanelState.isRaw,
                pChartState.useNormalize,
                sVisibleSeries,
                pNavigateState.navigatorChartData,
                undefined,
                pChartState.highlights,
            ),
        [
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
            pChartState.highlights,
            sStableAxes,
            sStableDisplay,
            sVisibleSeries,
        ],
    );

    useEffect(() => {
        // `notMerge` replaces the option tree, so re-apply imperative chart state after option updates.
        syncBrushInteraction(undefined);
        syncPanelRange(lastZoomRangeRef.current, undefined, true);
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    }, [
        applyLegendHoverState,
        hoveredLegendSeriesRef,
        lastZoomRangeRef,
        sOption,
        syncBrushInteraction,
        syncPanelRange,
    ]);

    useEffect(() => {
        syncPanelRange(pNavigateState.panelRange, undefined, undefined);
    }, [pNavigateState.panelRange, syncPanelRange]);

    const sOnEvents = usePanelChartEvents({
        getChartInstance,
        navigateState: pNavigateState,
        panelState: pPanelState,
        chartRefs: pChartRefs,
        chartHandlers: pChartHandlers,
        isSelectionMode: sIsSelectionMode,
        isDragZoomEnabled: sIsDragZoomEnabled,
        lastZoomRangeRef,
        appliedZoomRangeRef,
        skipNextPanelRangeSyncRef,
        applyLegendHoverState,
        setVisibleSeries,
        visibleSeriesRef: sVisibleSeriesRef,
    });

    const handleChartReady = usePanelChartReadySync({
        panelRange: pNavigateState.panelRange,
        syncBrushInteraction,
        syncPanelRange,
        hoveredLegendSeriesRef,
        applyLegendHoverState,
    });

    return (
        <ReactECharts
            ref={(aChart) => {
                setChartWrapper(aChart);
            }}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={(aInstance) => {
                handleChartReady(aInstance as unknown as PanelChartInstance);
            }}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default TimeSeriesChart;
