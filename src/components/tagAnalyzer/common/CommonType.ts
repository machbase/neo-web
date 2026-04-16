import type { LegacyTimeRange } from '../utils/legacy/LegacyTimeRangeTypes';

export enum TagAnalyzerTimeUnit {
    Millisecond = 'ms',
    Second = 'sec',
    Minute = 'min',
    Hour = 'hour',
    Day = 'day',
    Week = 'week',
}

export type TimeRange = {
    startTime: number;
    endTime: number;
};

export type TagAnalyzerDefaultRange = {
    min: number;
    max: number;
};

export type TagAnalyzerBgnEndTimeRange = {
    bgn: TagAnalyzerDefaultRange;
    end: TagAnalyzerDefaultRange;
};

export type TagAnalyzerIntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type TagAnalyzerGlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: TagAnalyzerIntervalOption;
};

export type TagAnalyzerPanelTimeKeeper = {
    panelRange: TimeRange;
    navigatorRange: TimeRange;
};

export type TagAnalyzerSeriesColumns = {
    name: string | undefined;
    time: string | undefined;
    value: string | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerSeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: boolean;
    id: string | undefined;
    onRollup: boolean | undefined;
    colName: TagAnalyzerSeriesColumns | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerPanelMeta = {
    index_key: string;
    chart_title: string;
};

export type TagAnalyzerPanelData = {
    tag_set: TagAnalyzerSeriesConfig[];
    raw_keeper: boolean | undefined;
    count: number | undefined;
    interval_type: string | undefined;
};

export type TagAnalyzerPanelTime = {
    range_bgn: number;
    range_end: number;
    legacy_range: LegacyTimeRange | undefined;
    use_time_keeper: boolean;
    time_keeper: Partial<TagAnalyzerPanelTimeKeeper> | undefined;
    default_range: TagAnalyzerDefaultRange | undefined;
};

export type TagAnalyzerPanelAxes = {
    show_x_tickline: boolean;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: boolean;
    show_y_tickline: boolean;
    primaryRange: TagAnalyzerDefaultRange;
    primaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl: boolean;
    ucl_value: number;
    use_lcl: boolean;
    lcl_value: number;
    use_right_y2: boolean;
    zero_base2: boolean;
    show_y_tickline2: boolean;
    secondaryRange: TagAnalyzerDefaultRange;
    secondaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl2: boolean;
    ucl2_value: number;
    use_lcl2: boolean;
    lcl2_value: number;
};

export type TagAnalyzerPanelDisplay = {
    show_legend: boolean;
    use_zoom: boolean;
    chart_type: string;
    show_point: boolean;
    point_radius: number;
    fill: number;
    stroke: number;
};

export type TagAnalyzerPanelInfo = {
    meta: TagAnalyzerPanelMeta;
    data: TagAnalyzerPanelData;
    time: TagAnalyzerPanelTime;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    use_normalize: boolean;
};

export type TagAnalyzerChartRow = [number, number];

export type TagAnalyzerChartSeriesItem = {
    name: string;
    data: TagAnalyzerChartRow[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerChartData = {
    datasets: TagAnalyzerChartSeriesItem[];
};

export type TagAnalyzerMinMaxItem = {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
};

export type TagAnalyzerOverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: TagAnalyzerPanelInfo;
};
