import type { SeriesConfig } from './series/seriesTypes';
import type { TimeRangeConfig, TimeRangePair, ValueRange } from './time/timeTypes';

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

export type PanelAxes = {
    show_x_tickline: boolean;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: boolean;
    show_y_tickline: boolean;
    primaryRange: ValueRange;
    primaryDrilldownRange: ValueRange;
    use_ucl: boolean;
    ucl_value: number;
    use_lcl: boolean;
    lcl_value: number;
    use_right_y2: boolean;
    zero_base2: boolean;
    show_y_tickline2: boolean;
    secondaryRange: ValueRange;
    secondaryDrilldownRange: ValueRange;
    use_ucl2: boolean;
    ucl2_value: number;
    use_lcl2: boolean;
    lcl2_value: number;
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

export type PanelInfo = {
    meta: PanelMeta;
    data: PanelData;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
    use_normalize: boolean;
};
