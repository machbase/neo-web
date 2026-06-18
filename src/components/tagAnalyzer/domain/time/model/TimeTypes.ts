export enum TimeUnit {
    Millisecond = 'millisecond',
    Second = 'sec',
    Minute = 'min',
    Hour = 'hour',
    Day = 'day',
    Week = 'week',
    Month = 'month',
    Year = 'year',
}

export type UnixMilliseconds = number;

type UnixNanoseconds = number;

export type TimeRangeMs = {
    startTime: UnixMilliseconds;
    endTime: UnixMilliseconds;
};

export type AxisRange = {
    startTime: number;
    endTime: number;
};

export type TimeRangeNs = {
    startTime: UnixNanoseconds;
    endTime: UnixNanoseconds;
};

export type EmptyTimeBoundary = {
    kind: 'empty';
};

export type AbsoluteTimeBoundary = {
    kind: 'absolute';
    timestamp: UnixMilliseconds;
};

export type NowTimeBoundary = {
    kind: 'now';
    amount: number;
    unit: TimeUnit;
};

export type LastTimeBoundary = {
    kind: 'last';
    amount: number;
    unit: TimeUnit;
};

export type TimeBoundary =
    | EmptyTimeBoundary
    | AbsoluteTimeBoundary
    | NowTimeBoundary
    | LastTimeBoundary;

export type TimeRangeConfig = {
    start: TimeBoundary;
    end: TimeBoundary;
};

export type TimestampRangeBoundary =
    | { kind: 'timestamp_empty'; value: number }
    | { kind: 'timestamp_absolute'; value: number }
    | { kind: 'timestamp_now'; value: number }
    | { kind: 'timestamp_data_end'; value: number };

export type NumericRangeBoundary =
    | { kind: 'numeric_empty'; value: number }
    | { kind: 'numeric_value'; value: number }
    | { kind: 'numeric_data_start'; value: number }
    | { kind: 'numeric_data_end'; value: number };

export type PanelRangeBoundary = TimestampRangeBoundary | NumericRangeBoundary;

export type TimestampRangeConfig = {
    start: TimestampRangeBoundary;
    end: TimestampRangeBoundary;
};

export type NumericRangeConfig = {
    start: NumericRangeBoundary;
    end: NumericRangeBoundary;
};

export type PanelRangeConfig = TimestampRangeConfig | NumericRangeConfig;

export type IntervalOption = {
    IntervalType: TimeUnit;
    IntervalValue: number;
};

export type PanelNavigatorRangePair = {
    panelRange: AxisRange;
    navigatorRange: AxisRange;
};

