import {
    PANEL_CHART_HEIGHT,
    PANEL_GRID_BOTTOM,
    PANEL_MAIN_MIN_HEIGHT,
    PANEL_MAIN_TOP,
    PANEL_MAIN_TOP_WITH_LEGEND,
    PANEL_SLIDER_HEIGHT,
    PANEL_TOOLBAR_GAP,
    PANEL_TOOLBAR_HEIGHT,
} from '../domain/ChartConstants';

export type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    toolbarHeight: number;
    sliderTop: number;
    sliderHeight: number;
};

export function getChartLayoutMetrics(showLegend: boolean): PanelChartLayoutMetrics {
    const sMainGridTop = showLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: Math.max(
            sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop,
            PANEL_MAIN_MIN_HEIGHT,
        ),
        toolbarTop: sToolbarTop,
        toolbarHeight: PANEL_TOOLBAR_HEIGHT,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}
