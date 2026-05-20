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
    getChartInstance,
    lastZoomRangeRef,
    applyLegendHoverState,
    setVisibleSeries,
    visibleSeriesRef,
    latestHoverTimestampRef,
}: BuildChartEventParams): ChartEvents {
    const rangeEvents = buildRangeEvent({
        currentRanges,
        rangeHandlers,
        getChartInstance,
        lastZoomRangeRef,
    });
    const brushEvents = buildBrushEvent({
        isSelectionMode,
        isDragZoomEnabled,
        onSelection,
        rangeHandlers,
        getChartInstance,
        lastZoomRangeRef,
    });
    const legendEvents = buildLegendEvent({
        applyLegendHoverState,
        setVisibleSeries,
        visibleSeriesRef,
    });
    const pointerEvents = buildPointerEvent({ latestHoverTimestampRef });
    const markupClickEvents = buildMarkupClickEvent({
        overlayMode,
        chartAreaRef,
        markupHandlers,
        getChartInstance,
        latestHoverTimestampRef,
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
