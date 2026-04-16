import type { TagAnalyzerIntervalOption } from './CommonType';
import { TagAnalyzerTimeUnit } from './CommonType';

export type TagAnalyzerTimeUnitOption = {
    value: TagAnalyzerTimeUnit;
    label: TagAnalyzerTimeUnit;
    disabled: undefined;
};

type IntervalSpec = {
    type:
        | TagAnalyzerTimeUnit.Second
        | TagAnalyzerTimeUnit.Minute
        | TagAnalyzerTimeUnit.Hour
        | TagAnalyzerTimeUnit.Day;
    value: number;
};

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const WEEK_IN_MS = 7 * DAY_IN_MS;

export const TAG_ANALYZER_SHIFT_TIME_UNIT_OPTIONS: TagAnalyzerTimeUnitOption[] = [
    TagAnalyzerTimeUnit.Millisecond,
    TagAnalyzerTimeUnit.Second,
    TagAnalyzerTimeUnit.Minute,
    TagAnalyzerTimeUnit.Hour,
    TagAnalyzerTimeUnit.Day,
].map((aUnit) => ({
    value: aUnit,
    label: aUnit,
    disabled: undefined,
}));

const INTERVAL_RULES: Array<{
    limit: number;
    spec: (calc: number) => IntervalSpec;
}> = [
    {
        limit: 60 * 60 * 12,
        spec: (calc) => ({
            type: TagAnalyzerTimeUnit.Day,
            value: Math.ceil(calc / (60 * 60 * 24)),
        }),
    },
    {
        limit: 60 * 60 * 6,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Hour,
            value: 12,
        }),
    },
    {
        limit: 60 * 60 * 3,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Hour,
            value: 6,
        }),
    },
    {
        limit: 60 * 60,
        spec: (calc) => ({
            type: TagAnalyzerTimeUnit.Hour,
            value: Math.ceil(calc / (60 * 60)),
        }),
    },
    {
        limit: 60 * 30,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Hour,
            value: 1,
        }),
    },
    {
        limit: 60 * 20,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 30,
        }),
    },
    {
        limit: 60 * 15,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 20,
        }),
    },
    {
        limit: 60 * 10,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 15,
        }),
    },
    {
        limit: 60 * 5,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 10,
        }),
    },
    {
        limit: 60 * 3,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 5,
        }),
    },
    {
        limit: 60,
        spec: (calc) => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: Math.ceil(calc / 60),
        }),
    },
    {
        limit: 30,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Minute,
            value: 1,
        }),
    },
    {
        limit: 20,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Second,
            value: 30,
        }),
    },
    {
        limit: 15,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Second,
            value: 20,
        }),
    },
    {
        limit: 10,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Second,
            value: 15,
        }),
    },
    {
        limit: 5,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Second,
            value: 10,
        }),
    },
    {
        limit: 3,
        spec: () => ({
            type: TagAnalyzerTimeUnit.Second,
            value: 5,
        }),
    },
];

export function normalizeTagAnalyzerTimeUnit(
    aUnit: string,
): TagAnalyzerTimeUnit | undefined {
    switch (aUnit.toLowerCase()) {
        case 'ms':
            return TagAnalyzerTimeUnit.Millisecond;
        case 's':
        case TagAnalyzerTimeUnit.Second:
            return TagAnalyzerTimeUnit.Second;
        case 'm':
        case TagAnalyzerTimeUnit.Minute:
            return TagAnalyzerTimeUnit.Minute;
        case 'h':
        case TagAnalyzerTimeUnit.Hour:
            return TagAnalyzerTimeUnit.Hour;
        case 'd':
        case TagAnalyzerTimeUnit.Day:
            return TagAnalyzerTimeUnit.Day;
        case TagAnalyzerTimeUnit.Week:
            return TagAnalyzerTimeUnit.Week;
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
    return normalizeTagAnalyzerTimeUnit(aUnit) ?? aUnit;
}

/**
 * Converts one shared time-unit value into milliseconds.
 * @param aType The time unit to convert.
 * @param aValue The unit magnitude.
 * @returns The interval length in milliseconds.
 */
export function getTimeUnitMilliseconds(
    aType: TagAnalyzerTimeUnit,
    aValue: number,
): number {
    switch (aType) {
        case TagAnalyzerTimeUnit.Millisecond:
            return aValue;
        case TagAnalyzerTimeUnit.Second:
            return aValue * SECOND_IN_MS;
        case TagAnalyzerTimeUnit.Minute:
            return aValue * MINUTE_IN_MS;
        case TagAnalyzerTimeUnit.Hour:
            return aValue * HOUR_IN_MS;
        case TagAnalyzerTimeUnit.Day:
            return aValue * DAY_IN_MS;
        case TagAnalyzerTimeUnit.Week:
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
    const sNormalizedType = normalizeTagAnalyzerTimeUnit(aType);

    if (
        !sNormalizedType ||
        sNormalizedType === TagAnalyzerTimeUnit.Millisecond ||
        sNormalizedType === TagAnalyzerTimeUnit.Week
    ) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, aValue);
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
): TagAnalyzerIntervalOption {
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
        return rule.spec(calc);
    }

    return {
        type: TagAnalyzerTimeUnit.Second,
        value: Math.ceil(calc),
    };
}
