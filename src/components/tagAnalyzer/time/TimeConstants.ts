import { TimeUnit, type IntervalRule, type TimeRangeMs, type TimeUnitOption } from './TimeTypes';

export const SECOND_IN_MS = 1000;
export const MINUTE_IN_MS = 60 * SECOND_IN_MS;
export const HOUR_IN_MS = 60 * MINUTE_IN_MS;
export const DAY_IN_MS = 24 * HOUR_IN_MS;
export const WEEK_IN_MS = 7 * DAY_IN_MS;

export const INTERVAL_RULES: IntervalRule[] = [
    {
        limit: 60 * 60 * 12,
        buildIntervalSpec: (calc) => ({
            type: TimeUnit.Day,
            value: Math.ceil(calc / (60 * 60 * 24)),
        }),
    },
    {
        limit: 60 * 60 * 6,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 12,
        }),
    },
    {
        limit: 60 * 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 6,
        }),
    },
    {
        limit: 60 * 60,
        buildIntervalSpec: (calc) => ({
            type: TimeUnit.Hour,
            value: Math.ceil(calc / (60 * 60)),
        }),
    },
    {
        limit: 60 * 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 1,
        }),
    },
    {
        limit: 60 * 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 30,
        }),
    },
    {
        limit: 60 * 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 20,
        }),
    },
    {
        limit: 60 * 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 15,
        }),
    },
    {
        limit: 60 * 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 10,
        }),
    },
    {
        limit: 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 5,
        }),
    },
    {
        limit: 60,
        buildIntervalSpec: (calc) => ({
            type: TimeUnit.Minute,
            value: Math.ceil(calc / 60),
        }),
    },
    {
        limit: 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 1,
        }),
    },
    {
        limit: 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 30,
        }),
    },
    {
        limit: 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 20,
        }),
    },
    {
        limit: 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 15,
        }),
    },
    {
        limit: 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 10,
        }),
    },
    {
        limit: 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 5,
        }),
    },
];

export const SHIFT_TIME_UNIT_OPTIONS: TimeUnitOption[] = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
    TimeUnit.Day,
].map((unit) => ({
    value: unit,
    label: unit,
    disabled: undefined,
}));

export const EDITOR_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const RELATIVE_TIME_PATTERN = /^(now|last)(?:-(\d+)([smhdwMy]))?$/i;
export const AXIS_SECOND_LABEL_SPAN_MS = 60 * 60 * 1000;
export const AXIS_MINUTE_LABEL_SPAN_MS = 24 * 60 * 60 * 1000;
export const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

export const EMPTY_TIME_RANGE: TimeRangeMs = { startTime: 0, endTime: 0 };

export const NANOSECONDS_PER_MILLISECOND = 1000000;
