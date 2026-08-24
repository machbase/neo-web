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

export type IntervalOption = {
    IntervalType: TimeUnit;
    IntervalValue: number;
};

const NUMERIC_INTERVAL_STEPS = [1, 2, 5, 10] as const;

export function resolveNumericIntervalValue(
    rangeWidth: number,
    targetCount: number,
): number {
    return Math.max(
        1,
        Number(
            getNiceNumericStep(rangeWidth / targetCount).toPrecision(12),
        ),
    );
}

export function roundNumericAxisBounds(
    axisBounds: number[],
    splitCount: number,
): void {
    const sRawMin = axisBounds[0];
    const sRawMax = axisBounds[1];
    if (sRawMin === undefined || sRawMax === undefined) return;

    const sRange = sRawMax - sRawMin;
    const sFallbackRange = Math.max(Math.abs(sRawMax), Math.abs(sRawMin), 1);
    const sReferenceValue =
        (sRange > 0 ? sRange : sFallbackRange) / splitCount;
    const sStep = getNiceNumericStep(sReferenceValue);
    const sRoundedMin = Math.floor(sRawMin / sStep) * sStep;
    const sRoundedMax = Math.ceil(sRawMax / sStep) * sStep;

    axisBounds[0] = Number(sRoundedMin.toPrecision(12));
    axisBounds[1] = Number(
        (sRoundedMax > sRoundedMin ? sRoundedMax : sRoundedMin + sStep)
            .toPrecision(12),
    );
}


function getNiceNumericStep(value: number): number {
    const sMagnitude = 10 ** Math.floor(Math.log10(value));
    const sNormalizedValue = value / sMagnitude;
    const sStep =
        NUMERIC_INTERVAL_STEPS.find((step) => sNormalizedValue <= step) ?? 10;

    return sStep * sMagnitude;
}

const TIME_UNIT_MILLISECONDS: Record<TimeUnit, number> = {
    [TimeUnit.Millisecond]: 1,
    [TimeUnit.Second]: 1_000,
    [TimeUnit.Minute]: 60_000,
    [TimeUnit.Hour]: 3_600_000,
    [TimeUnit.Day]: 86_400_000,
    [TimeUnit.Week]: 604_800_000,
    [TimeUnit.Month]: 2_592_000_000,
    [TimeUnit.Year]: 31_536_000_000,
};

export function getTimeUnitMilliseconds(
    type: TimeUnit,
    value: number,
): number {
    return value * TIME_UNIT_MILLISECONDS[type];
}

type CalculatedIntervalUnit =
    | TimeUnit.Second
    | TimeUnit.Minute
    | TimeUnit.Hour
    | TimeUnit.Day;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

const TIME_INTERVAL_STEPS = [
    [1, TimeUnit.Second, 1],
    [2, TimeUnit.Second, 2],
    [5, TimeUnit.Second, 5],
    [10, TimeUnit.Second, 10],
    [15, TimeUnit.Second, 15],
    [30, TimeUnit.Second, 30],
    [SECONDS_PER_MINUTE, TimeUnit.Minute, 1],
    [2 * SECONDS_PER_MINUTE, TimeUnit.Minute, 2],
    [5 * SECONDS_PER_MINUTE, TimeUnit.Minute, 5],
    [10 * SECONDS_PER_MINUTE, TimeUnit.Minute, 10],
    [15 * SECONDS_PER_MINUTE, TimeUnit.Minute, 15],
    [30 * SECONDS_PER_MINUTE, TimeUnit.Minute, 30],
    [SECONDS_PER_HOUR, TimeUnit.Hour, 1],
    [2 * SECONDS_PER_HOUR, TimeUnit.Hour, 2],
    [3 * SECONDS_PER_HOUR, TimeUnit.Hour, 3],
    [6 * SECONDS_PER_HOUR, TimeUnit.Hour, 6],
    [12 * SECONDS_PER_HOUR, TimeUnit.Hour, 12],
    [SECONDS_PER_DAY, TimeUnit.Day, 1],
    [2 * SECONDS_PER_DAY, TimeUnit.Day, 2],
    [5 * SECONDS_PER_DAY, TimeUnit.Day, 5],
    [10 * SECONDS_PER_DAY, TimeUnit.Day, 10],
    [20 * SECONDS_PER_DAY, TimeUnit.Day, 20],
    [50 * SECONDS_PER_DAY, TimeUnit.Day, 50],
] satisfies Array<readonly [number, CalculatedIntervalUnit, number]>;

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
    pixelsPerTick: number,
): IntervalOption {
    const sDiff = endTime - startTime;
    const sTargetSeconds = sDiff / 1000 / (width / pixelsPerTick);

    if (!(sTargetSeconds > 1)) {
        return {
            IntervalType: TimeUnit.Second,
            IntervalValue: 1,
        };
    }

    const sFixedStep = TIME_INTERVAL_STEPS.find(
        ([durationSeconds]) => sTargetSeconds <= durationSeconds,
    );
    if (sFixedStep !== undefined) {
        return {
            IntervalType: sFixedStep[1],
            IntervalValue: sFixedStep[2],
        };
    }

    return {
        IntervalType: TimeUnit.Day,
        IntervalValue: getNiceNumericStep(
            sTargetSeconds / SECONDS_PER_DAY,
        ),
    };
}

export function getIntervalMs(type: TimeUnit, value: number): number {
    if (!FETCH_INTERVAL_UNITS.has(type)) {
        return 0;
    }

    return getTimeUnitMilliseconds(type, value);
}
