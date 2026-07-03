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

// A range stored as raw expression strings (the source of truth), resolved to
// a concrete TimeRangeMs at runtime. The vocabulary depends on where it is used:
//   - board time range and datetime-axis panels: "now", "now-1h", "last",
//     "last-2d", an absolute "YYYY-MM-DD HH:mm:ss", or "" (empty).
//     (see TimeRangeInputResolver)
//   - numeric-axis panels: a plain number ("20", "-3.5"), a data anchor
//     ("first", "first-10" = data start + 10, "last", "last-10" = data end
//     - 10), or "" (empty). (see panelRange/PanelRangeInput)
export type TimeRangeInput = {
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

