import type { PanelSeriesConfig } from './series/PanelSeriesTypes';
import type { ValueRange } from '../TagAnalyzerCommonTypes';
import type { TimeRangeConfig, TimeRangeMs, TimeRangePair } from './time/types/TimeTypes';

export const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

export const DEFAULT_PANEL_ECHART_TYPE: PanelEChartType = 'Line';

const PANEL_ECHART_TYPE_LOOKUP: Record<PanelEChartType, true> = {
    Line: true,
    Zone: true,
    Dot: true,
};

/**
 * Checks whether a saved chart type is one of the supported TagAnalyzer ECharts styles.
 * Intent: Keep persistence boundary parsing explicit before writing into PanelDisplay.
 * @param {unknown} aValue The chart type value to inspect.
 * @returns {boolean} True when the value is a supported chart type.
 */
export function isPanelEChartType(aValue: unknown): aValue is PanelEChartType {
    return typeof aValue === 'string' && aValue in PANEL_ECHART_TYPE_LOOKUP;
}

/**
 * Converts an unknown persisted chart type into a supported TagAnalyzer ECharts style.
 * Intent: Prevent arbitrary saved strings from leaking into runtime display config.
 * @param {unknown} aValue The persisted chart type value.
 * @returns {PanelEChartType} The normalized chart type.
 */
export function normalizePanelEChartType(aValue: unknown): PanelEChartType {
    return isPanelEChartType(aValue) ? aValue : DEFAULT_PANEL_ECHART_TYPE;
}

export type PanelMeta = {
    index_key: string;
    chart_title: string;
};

export type PanelData = {
    tag_set: PanelSeriesConfig[];
    raw_keeper: boolean;
    count: number;
    interval_type: string | undefined;
};

export type PanelTime = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
    default_range: ValueRange | undefined;
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

export type PanelRightYAxis = PanelYAxis & {
    enabled: boolean;
};

export type PanelAxes = {
    x_axis: PanelXAxis;
    sampling: PanelSampling;
    left_y_axis: PanelYAxis;
    right_y_axis: PanelRightYAxis;
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

export type PanelHighlight = {
    text: string;
    timeRange: TimeRangeMs;
};

export type PanelInfo = {
    meta: PanelMeta;
    data: PanelData;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
    use_normalize: boolean;
    highlights: PanelHighlight[];
};

