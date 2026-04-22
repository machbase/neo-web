import type { SeriesConfig } from './series/seriesTypes';
import type { TimeRangeConfig, TimeRangeMs, TimeRangePair, ValueRange } from './time/timeTypes';

export type PanelMeta = {
    index_key: string;
    chart_title: string;
};

export type PanelData = {
    tag_set: SeriesConfig[];
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
    chart_type: string;
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

