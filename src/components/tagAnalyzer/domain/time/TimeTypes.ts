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

export type UnixNanosecondsSql = string;
type SqlTimeRangeValue = number | UnixNanosecondsSql;

export type TimeRangeMs = {
    startTime: UnixMilliseconds;
    endTime: UnixMilliseconds;
};

export type TimeRangeNs = {
    startTime: SqlTimeRangeValue;
    endTime: SqlTimeRangeValue;
};

// Board time range is stored as raw expression strings (the source of truth):
//   "now", "now-1h", "last", "last-2d", an absolute "YYYY-MM-DD HH:mm:ss", or "" (empty).
// These are resolved to concrete TimeRangeMs at runtime (see TimeRangeInputResolver).
export type TimeRangeInput = {
    start: string;
    end: string;
};

// A panel's configured range is stored as raw expression strings (the source of
// truth), interpreted by the panel's x-axis kind at runtime:
//   - datetime axis: same vocabulary as the board time range ("now", "now-1h",
//     "last", "last-2d", an absolute "YYYY-MM-DD HH:mm:ss", or "" empty).
//   - numeric axis: a plain number ("20", "-3.5"), a data anchor ("first",
//     "first-10" = data start + 10, "last", "last-10" = data end - 10), or ""
//     (empty).
// These resolve to a concrete TimeRangeMs at runtime (see PanelRangeInputResolver).
export type PanelRangeInput = {
    start: string;
    end: string;
};

export type IntervalOption = {
    IntervalType: TimeUnit;
    IntervalValue: number;
};

export type PanelViewRange = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

