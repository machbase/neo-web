export const PANEL_CHART_HEIGHT = 350;

export const PANEL_GRID_BOTTOM = 20;

export const PANEL_GRID_SIDE = 35;

export const PANEL_NAVIGATOR_GRID_SIDE = 28;

export const PANEL_SLIDER_HEIGHT = 36;

export const PANEL_NAVIGATOR_DATA_X_AXIS_INDEX = 2;

export const PANEL_NAVIGATOR_Y_AXIS_INDEX = 2;

export function getChartLayoutMetrics(showLegend: boolean) {
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
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }
    return Math.max(chartAreaWidth - PANEL_NAVIGATOR_GRID_SIDE * 2, 1);
}

const PANEL_MAIN_TOP = 16;

const PANEL_MAIN_TOP_WITH_LEGEND = 40;

const PANEL_TOOLBAR_HEIGHT = 28;

const PANEL_TOOLBAR_GAP = 22;

const PANEL_MAIN_MIN_HEIGHT = 100;
