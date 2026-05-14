import type { PanelSeriesDefinition } from './SeriesModel';
import type { ValueRange } from './ValueRangeModel';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from './time/TimeTypes';

export const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

export const DEFAULT_PANEL_ECHART_TYPE: PanelEChartType = 'Line';

const PANEL_ECHART_TYPE_LOOKUP: Record<PanelEChartType, true> = {
    Line: true,
    Zone: true,
    Dot: true,
};
export function isPanelEChartType(value: unknown): value is PanelEChartType {
    return typeof value === 'string' && value in PANEL_ECHART_TYPE_LOOKUP;
}
export function normalizePanelEChartType(value: unknown): PanelEChartType {
    return isPanelEChartType(value) ? value : DEFAULT_PANEL_ECHART_TYPE;
}

export type PanelMeta = {
    index_key: string;
    chart_title: string;
};

export type PanelData = {
    tag_set: PanelSeriesDefinition[];
    count: number;
    interval_type: string | undefined;
};

export type PanelToolbarConfig = {
    isRaw: boolean;
};

export type PanelTime = {
    rangeConfig: TimeRangeConfig;
    useTimeKeeper: boolean;
    timeKeeper: Partial<PanelNavigatorRangePair> | undefined;
};

export type PanelAxisThreshold = {
    enabled: boolean;
    value: number;
};

export type PanelXAxis = {
    show_tickline: boolean;
    raw_data_pixels_per_tick: number;
    calculated_data_pixels_per_tick: number;
};

export type PanelSampling = {
    enabled: boolean;
    sample_count: number;
};

export type PanelYAxis = {
    zero_base: boolean;
    show_tickline: boolean;
    value_range: ValueRange;
    raw_data_value_range: ValueRange;
    upper_control_limit: PanelAxisThreshold;
    lower_control_limit: PanelAxisThreshold;
};

export type PanelAxes = {
    x_axis: PanelXAxis;
    sampling: PanelSampling;
    main_chart_sampling: PanelSampling;
    left_y_axis: PanelYAxis;
    right_y_axis: PanelYAxis;
    right_y_axis_enabled: boolean;
};

export type PanelDisplay = {
    show_legend: boolean;
    use_zoom: boolean;
    chart_type: PanelEChartType;
    show_point: boolean;
    point_radius: number;
    fill: number;
    stroke: number;
};

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';

export type PanelHighlight = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
};

export type PanelHighlightInput = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor?: string | undefined;
    textColor?: string | undefined;
};

export function normalizePanelHighlight(highlight: PanelHighlightInput): PanelHighlight {
    return {
        text: highlight.text,
        timeRange: { ...highlight.timeRange },
        fillColor: highlight.fillColor ?? DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
        textColor: highlight.textColor ?? DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    };
}

export type PanelInfo = {
    meta: PanelMeta;
    data: PanelData;
    toolbar: PanelToolbarConfig;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
    use_normalize: boolean;
    highlights: PanelHighlight[];
};

