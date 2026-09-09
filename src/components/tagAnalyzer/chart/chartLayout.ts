export const PANEL_CHART_HEIGHT = 350;

export const PANEL_GRID_BOTTOM = 20;

export const PANEL_GRID_SIDE = 35;

export const PANEL_NAVIGATOR_GRID_SIDE = 28;

export const PANEL_SLIDER_HEIGHT = 36;

export const PANEL_NAVIGATOR_DATA_X_AXIS_INDEX = 2;

export const PANEL_NAVIGATOR_Y_AXIS_INDEX = 2;

export const PANEL_CHART_LAYOUTS = {
    withoutLegend: {
        mainGridTop: 16,
        mainGridHeight: 206,
        toolbarTop: 244,
        sliderTop: 294,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    },
    withLegend: {
        mainGridTop: 40,
        mainGridHeight: 182,
        toolbarTop: 244,
        sliderTop: 294,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    },
} as const;

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }
    return Math.max(chartAreaWidth - PANEL_NAVIGATOR_GRID_SIDE * 2, 1);
}
