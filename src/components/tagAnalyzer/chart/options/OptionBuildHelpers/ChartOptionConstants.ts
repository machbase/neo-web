import type {
    BrushComponentOption,
    EChartsOption,
    GridComponentOption,
    LegendComponentOption,
    LineSeriesOption,
    MarkAreaComponentOption,
    ScatterSeriesOption,
    TitleComponentOption,
    ToolboxComponentOption,
    TooltipComponentOption,
    XAXisComponentOption,
    YAXisComponentOption,
} from 'echarts';
import type { PanelAxes } from '../../../utils/panelModelTypes';

type AxisLineStyleOption = NonNullable<XAXisComponentOption['axisLine']>;
type AxisSplitLineStyleOption = NonNullable<
    NonNullable<XAXisComponentOption['splitLine']>['lineStyle']
>;

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
export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';
export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';
export const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
export const ANNOTATION_LABEL_SERIES_ID_PREFIX = 'annotation-label-series-';
export const HIGHLIGHT_COLOR = '#fdb532';
export const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';
export const ANNOTATION_LABEL_BACKGROUND = 'rgba(26, 26, 26, 0.92)';
export const ANNOTATION_LABEL_TEXT_COLOR = '#f8f8f8';
export const ANNOTATION_GUIDE_LINE_OPACITY = 0.75;
export const ANNOTATION_LABEL_HEIGHT = 20;
export const ANNOTATION_LABEL_MIN_WIDTH = 72;
export const ANNOTATION_LABEL_MAX_WIDTH = 220;
export const ANNOTATION_LABEL_HORIZONTAL_PADDING = 24;
export const ANNOTATION_LABEL_WIDTH_PER_CHARACTER = 7;
export const ANNOTATION_ROW_TOP_PADDING_RATIO = 0.08;
export const ANNOTATION_ROW_HEIGHT_RATIO = 0.1;
export const ANNOTATION_TIME_GAP_BASE_RATIO = 0.08;
export const ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO = 0.004;
export const ANNOTATION_TIME_GAP_MAX_RATIO = 0.22;

export const DEFAULT_NOT_SHOW = {
    show: false,
} as const;

export const PANEL_CHART_BASE_OPTION: EChartsOption = {
    animation: false,
    backgroundColor: PANEL_BACKGROUND,
    textStyle: {
        fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
    },
};

export const PANEL_CHART_BRUSH_OPTION: BrushComponentOption = {
    toolbox: [],
    xAxisIndex: 0,
    brushMode: 'single' as const,
    throttleType: 'debounce' as const,
    throttleDelay: 150,
    brushStyle: {
        color: 'rgba(68, 170, 213, 0.2)',
        borderColor: 'rgba(68, 170, 213, 0.5)',
    },
};

export const HIDDEN_PANEL_TOOLBOX_OPTION = {
    ...DEFAULT_NOT_SHOW,
} satisfies ToolboxComponentOption;

export const HIDDEN_PANEL_TITLE_OPTION = {
    ...DEFAULT_NOT_SHOW,
} satisfies TitleComponentOption;

export const PANEL_AXIS_LABEL_STYLE = {
    color: '#f8f8f8',
    fontSize: 10,
} satisfies XAXisComponentOption['axisLabel'];

export const Y_AXIS_LABEL_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
} satisfies YAXisComponentOption['axisLabel'];

export const LEGEND_TEXT_STYLE = {
    color: '#e7e8ea',
    fontSize: 10,
} satisfies LegendComponentOption['textStyle'];

export const TOOLTIP_TEXT_STYLE = {
    color: '#afb5bc',
    fontSize: 10,
} satisfies TooltipComponentOption['textStyle'];

export const AXIS_LINE_STYLE = { lineStyle: { color: '#323333' } } satisfies AxisLineStyleOption;
export const AXIS_SPLIT_LINE_STYLE = {
    color: '#323333',
    width: 1,
} satisfies AxisSplitLineStyleOption;

export const TOOLTIP_BASE: TooltipComponentOption = {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: '#1f1d1d',
    borderColor: '#292929',
    borderWidth: 1,
    textStyle: TOOLTIP_TEXT_STYLE,
};

export const HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION: LineSeriesOption = {
    id: 'highlight-overlay',
    type: 'line',
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: [],
    symbol: 'none',
    showSymbol: false,
    silent: true,
    animation: false,
    legendHoverLink: false,
    lineStyle: {
        width: 0,
        opacity: 0,
    },
    itemStyle: {
        opacity: 0,
    },
    tooltip: DEFAULT_NOT_SHOW,
    z: 1,
    emphasis: {
        disabled: true,
    },
};

export const HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION: MarkAreaComponentOption = {
    silent: true,
    itemStyle: {
        color: 'rgba(253, 181, 50, 0.16)',
    },
    label: {
        ...DEFAULT_NOT_SHOW,
        color: HIGHLIGHT_COLOR,
        fontSize: 10,
    },
};

export const HIGHLIGHT_LABEL_SERIES_STATIC_OPTION: ScatterSeriesOption = {
    id: HIGHLIGHT_LABEL_SERIES_ID,
    type: 'scatter',
    xAxisIndex: 0,
    yAxisIndex: 0,
    symbol: 'roundRect',
    symbolSize: [120, 18],
    animation: false,
    legendHoverLink: false,
    itemStyle: {
        color: TRANSPARENT_COLOR,
        borderColor: TRANSPARENT_COLOR,
    },
    label: {
        show: true,
        position: 'inside',
        color: HIGHLIGHT_COLOR,
        fontSize: 10,
        formatter: '{b}',
        padding: [2, 4],
    },
    emphasis: {
        scale: false,
    },
    tooltip: DEFAULT_NOT_SHOW,
    z: 3,
};

export const OVERLAP_CHART_COLORS = [
    '#EB5757',
    '#6FCF97',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#FFD95F',
    '#2D9CDB',
    '#C3A080',
    '#B4B4B4',
    '#6B6B6B',
];

export const OVERLAP_CHART_BASE_OPTION = {
    animation: false,
    backgroundColor: '#2a2a2a',
    color: OVERLAP_CHART_COLORS,
} satisfies EChartsOption;

export const OVERLAP_LEGEND_OPTION = {
    show: true,
    left: 10,
    top: 6,
    itemGap: 15,
    textStyle: LEGEND_TEXT_STYLE,
} satisfies LegendComponentOption;

export const OVERLAP_GRID_OPTION = {
    left: 35,
    right: 18,
    top: 42,
    bottom: 28,
} satisfies GridComponentOption;

export const OVERLAP_TOOLBOX_OPTION = {
    ...DEFAULT_NOT_SHOW,
} satisfies ToolboxComponentOption;

export const OVERLAP_X_AXIS_STATIC_OPTION = {
    type: 'time' as const,
    axisLine: AXIS_LINE_STYLE,
    axisTick: AXIS_LINE_STYLE,
    axisLabel: PANEL_AXIS_LABEL_STYLE,
    splitLine: {
        show: true,
        lineStyle: AXIS_SPLIT_LINE_STYLE,
    },
} satisfies XAXisComponentOption;

export const OVERLAP_Y_AXIS_STATIC_OPTION = {
    type: 'value' as const,
    axisLine: AXIS_LINE_STYLE,
    axisLabel: Y_AXIS_LABEL_STYLE,
    splitLine: {
        show: true,
        lineStyle: AXIS_SPLIT_LINE_STYLE,
    },
    scale: true,
} satisfies YAXisComponentOption;

// The overlap chart has no user-configured axes. This neutral template lets the
// shared y-axis bounds algorithm run without panel-specific settings bleeding in.
export const OVERLAP_AXES_TEMPLATE: PanelAxes = {
    x_axis: {
        show_tickline: true,
        raw_data_pixels_per_tick: 0,
        calculated_data_pixels_per_tick: 0,
    },
    sampling: {
        enabled: false,
        sample_count: 0,
    },
    left_y_axis: {
        zero_base: false,
        show_tickline: true,
        value_range: { min: 0, max: 0 },
        raw_data_value_range: { min: 0, max: 0 },
        upper_control_limit: {
            enabled: false,
            value: 0,
        },
        lower_control_limit: {
            enabled: false,
            value: 0,
        },
    },
    right_y_axis: {
        enabled: false,
        zero_base: false,
        show_tickline: false,
        value_range: { min: 0, max: 0 },
        raw_data_value_range: { min: 0, max: 0 },
        upper_control_limit: {
            enabled: false,
            value: 0,
        },
        lower_control_limit: {
            enabled: false,
            value: 0,
        },
    },
};
