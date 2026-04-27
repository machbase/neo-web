import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';
import { usePanelChartEvents } from './usePanelChartEvents';
import { useTimeSeriesChartRuntime } from './useTimeSeriesChartRuntime';
import { PANEL_CHART_HEIGHT } from './options/OptionBuildHelpers/ChartOptionConstants';
import { buildChartOption } from './options/ChartOptionBuilder';
import { buildDefaultVisibleSeriesMap } from './options/ChartLegendVisibility';

function useStableChartOptionValue<T>(value: T) {
    const sValueKey = JSON.stringify(value);
    const sValueRef = useRef(value);
    const sValueKeyRef = useRef(sValueKey);

    if (sValueKeyRef.current !== sValueKey) {
        sValueKeyRef.current = sValueKey;
        sValueRef.current = value;
    }

    return sValueRef.current;
}

const PanelChartRenderer = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: Pick<
        PanelState,
        'isRaw' | 'isDragSelectActive' | 'isHighlightActive' | 'isAnnotationActive'
    >;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
}) => {
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const sIsSelectionMode = pPanelState.isDragSelectActive || pPanelState.isHighlightActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || pChartState.display.use_zoom;
    const sStableAxes = useStableChartOptionValue(pChartState.axes);
    const sStableDisplay = useStableChartOptionValue(pChartState.display);

    const {
        appliedZoomRangeRef,
        applyLegendHoverState,
        getChartInstance,
        handleChartReady,
        hoveredLegendSeriesRef,
        lastZoomRangeRef,
        setChartWrapper,
        skipNextPanelRangeSyncRef,
        syncBrushInteraction,
        syncPanelRange,
    } = useTimeSeriesChartRuntime({
        chartRefs: pChartRefs,
        chartState: pChartState,
        panelState: pPanelState,
        navigateState: pNavigateState,
        isBrushActive: sIsBrushActive,
        visibleSeriesRef: sVisibleSeriesRef,
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
                pChartState.seriesList,
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
            pChartState.seriesList,
            sStableAxes,
            sStableDisplay,
            sVisibleSeries,
        ],
    );

    useEffect(() => {
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

    return (
        <ReactECharts
            ref={(chart) => {
                setChartWrapper(chart);
            }}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={(instance) => {
                handleChartReady(instance as unknown as PanelChartInstance);
            }}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default PanelChartRenderer;
