// --- Core range types --------------------------------------------------------

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

export type AxisRange = {
    startTime: number;
    endTime: number;
};

/** A concrete main/navigator range pair. */
export type PanelRangeState = {
    panelRange: AxisRange;
    navigatorRange: AxisRange;
};

// A range stored as raw expression strings (the source of truth), resolved to
// concrete x-axis bounds at runtime. The vocabulary depends on where it is used:
//   - board time range and datetime-axis panels: "now", "now-1h", "first",
//     "first+2d", "last", "last-2d", an absolute "YYYY-MM-DD HH:mm:ss",
//     or "" (empty).
//     (see format/timeRangeFormat.ts)
//   - board numeric range and numeric-axis panels: a plain number ("20", "-3.5"),
//     a data anchor
//     ("first", "first-10" = data start + 10, "last", "last-10" = data end
//     - 10), or "" (empty). (see format/numericRangeFormat.ts)
export type RangeExpressionInput = {
    start: string;
    end: string;
};

export function isRangeExpressionEmpty(range: RangeExpressionInput): boolean {
    return range.start.trim() === '' && range.end.trim() === '';
}

export type IntervalOption = {
    IntervalType: TimeUnit;
    IntervalValue: number;
};

export type AxisKind = 'time' | 'numeric';

// --- Numeric interval and axis bounds ----------------------------------------

const NUMERIC_INTERVAL_STEPS = [1, 2, 5, 10] as const;

export function resolveNumericIntervalValue(
    rangeWidth: number,
    targetCount: number,
): number {
    if (
        !Number.isFinite(rangeWidth) ||
        !Number.isFinite(targetCount) ||
        rangeWidth <= 0 ||
        targetCount <= 0
    ) {
        return 0;
    }

    const sRawInterval = rangeWidth / targetCount;
    return Math.max(
        1,
        Number.isFinite(sRawInterval)
            ? Number(getNiceNumericStep(sRawInterval).toPrecision(12))
            : 0,
    );
}

export function roundNumericAxisBounds(
    axisBounds: number[],
    splitCount: number,
): void {
    const sRawMin = axisBounds[0];
    const sRawMax = axisBounds[1];

    if (sRawMin === undefined || sRawMax === undefined) {
        return;
    }

    const sRange = sRawMax - sRawMin;
    const sFallbackRange = Math.max(Math.abs(sRawMax), Math.abs(sRawMin), 1);
    const sReferenceValue = Math.max(
        Math.abs(sRange > 0 ? sRange : sFallbackRange) / splitCount,
        Number.MIN_VALUE,
    );
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

// --- Time intervals ----------------------------------------------------------

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

const TIME_UNIT_BY_INPUT = new Map<string, TimeUnit>(
    Object.entries(TIME_UNIT_SHORT_CODES).flatMap(([unit, shortCode]) => [
        [unit, unit as TimeUnit] as const,
        [shortCode, unit as TimeUnit] as const,
    ]),
);

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

export function normalizeTimeUnit(unit: string): TimeUnit | undefined {
    return TIME_UNIT_BY_INPUT.get(unit);
}

export function normalizeStoredTimeUnit(unit: string): TimeUnit | undefined {
    if (unit === 'second') return TimeUnit.Second;
    if (unit === 'minute') return TimeUnit.Minute;
    return normalizeTimeUnit(unit);
}

export function formatTimeUnitShortCode(unit: TimeUnit): string {
    return TIME_UNIT_SHORT_CODES[unit];
}

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

type IntervalValue = number | ((calculatedSeconds: number) => number);

const INTERVAL_RULES = [
    [60 * 60 * 12, TimeUnit.Day, (calc) => Math.ceil(calc / (60 * 60 * 24))],
    [60 * 60 * 6, TimeUnit.Hour, 12],
    [60 * 60 * 3, TimeUnit.Hour, 6],
    [60 * 60, TimeUnit.Hour, (calc) => Math.ceil(calc / (60 * 60))],
    [60 * 30, TimeUnit.Hour, 1],
    [60 * 20, TimeUnit.Minute, 30],
    [60 * 15, TimeUnit.Minute, 20],
    [60 * 10, TimeUnit.Minute, 15],
    [60 * 5, TimeUnit.Minute, 10],
    [60 * 3, TimeUnit.Minute, 5],
    [60, TimeUnit.Minute, (calc) => Math.ceil(calc / 60)],
    [30, TimeUnit.Minute, 1],
    [20, TimeUnit.Second, 30],
    [15, TimeUnit.Second, 20],
    [10, TimeUnit.Second, 15],
    [5, TimeUnit.Second, 10],
    [3, TimeUnit.Second, 5],
] satisfies Array<readonly [number, CalculatedIntervalUnit, IntervalValue]>;

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
    const sSeconds = Math.floor(sDiff / 1000);
    const sCalc = sSeconds / (width / pixelsPerTick);
    const sRule = INTERVAL_RULES.find(([limit]) => sCalc > limit);
    const sRuleValue = sRule?.[2];
    const sIntervalValue = typeof sRuleValue === 'function'
        ? sRuleValue(sCalc)
        : sRuleValue ?? Math.ceil(sCalc);

    return {
        IntervalType: sRule?.[1] ?? TimeUnit.Second,
        IntervalValue: sIntervalValue < 1 ? 1 : sIntervalValue,
    };
}

export function getIntervalMs(type: string, value: number): number {
    const sNormalizedType = normalizeStoredTimeUnit(type);

    if (!sNormalizedType || !FETCH_INTERVAL_UNITS.has(sNormalizedType)) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, value);
}
