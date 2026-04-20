import moment from 'moment';
import type { IntervalOption, TimeRange } from './ModelTypes';
import { TimeUnit } from './ModelTypes';

export type TimeUnitOption = {
    value: TimeUnit;
    label: TimeUnit;
    disabled: undefined;
};

type IntervalSpec = {
    type:
        | TimeUnit.Second
        | TimeUnit.Minute
        | TimeUnit.Hour
        | TimeUnit.Day;
    value: number;
};

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const WEEK_IN_MS = 7 * DAY_IN_MS;
const AXIS_SECOND_LABEL_SPAN_MS = HOUR_IN_MS;
const AXIS_MINUTE_LABEL_SPAN_MS = DAY_IN_MS;
const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * DAY_IN_MS;

export const SHIFT_TIME_UNIT_OPTIONS: TimeUnitOption[] = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
    TimeUnit.Day,
].map((aUnit) => ({
    value: aUnit,
    label: aUnit,
    disabled: undefined,
}));

const INTERVAL_RULES: Array<{
    limit: number;
    buildIntervalSpec: (calc: number) => IntervalSpec;
}> = [
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

export function normalizeTimeUnit(
    aUnit: string,
): TimeUnit | undefined {
    switch (aUnit.toLowerCase()) {
        case 'ms':
            return TimeUnit.Millisecond;
        case 's':
        case TimeUnit.Second:
            return TimeUnit.Second;
        case 'm':
        case TimeUnit.Minute:
            return TimeUnit.Minute;
        case 'h':
        case TimeUnit.Hour:
            return TimeUnit.Hour;
        case 'd':
        case TimeUnit.Day:
            return TimeUnit.Day;
        case TimeUnit.Week:
            return TimeUnit.Week;
        default:
            return undefined;
    }
}

/**
 * Normalizes short interval units into the names expected by TagAnalyzer fetch calls.
 * @param aUnit The shorthand interval unit from panel configuration.
 * @returns The normalized interval unit used by fetch helpers.
 */
export function convertIntervalUnit(aUnit: string): string {
    return normalizeTimeUnit(aUnit) ?? aUnit;
}

/**
 * Converts one shared time-unit value into milliseconds.
 * @param aType The time unit to convert.
 * @param aValue The unit magnitude.
 * @returns The interval length in milliseconds.
 */
export function getTimeUnitMilliseconds(
    aType: TimeUnit,
    aValue: number,
): number {
    switch (aType) {
        case TimeUnit.Millisecond:
            return aValue;
        case TimeUnit.Second:
            return aValue * SECOND_IN_MS;
        case TimeUnit.Minute:
            return aValue * MINUTE_IN_MS;
        case TimeUnit.Hour:
            return aValue * HOUR_IN_MS;
        case TimeUnit.Day:
            return aValue * DAY_IN_MS;
        case TimeUnit.Week:
            return aValue * WEEK_IN_MS;
        default:
            return 0;
    }
}

/**
 * Converts an interval option into milliseconds for rollup and fetch calculations.
 * @param aType The normalized interval unit.
 * @param aValue The interval magnitude.
 * @returns The interval length in milliseconds.
 */
export function getIntervalMs(aType: string, aValue: number): number {
    const sNormalizedType = normalizeTimeUnit(aType);

    if (
        !sNormalizedType ||
        sNormalizedType === TimeUnit.Millisecond ||
        sNormalizedType === TimeUnit.Week
    ) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, aValue);
}

/**
 * Chooses a compact axis label format based on the current visible time span.
 * @param aValue The axis timestamp to format.
 * @param aRange The currently visible time range.
 * @returns The formatted axis label.
 */
export function formatAxisTime(aValue: number, aRange: TimeRange): string {
    const sVisibleSpan = aRange.endTime - aRange.startTime;

    if (sVisibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('HH:mm:ss');
    }

    if (sVisibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('HH:mm');
    }

    if (sVisibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('MM-DD HH:mm');
    }

    return moment.utc(aValue).format('YYYY-MM-DD');
}

/**
 * Calculates the fetch interval that best matches the available chart width.
 * @param aBgn The visible range start time.
 * @param aEnd The visible range end time.
 * @param aWidth The current chart width.
 * @param aIsRaw Whether the chart is loading raw data.
 * @param aPixelsPerTick The configured sampled pixels-per-tick value.
 * @param aPixelsPerTickRaw The configured raw-data pixels-per-tick value.
 * @param aIsNavi Whether the calculation is for the navigator chart.
 * @returns The interval option that should be used for the next fetch.
 */
export function calculateInterval(
    aBgn: number,
    aEnd: number,
    aWidth: number,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aIsNavi: boolean | undefined,
): IntervalOption {
    const diff = aEnd - aBgn;
    const second = Math.floor(diff / 1000);
    const pixelsPerTick = aIsRaw && !aIsNavi ? aPixelsPerTickRaw : aPixelsPerTick;
    const calc = second / (aWidth / pixelsPerTick);
    const interval = resolveInterval(calc);
    const intervalValue = interval.value < 1 ? 1 : interval.value;

    return {
        IntervalType: interval.type,
        IntervalValue: intervalValue,
    };
}

function resolveInterval(calc: number): IntervalSpec {
    const rule = INTERVAL_RULES.find(({ limit }) => calc > limit);
    if (rule) {
        return rule.buildIntervalSpec(calc);
    }

    return {
        type: TimeUnit.Second,
        value: Math.ceil(calc),
    };
}
