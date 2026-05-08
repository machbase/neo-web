import { TimeUnit } from '../../time/TimeTypes';
import { normalizeStoredTimeUnit } from '../../time/TimeUnitUtils';

const ROLLUP_INTERVAL_UNIT_BY_TIME_UNIT: Partial<Record<TimeUnit, string>> = {
    [TimeUnit.Second]: 'SEC',
    [TimeUnit.Minute]: 'MIN',
    [TimeUnit.Hour]: 'HOUR',
    [TimeUnit.Day]: 'DAY',
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

export function normalizeTruncatedIntervalUnit(intervalUnit: string): string {
    const normalizedUnit = normalizeStoredTimeUnit(intervalUnit);
    return normalizedUnit
        ? TRUNCATED_INTERVAL_UNIT_BY_TIME_UNIT[normalizedUnit]
        : intervalUnit.toLowerCase();
}
