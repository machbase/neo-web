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

/**
 * Normalizes a user-facing time unit string into the internal enum value.
 * Intent: Keep interval parsing tolerant of shorthand and canonical unit names.
 * @param {string} unit - The unit string to normalize.
 * @returns {TimeUnit | undefined} The normalized time unit, or undefined when the input is not recognized.
 */
export function normalizeTimeUnit(unit: string): TimeUnit | undefined {
    switch (unit) {
        case 'ms':
        case TimeUnit.Millisecond:
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
        case 'w':
        case TimeUnit.Week:
            return TimeUnit.Week;
        case 'M':
        case TimeUnit.Month:
            return TimeUnit.Month;
        case 'y':
        case TimeUnit.Year:
            return TimeUnit.Year;
        default:
            return undefined;
    }
}

export function normalizeStoredTimeUnit(unit: string): TimeUnit | undefined {
    switch (unit) {
        case 'millisecond':
            return TimeUnit.Millisecond;
        case 'sec':
        case 'second':
            return TimeUnit.Second;
        case 'min':
        case 'minute':
            return TimeUnit.Minute;
        case 'hour':
            return TimeUnit.Hour;
        case 'day':
            return TimeUnit.Day;
        case 'week':
            return TimeUnit.Week;
        case 'month':
            return TimeUnit.Month;
        case 'year':
            return TimeUnit.Year;
        default:
            return normalizeTimeUnit(unit);
    }
}

export function formatTimeUnitShortCode(unit: TimeUnit): string {
    switch (unit) {
        case TimeUnit.Millisecond:
            return 'ms';
        case TimeUnit.Second:
            return 's';
        case TimeUnit.Minute:
            return 'm';
        case TimeUnit.Hour:
            return 'h';
        case TimeUnit.Day:
            return 'd';
        case TimeUnit.Week:
            return 'w';
        case TimeUnit.Month:
            return 'M';
        case TimeUnit.Year:
            return 'y';
    }
}

/**
 * Converts a time unit value into milliseconds.
 * Intent: Provide a shared conversion helper for interval and duration calculations.
 * @param {TimeUnit} type - The unit type to convert.
 * @param {number} value - The numeric unit count to convert.
 * @returns {number} The number of milliseconds represented by the input unit.
 */
export function getTimeUnitMilliseconds(
    type: TimeUnit,
    value: number,
): number {
    switch (type) {
        case TimeUnit.Millisecond:
            return value;
        case TimeUnit.Second:
            return value * SECOND_IN_MS;
        case TimeUnit.Minute:
            return value * MINUTE_IN_MS;
        case TimeUnit.Hour:
            return value * HOUR_IN_MS;
        case TimeUnit.Day:
            return value * DAY_IN_MS;
        case TimeUnit.Week:
            return value * WEEK_IN_MS;
        case TimeUnit.Month:
            return value * MONTH_IN_MS;
        case TimeUnit.Year:
            return value * YEAR_IN_MS;
        default:
            return 0;
    }
}

/**
 * Converts a string unit and value into milliseconds when the unit is supported.
 * Intent: Normalize interval values before they are used by chart interval calculations.
 * @param {string} type - The stored or input unit name to convert.
 * @param {number} value - The unit count to convert.
 * @returns {number} The converted millisecond value, or 0 when the unit is unsupported.
 */
export function getIntervalMs(type: string, value: number): number {
    const sNormalizedType = normalizeStoredTimeUnit(type);

    if (
        !sNormalizedType ||
        sNormalizedType === TimeUnit.Millisecond ||
        sNormalizedType === TimeUnit.Week ||
        sNormalizedType === TimeUnit.Month ||
        sNormalizedType === TimeUnit.Year
    ) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, value);
}
