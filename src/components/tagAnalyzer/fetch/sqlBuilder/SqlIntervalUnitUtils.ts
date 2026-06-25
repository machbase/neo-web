import { TimeUnit } from '../../domain/time/TimeTypes';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeIntervalUtils';

const ROLLUP_INTERVAL_UNIT_BY_TIME_UNIT: Partial<Record<TimeUnit, string>> = {
    [TimeUnit.Second]: 'SEC',
    [TimeUnit.Minute]: 'MIN',
    [TimeUnit.Hour]: 'HOUR',
    [TimeUnit.Day]: 'DAY',
};

const DATE_BIN_INTERVAL_UNIT_BY_TIME_UNIT: Partial<Record<TimeUnit, string>> = {
    [TimeUnit.Second]: 'second',
    [TimeUnit.Minute]: 'minute',
    [TimeUnit.Hour]: 'hour',
    [TimeUnit.Day]: 'day',
};

const TRUNCATED_INTERVAL_UNIT_BY_TIME_UNIT: Record<TimeUnit, string> = {
    [TimeUnit.Millisecond]: 'millisecond',
    [TimeUnit.Second]: 'sec',
    [TimeUnit.Minute]: 'min',
    [TimeUnit.Hour]: 'hour',
    [TimeUnit.Day]: 'day',
    [TimeUnit.Week]: 'week',
    [TimeUnit.Month]: 'month',
    [TimeUnit.Year]: 'year',
};

export function normalizeRollupIntervalUnit(intervalUnit: string): string {
    const normalizedUnit = normalizeStoredTimeUnit(intervalUnit);
    return normalizedUnit
        ? ROLLUP_INTERVAL_UNIT_BY_TIME_UNIT[normalizedUnit] ?? intervalUnit.toUpperCase()
        : intervalUnit.toUpperCase();
}

export function normalizeDateBinIntervalUnit(intervalUnit: string): string {
    const normalizedUnit = normalizeStoredTimeUnit(intervalUnit);
    return normalizedUnit
        ? DATE_BIN_INTERVAL_UNIT_BY_TIME_UNIT[normalizedUnit] ?? intervalUnit.toLowerCase()
        : intervalUnit.toLowerCase();
}

export function normalizeTruncatedIntervalUnit(intervalUnit: string): string {
    const normalizedUnit = normalizeStoredTimeUnit(intervalUnit);
    return normalizedUnit
        ? TRUNCATED_INTERVAL_UNIT_BY_TIME_UNIT[normalizedUnit]
        : intervalUnit.toLowerCase();
}
