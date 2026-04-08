export type TagAnalyzerYN = 'Y' | 'N';

export type TagAnalyzerRangeValue = string | number | '';

export type TagAnalyzerTimeRange = {
    startTime: number;
    endTime: number;
};

export type TagAnalyzerBgnEndTimeRange = {
    bgn_min: number;
    bgn_max: number;
    end_min: number;
    end_max: number;
};

export type TagAnalyzerIntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type TagAnalyzerGlobalTimeRangeState = {
    data: TagAnalyzerTimeRange;
    navigator: TagAnalyzerTimeRange;
    interval: TagAnalyzerIntervalOption;
};

export type TagAnalyzerPanelTimeKeeper = {
    startPanelTime: number;
    endPanelTime: number;
    startNaviTime: number;
    endNaviTime: number;
};

export type TagAnalyzerDefaultRange = {
    min: number;
    max: number;
};

export type TagAnalyzerSeriesColumns = {
    name?: string;
    time?: string;
    value?: string;
    [key: string]: unknown;
};

export type TagAnalyzerSeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: TagAnalyzerYN;
    id?: string;
    onRollup?: unknown;
    colName?: TagAnalyzerSeriesColumns;
    [key: string]: unknown;
};

export type TagAnalyzerTagColumns = TagAnalyzerSeriesColumns;
export type TagAnalyzerTagItem = TagAnalyzerSeriesConfig;

export type TagAnalyzerPanelMeta = {
    index_key: string;
    chart_title: string;
};

export type TagAnalyzerPanelData = {
    tag_set: TagAnalyzerSeriesConfig[];
    raw_keeper?: boolean;
    count?: number;
    interval_type?: string;
};

export type TagAnalyzerPanelTime = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    use_time_keeper: TagAnalyzerYN;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
    default_range?: TagAnalyzerDefaultRange;
};

export type TagAnalyzerPanelAxes = {
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    custom_min: number;
    custom_max: number;
    custom_drilldown_min: number;
    custom_drilldown_max: number;
    use_ucl: TagAnalyzerYN;
    ucl_value: number;
    use_lcl: TagAnalyzerYN;
    lcl_value: number;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    custom_min2: number;
    custom_max2: number;
    custom_drilldown_min2: number;
    custom_drilldown_max2: number;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number;
};

export type TagAnalyzerPanelDisplay = {
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number;
    fill: number;
    stroke: number;
};

export type TagAnalyzerFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: TagAnalyzerSeriesConfig[];
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    raw_keeper?: boolean;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
    default_range?: TagAnalyzerDefaultRange;
    count?: number;
    interval_type?: string;
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    use_normalize?: TagAnalyzerYN;
    use_time_keeper: TagAnalyzerYN;
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: TagAnalyzerYN;
    ucl_value: number | string;
    use_lcl: TagAnalyzerYN;
    lcl_value: number | string;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number | string;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number | string;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
    [key: string]: unknown;
};

export type TagAnalyzerPanelInfo = {
    meta: TagAnalyzerPanelMeta;
    data: TagAnalyzerPanelData;
    time: TagAnalyzerPanelTime;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    use_normalize?: TagAnalyzerYN;
};

export type TagAnalyzerChartSeriesItem = {
    name: string;
    data: Array<[number, number]>;
    yAxis: number;
    marker?: {
        symbol?: string;
        lineColor?: string | null;
        lineWidth?: number;
    };
    color?: string;
    [key: string]: unknown;
};

export type TagAnalyzerChartRow = [number, number];

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

export type TagAnalyzerTimeConversionTarget = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    tag_set: TagAnalyzerSeriesConfig[];
};
