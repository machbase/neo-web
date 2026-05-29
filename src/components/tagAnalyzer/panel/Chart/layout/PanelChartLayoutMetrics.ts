export const PANEL_CHART_HEIGHT = 250;
export const PANEL_GRID_BOTTOM = 20;
export const PANEL_GRID_SIDE = 35;
export const PANEL_NAVIGATOR_GRID_SIDE = 58;
export const PANEL_SLIDER_HEIGHT = 26;

const PANEL_MAIN_TOP = 16;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_TOOLBAR_HEIGHT = 28;
const PANEL_TOOLBAR_GAP = 22;
const PANEL_MAIN_MIN_HEIGHT = 100;

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
