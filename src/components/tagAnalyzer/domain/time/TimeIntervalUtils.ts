import { TimeUnit, type IntervalOption } from './TimeTypes';
import {
    getTimeUnitMilliseconds,
    normalizeStoredTimeUnit,
} from './TimeUnitUtils';

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

    return calculatePixelLimitedCount(chartWidth, sPixelsPerTick);
}

export function hasResolvedIntervalOption(
    intervalOption: IntervalOption | undefined,
): intervalOption is IntervalOption {
    if (!intervalOption) {
        return false;
    }

    return intervalOption.IntervalType !== '' && intervalOption.IntervalValue > 0;
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

function calculatePixelLimitedCount(chartWidth: number, pixelsPerTick: number): number {
    return Math.ceil(chartWidth / (pixelsPerTick > 0 ? pixelsPerTick : 1));
}
