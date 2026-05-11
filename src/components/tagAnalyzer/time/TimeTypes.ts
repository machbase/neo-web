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

export type UnixNanoseconds = number;

export type TimeRangeMs = {
    startTime: UnixMilliseconds;
    endTime: UnixMilliseconds;
};

export type TimeRangeNs = {
    startTime: UnixNanoseconds;
    endTime: UnixNanoseconds;
};

export type AbsoluteTimeBoundaryRange = {
    min: AbsoluteTimeBoundary;
    max: AbsoluteTimeBoundary;
};

export type FetchedTimeBoundaryRange = {
    start: AbsoluteTimeBoundaryRange;
    end: AbsoluteTimeBoundaryRange;
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

export type IntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type PanelNavigatorRangePair = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

