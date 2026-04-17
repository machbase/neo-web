export const PANEL_BACKGROUND = '#252525';
export const PANEL_CHART_HEIGHT = 250;
export const PANEL_GRID_SIDE = 35;
export const PANEL_GRID_BOTTOM = 18;
export const PANEL_MAIN_TOP = 16;
export const PANEL_MAIN_TOP_WITH_LEGEND = 40;
export const PANEL_LEGEND_TOP = 6;
export const PANEL_SLIDER_HEIGHT = 20;
export const PANEL_TOOLBAR_HEIGHT = 28;
export const PANEL_TOOLBAR_GAP = 12;
export const PANEL_HOVER_SYMBOL_SIZE = 6;
export const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;
export const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;
export const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;
export const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;
export const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;
export const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;
export const PANEL_Y_AXIS_SPLIT_COUNT = 5;

export const PANEL_AXIS_LABEL_STYLE = {
    color: '#f8f8f8',
    fontSize: 10,
};

export const Y_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
};

export const LEGEND_TEXT_STYLE = {
    color: '#e7e8ea',
    fontSize: 10,
};

export const TOOLTIP_TEXT_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
};

export const NO_DATA_STYLE = {
    color: '#9ca2ab',
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: 'normal',
};

export const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } };
export const AXIS_SPLIT_LINE_STYLE = { color: '#323333', width: 1 };

export const TOOLTIP_BASE = {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: '#1f1d1d',
    borderColor: '#292929',
    borderWidth: 1,
    textStyle: TOOLTIP_TEXT_STYLE,
};
