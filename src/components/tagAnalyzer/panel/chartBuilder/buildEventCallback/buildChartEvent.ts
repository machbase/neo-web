import { buildBrushEvent } from './buildBrushEvent';
import type {
    BuildChartEventParams,
    ChartEvents,
} from './eventCallbackTypes';
import { buildLegendEvent } from './buildLegendEvent';
import { buildMarkupClickEvent } from './buildMarkupClickEvent';
import { buildPointerEvent } from './buildPointerEvent';
import { buildRangeEvent } from './buildRangeEvent';

export function buildChartEvent({
    currentRanges,
    overlayMode,
    chartAreaRef,
    rangeHandlers,
    markupHandlers,
    onSelection,
    isSelectionMode,
    isDragZoomEnabled,
    isNumericXAxis,
    getChartInstance,
    applyLegendHoverState,
    setVisibleSeries,
    visibleSeriesRef,
    latestHoverTimestampRef,
}: BuildChartEventParams): ChartEvents {
    const rangeEvents = buildRangeEvent({
        currentRanges,
        rangeHandlers,
        getChartInstance,
    });
    const brushEvents = buildBrushEvent({
        currentRanges,
        isSelectionMode,
        isDragZoomEnabled,
        onSelection,
        rangeHandlers,
        getChartInstance,
        isNumericXAxis,
    });
    const legendEvents = buildLegendEvent({
        applyLegendHoverState,
        setVisibleSeries,
        visibleSeriesRef,
    });
    const pointerEvents = buildPointerEvent({
        latestHoverTimestampRef,
        isNumericXAxis,
    });
    const markupClickEvents = buildMarkupClickEvent({
        overlayMode,
        chartAreaRef,
        markupHandlers,
        getChartInstance,
        latestHoverTimestampRef,
        isNumericXAxis,
    });

    return {
        datazoom: rangeEvents.datazoom,
        brushEnd: brushEvents.brushEnd,
        legendselectchanged: legendEvents.legendselectchanged,
        highlight: legendEvents.highlight,
        downplay: legendEvents.downplay,
        updateAxisPointer: pointerEvents.updateAxisPointer,
        globalout: pointerEvents.globalout,
        click: markupClickEvents.click,
    };
}
