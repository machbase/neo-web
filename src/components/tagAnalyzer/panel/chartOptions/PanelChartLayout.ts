import {
    PANEL_CHART_HEIGHT,
    PANEL_GRID_BOTTOM,
    PANEL_MAIN_TOP,
    PANEL_MAIN_TOP_WITH_LEGEND,
    PANEL_SLIDER_HEIGHT,
    PANEL_TOOLBAR_GAP,
    PANEL_TOOLBAR_HEIGHT,
} from './PanelChartOptionConstants';
import type { PanelChartLayoutMetrics } from './PanelChartOptionTypes';

/**
 * Returns the shared vertical layout metrics for the main plot, toolbar lane, and slider.
 * @param aShowLegend Whether the legend row is visible.
 * @returns The vertical layout metrics for the panel chart sections.
 */
export function getPanelChartLayoutMetrics(aShowLegend: boolean): PanelChartLayoutMetrics {
    const sMainGridTop = aShowLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;
    const sMainGridHeight = Math.max(sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop, 120);

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: sMainGridHeight,
        toolbarTop: sToolbarTop,
        toolbarHeight: PANEL_TOOLBAR_HEIGHT,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}
