// Used by TagAnalyzer panel code to type yes or no flags.
export type TagAnalyzerYN = 'Y' | 'N';

// Used by TagAnalyzer panel code to type raw range values before time normalization.
export type TagAnalyzerInputRangeValue = string | number | '';

// Used by TagAnalyzer panel code to type normalized start and end time ranges.
export type TimeRange = {
    startTime: number;
    endTime: number;
};
// Used by TagAnalyzer panel code to type two-number chart point tuples.
export type Range = [number, number];

// Used by TagAnalyzer panel code to type numeric min and max ranges.
export type TagAnalyzerDefaultRange = {
    min: number;
    max: number;
};

// Used by TagAnalyzer panel code to type fetched begin and end boundary ranges.
export type TagAnalyzerBgnEndTimeRange = {
    bgn: TagAnalyzerDefaultRange;
    end: TagAnalyzerDefaultRange;
};
// Used by TagAnalyzer panel code to type interval option.
export type TagAnalyzerIntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

// Used by TagAnalyzer panel code to type global time range state.
export type TagAnalyzerGlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: TagAnalyzerIntervalOption;
};

// Used by TagAnalyzer panel code to type panel time keeper.
export type TagAnalyzerPanelTimeKeeper = {
    panelRange: TimeRange;
    navigatorRange: TimeRange;
};



// Used by TagAnalyzer panel code to type series columns.
export type TagAnalyzerSeriesColumns = {
    name?: string;
    time?: string;
    value?: string;
    [key: string]: unknown;
};

// Used by TagAnalyzer panel code to type series config.
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

// Used by TagAnalyzer panel code to type tag columns.
export type TagAnalyzerTagColumns = TagAnalyzerSeriesColumns;
// Used by TagAnalyzer panel code to type tag item.
export type TagAnalyzerTagItem = TagAnalyzerSeriesConfig;

// Used by TagAnalyzer panel code to type panel meta.
export type TagAnalyzerPanelMeta = {
    index_key: string;
    chart_title: string;
};

// Used by TagAnalyzer panel code to type panel data.
export type TagAnalyzerPanelData = {
    tag_set: TagAnalyzerSeriesConfig[];
    raw_keeper?: boolean;
    count?: number;
    interval_type?: string;
};

// Used by TagAnalyzer panel code to type panel time.
export type TagAnalyzerPanelTime = {
    range_bgn: TagAnalyzerInputRangeValue;
    range_end: TagAnalyzerInputRangeValue;
    use_time_keeper: TagAnalyzerYN;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
    default_range?: TagAnalyzerDefaultRange;
};

// Used by TagAnalyzer panel code to type panel axes.
export type TagAnalyzerPanelAxes = {
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    primaryRange: TagAnalyzerDefaultRange;
    primaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl: TagAnalyzerYN;
    ucl_value: number;
    use_lcl: TagAnalyzerYN;
    lcl_value: number;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    secondaryRange: TagAnalyzerDefaultRange;
    secondaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number;
};

// Used by TagAnalyzer panel code to type panel display.
export type TagAnalyzerPanelDisplay = {
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number;
    fill: number;
    stroke: number;
};

// Used by TagAnalyzer panel code to type flat panel info.
export type TagAnalyzerFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: TagAnalyzerSeriesConfig[];
    range_bgn: TagAnalyzerInputRangeValue;
    range_end: TagAnalyzerInputRangeValue;
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

// Used by TagAnalyzer panel code to type panel info.
export type TagAnalyzerPanelInfo = {
    meta: TagAnalyzerPanelMeta;
    data: TagAnalyzerPanelData;
    time: TagAnalyzerPanelTime;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    use_normalize?: TagAnalyzerYN;
};

// Used by TagAnalyzer panel code to type chart series item.
export type TagAnalyzerChartSeriesItem = {
    name: string;
    data: Range[];
    yAxis: number;
    marker?: {
        symbol?: string;
        lineColor?: string | null;
        lineWidth?: number;
    };
    color?: string;
    [key: string]: unknown;
};

// Used by TagAnalyzer panel code to type chart row.
export type TagAnalyzerChartRow = Range;

// Used by TagAnalyzer panel code to type chart data.
export type TagAnalyzerChartData = {
    datasets: TagAnalyzerChartSeriesItem[];
};

// Used by TagAnalyzer panel code to type min max item.
export type TagAnalyzerMinMaxItem = {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
};

// Used by TagAnalyzer panel code to type overlap panel info.
export type TagAnalyzerOverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: TagAnalyzerPanelInfo;
};

// Used by TagAnalyzer panel code to type time conversion target.
export type TagAnalyzerTimeConversionTarget = {
    range_bgn: TagAnalyzerInputRangeValue;
    range_end: TagAnalyzerInputRangeValue;
    tag_set: TagAnalyzerSeriesConfig[];
};
