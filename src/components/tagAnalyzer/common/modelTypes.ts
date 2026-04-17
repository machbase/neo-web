export enum TimeUnit {
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

export type ValueRange = {
    min: number;
    max: number;
};

export type RelativeTimeAnchor = 'now' | 'last';

export type RelativeTimeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

export type EmptyTimeBoundary = {
    kind: 'empty';
};

export type AbsoluteTimeBoundary = {
    kind: 'absolute';
    timestamp: number;
};

export type RelativeTimeBoundary = {
    kind: 'relative';
    anchor: RelativeTimeAnchor;
    amount: number;
    unit: RelativeTimeUnit | undefined;
    expression: string;
};

export type RawTimeBoundary = {
    kind: 'raw';
    value: string;
};

export type TimeBoundary =
    | EmptyTimeBoundary
    | AbsoluteTimeBoundary
    | RelativeTimeBoundary
    | RawTimeBoundary;

export type TimeRangeConfig = {
    start: TimeBoundary;
    end: TimeBoundary;
};

export type ValueRangePair = {
    start: ValueRange;
    end: ValueRange;
};

export type IntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type GlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: IntervalOption;
};

export type TimeRangePair = {
    panelRange: TimeRange;
    navigatorRange: TimeRange;
};

export type SeriesColumns = {
    name: string | undefined;
    time: string | undefined;
    value: string | undefined;
    [key: string]: unknown;
};

export type SeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: boolean;
    id: string | undefined;
    onRollup: boolean | undefined;
    colName: SeriesColumns | undefined;
    [key: string]: unknown;
};

export type PanelMeta = {
    index_key: string;
    chart_title: string;
};

export type PanelData = {
    tag_set: SeriesConfig[];
    raw_keeper: boolean | undefined;
    count: number | undefined;
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

export type ChartRow = [number, number];

export type ChartSeriesItem = {
    name: string;
    data: ChartRow[];
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

export type ChartData = {
    datasets: ChartSeriesItem[];
};

export type MinMaxItem = {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
};

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};
