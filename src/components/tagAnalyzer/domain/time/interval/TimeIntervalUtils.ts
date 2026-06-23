import { TimeUnit, type IntervalOption } from '../model/TimeTypes';
import {
    DAY_IN_MS,
    HOUR_IN_MS,
    MINUTE_IN_MS,
    SECOND_IN_MS,
} from '../model/TimeConstants';

const WEEK_IN_MS = 7 * DAY_IN_MS;
const MONTH_IN_MS = 30 * DAY_IN_MS;
const YEAR_IN_MS = 365 * DAY_IN_MS;

const TIME_UNIT_BY_INPUT: Partial<Record<string, TimeUnit>> = {
    ms: TimeUnit.Millisecond,
    [TimeUnit.Millisecond]: TimeUnit.Millisecond,
    s: TimeUnit.Second,
    [TimeUnit.Second]: TimeUnit.Second,
    m: TimeUnit.Minute,
    [TimeUnit.Minute]: TimeUnit.Minute,
    h: TimeUnit.Hour,
    [TimeUnit.Hour]: TimeUnit.Hour,
    d: TimeUnit.Day,
    [TimeUnit.Day]: TimeUnit.Day,
    w: TimeUnit.Week,
    [TimeUnit.Week]: TimeUnit.Week,
    M: TimeUnit.Month,
    [TimeUnit.Month]: TimeUnit.Month,
    y: TimeUnit.Year,
    [TimeUnit.Year]: TimeUnit.Year,
};

const STORED_TIME_UNIT_BY_INPUT: Partial<Record<string, TimeUnit>> = {
    second: TimeUnit.Second,
    minute: TimeUnit.Minute,
};

const TIME_UNIT_SHORT_CODES: Record<TimeUnit, string> = {
    [TimeUnit.Millisecond]: 'ms',
    [TimeUnit.Second]: 's',
    [TimeUnit.Minute]: 'm',
    [TimeUnit.Hour]: 'h',
    [TimeUnit.Day]: 'd',
    [TimeUnit.Week]: 'w',
    [TimeUnit.Month]: 'M',
    [TimeUnit.Year]: 'y',
};

const TIME_UNIT_MILLISECONDS: Partial<Record<TimeUnit, number>> = {
    [TimeUnit.Millisecond]: 1,
    [TimeUnit.Second]: SECOND_IN_MS,
    [TimeUnit.Minute]: MINUTE_IN_MS,
    [TimeUnit.Hour]: HOUR_IN_MS,
    [TimeUnit.Day]: DAY_IN_MS,
    [TimeUnit.Week]: WEEK_IN_MS,
    [TimeUnit.Month]: MONTH_IN_MS,
    [TimeUnit.Year]: YEAR_IN_MS,
};

export function normalizeTimeUnit(unit: string): TimeUnit | undefined {
    return TIME_UNIT_BY_INPUT[unit];
}

export function normalizeStoredTimeUnit(unit: string): TimeUnit | undefined {
    return STORED_TIME_UNIT_BY_INPUT[unit] ?? normalizeTimeUnit(unit);
}

export function formatTimeUnitShortCode(unit: TimeUnit): string {
    return TIME_UNIT_SHORT_CODES[unit];
}

export function getTimeUnitMilliseconds(
    type: TimeUnit,
    value: number,
): number {
    const sMilliseconds = TIME_UNIT_MILLISECONDS[type];
    return sMilliseconds === undefined ? 0 : value * sMilliseconds;
}

type IntervalSpec = {
    type:
        | TimeUnit.Second
        | TimeUnit.Minute
        | TimeUnit.Hour
        | TimeUnit.Day;
    value: number;
};

const INTERVAL_RULES = [
    {
        limit: 60 * 60 * 12,
        buildIntervalSpec: (calc: number) => ({
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
        buildIntervalSpec: (calc: number) => ({
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
        buildIntervalSpec: (calc: number) => ({
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
] satisfies Array<{
    limit: number;
    buildIntervalSpec: (calc: number) => IntervalSpec;
}>;

const FETCH_INTERVAL_UNITS = new Set<TimeUnit>([
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
    TimeUnit.Day,
]);

export function calculateInterval(
    startTime: number,
    endTime: number,
    width: number,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    isNavigator: boolean | undefined,
): IntervalOption {
    const sDiff = endTime - startTime;
    const sSeconds = Math.floor(sDiff / 1000);
    const sPixelsPerTick = isRaw && !isNavigator ? pixelsPerTickRaw : pixelsPerTick;
    const sCalc = sSeconds / (width / sPixelsPerTick);
    const sInterval = resolveIntervalSpec(sCalc);

    return {
        IntervalType: sInterval.type,
        IntervalValue: sInterval.value < 1 ? 1 : sInterval.value,
    };
}

export function calculateSampleCount(
    limit: number,
    fetchRawMode: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    chartWidth: number,
): number {
    if (limit > 0) {
        return limit;
    }

    const sPixelsPerTick = fetchRawMode ? pixelsPerTickRaw : pixelsPerTick;

    return Math.ceil(chartWidth / (sPixelsPerTick > 0 ? sPixelsPerTick : 1));
}

export function hasResolvedIntervalOption(
    intervalOption: IntervalOption | undefined,
): intervalOption is IntervalOption {
    return intervalOption !== undefined && intervalOption.IntervalValue > 0;
}

export function getIntervalMs(type: string, value: number): number {
    const sNormalizedType = normalizeStoredTimeUnit(type);

    if (!sNormalizedType || !FETCH_INTERVAL_UNITS.has(sNormalizedType)) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, value);
}

function resolveIntervalSpec(calc: number): IntervalSpec {
    const sRule = INTERVAL_RULES.find(({ limit }) => calc > limit);
    if (sRule) {
        return sRule.buildIntervalSpec(calc);
    }

    return {
        type: TimeUnit.Second,
        value: Math.ceil(calc),
    };
}
