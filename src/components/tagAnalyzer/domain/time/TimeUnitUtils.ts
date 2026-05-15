import {
    DAY_IN_MS,
    HOUR_IN_MS,
    MINUTE_IN_MS,
    MONTH_IN_MS,
    SECOND_IN_MS,
    WEEK_IN_MS,
    YEAR_IN_MS,
} from './TimeConstants';
import { TimeUnit } from './TimeTypes';

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

export const SHIFT_TIME_UNIT_OPTIONS = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
    TimeUnit.Day,
    TimeUnit.Week,
    TimeUnit.Month,
    TimeUnit.Year,
].map((unit) => ({
    value: unit,
    label: formatTimeUnitShortCode(unit),
    disabled: undefined,
})) satisfies Array<{
    value: TimeUnit;
    label: string;
    disabled: undefined;
}>;

export function getTimeUnitMilliseconds(
    type: TimeUnit,
    value: number,
): number {
    const sMilliseconds = TIME_UNIT_MILLISECONDS[type];
    return sMilliseconds === undefined ? 0 : value * sMilliseconds;
}
