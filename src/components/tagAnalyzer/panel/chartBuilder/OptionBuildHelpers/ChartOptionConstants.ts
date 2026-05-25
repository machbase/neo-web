import type {
    BrushComponentOption,
    EChartsOption,
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
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
} from '../../../domain/PanelDomain';
import { DEFAULT_SERIES_ANNOTATION_TEXT_COLOR } from '../../../domain/SeriesDomain';

type AxisLineStyleOption = NonNullable<XAXisComponentOption['axisLine']>;
type AxisSplitLineStyleOption = NonNullable<
    NonNullable<XAXisComponentOption['splitLine']>['lineStyle']
>;

const COMPACT_AXIS_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
] as const;
const COMPACT_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});
const STANDARD_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
});

export const PANEL_BACKGROUND = '#252525';
export const PANEL_GRID_SIDE = 35;
export const PANEL_NAVIGATOR_GRID_SIDE = 58;
export const PANEL_LEGEND_TOP = 6;
export const PANEL_HOVER_SYMBOL_SIZE = 6;
export const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;
export const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;
export const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;
export const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;
export const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;
export const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;
export const PANEL_Y_AXIS_SPLIT_COUNT = 5;
export const PANEL_MAIN_GRID_ID = 'panel-main-grid';
export const PANEL_NAVIGATOR_GRID_ID = 'panel-navigator-grid';
export const PANEL_MAIN_X_AXIS_ID = 'panel-main-x-axis';
export const PANEL_NAVIGATOR_X_AXIS_ID = 'panel-navigator-x-axis';
export const PANEL_LEFT_Y_AXIS_ID = 'panel-left-y-axis';
export const PANEL_RIGHT_Y_AXIS_ID = 'panel-right-y-axis';
export const PANEL_NAVIGATOR_Y_AXIS_ID = 'panel-navigator-y-axis';
export const PANEL_INSIDE_DATA_ZOOM_ID = 'panel-inside-data-zoom';
export const PANEL_SLIDER_DATA_ZOOM_ID = 'panel-slider-data-zoom';
export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';
export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';
export const NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID = 'navigator-highlight-overlay';
export const NAVIGATOR_ANNOTATION_LINE_SERIES_ID = 'navigator-annotation-lines';
export const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
export const ANNOTATION_LABEL_SERIES_ID_PREFIX = 'annotation-label-series-';
export const HIGHLIGHT_COLOR = DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR;
export const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';
export const ANNOTATION_LABEL_TEXT_COLOR = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR;
export const ANNOTATION_GUIDE_LINE_OPACITY = 1;
export const ANNOTATION_GUIDE_LINE_WIDTH = 2;
export const ANNOTATION_LABEL_BORDER_WIDTH = 2;
export const ANNOTATION_LABEL_FONT_SIZE = 11;

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
        color: 'rgba(68, 170, 213, 0.28)',
        borderColor: 'rgba(68, 170, 213, 0.85)',
        borderWidth: 2,
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
    formatter: formatYAxisLabel,
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
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
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
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
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

function formatYAxisLabel(value: string | number): string {
    const sNumericValue = Number(value);

    if (!Number.isFinite(sNumericValue)) {
        return String(value);
    }

    const sNormalizedValue = Object.is(sNumericValue, -0) ? 0 : sNumericValue;
    const sAbsoluteValue = Math.abs(sNormalizedValue);
    const sUnitIndex = COMPACT_AXIS_UNITS.findIndex(
        (unit) => sAbsoluteValue >= unit.value,
    );

    if (sUnitIndex === -1) {
        return STANDARD_AXIS_NUMBER_FORMATTER.format(sNormalizedValue);
    }

    const sUnit = COMPACT_AXIS_UNITS[
        shouldUseNextLargerUnit(sAbsoluteValue, sUnitIndex)
            ? sUnitIndex - 1
            : sUnitIndex
    ];

    return `${COMPACT_AXIS_NUMBER_FORMATTER.format(
        sNormalizedValue / sUnit.value,
    )}${sUnit.suffix}`;
}

function shouldUseNextLargerUnit(
    absoluteValue: number,
    unitIndex: number,
): boolean {
    if (unitIndex <= 0) {
        return false;
    }

    const sRoundedScaledValue =
        Math.round((absoluteValue / COMPACT_AXIS_UNITS[unitIndex].value) * 10) / 10;

    return sRoundedScaledValue >= 1000;
}
