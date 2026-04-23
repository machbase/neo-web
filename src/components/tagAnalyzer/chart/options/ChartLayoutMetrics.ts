import {
    PANEL_CHART_HEIGHT,
    PANEL_GRID_BOTTOM,
    PANEL_MAIN_TOP,
    PANEL_MAIN_TOP_WITH_LEGEND,
    PANEL_SLIDER_HEIGHT,
    PANEL_TOOLBAR_GAP,
    PANEL_TOOLBAR_HEIGHT,
} from './ChartOptionConstants';

type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    toolbarHeight: number;
    sliderTop: number;
    sliderHeight: number;
};

/**
 * Builds the shared vertical layout metrics for the main plot, toolbar lane, and slider.
 * Intent: Keep chart layout calculation separate from static option constants.
 * @param aMainGridTop The top position used by the main chart grid.
 * @returns The vertical layout metrics for the panel chart sections.
 */
function createChartLayoutMetrics(aMainGridTop: number): PanelChartLayoutMetrics {
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;
    const sMainGridHeight = Math.max(sToolbarTop - PANEL_TOOLBAR_GAP - aMainGridTop, 120);

    return {
        mainGridTop: aMainGridTop,
        mainGridHeight: sMainGridHeight,
        toolbarTop: sToolbarTop,
        toolbarHeight: PANEL_TOOLBAR_HEIGHT,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}

/**
 * Returns layout metrics when the legend row is visible.
 * Intent: Name the legend-specific layout instead of hiding it behind a boolean flag.
 * @returns The vertical layout metrics for charts with a legend.
 */
export function getChartLayoutMetricsWithLegend(): PanelChartLayoutMetrics {
    return createChartLayoutMetrics(PANEL_MAIN_TOP_WITH_LEGEND);
}

/**
 * Returns layout metrics when the legend row is hidden.
 * Intent: Name the no-legend layout instead of passing `false` to a generic function.
 * @returns The vertical layout metrics for charts without a legend.
 */
export function getChartLayoutMetricsWithoutLegend(): PanelChartLayoutMetrics {
    return createChartLayoutMetrics(PANEL_MAIN_TOP);
}
