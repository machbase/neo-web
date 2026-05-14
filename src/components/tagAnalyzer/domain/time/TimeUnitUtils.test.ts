import {
    getIntervalMs,
    getTimeUnitMilliseconds,
    normalizeStoredTimeUnit,
    normalizeTimeUnit,
} from './TimeUnitUtils';
import { TimeUnit } from './TimeTypes';

describe('TimeUnitUtils', () => {
    describe('normalizeTimeUnit', () => {
        it('maps shorthand units to internal units', () => {
            expect(normalizeTimeUnit('s')).toBe(TimeUnit.Second);
            expect(normalizeTimeUnit('m')).toBe(TimeUnit.Minute);
            expect(normalizeTimeUnit('h')).toBe(TimeUnit.Hour);
            expect(normalizeTimeUnit('d')).toBe(TimeUnit.Day);
        });

        it('maps canonical long-name units to the internal enum values', () => {
            expect(normalizeTimeUnit('millisecond')).toBe(TimeUnit.Millisecond);
            expect(normalizeTimeUnit('month')).toBe(TimeUnit.Month);
        });

        it('returns undefined for unsupported units', () => {
            expect(normalizeTimeUnit('quarter')).toBeUndefined();
        });
    });

    describe('normalizeStoredTimeUnit', () => {
        it('maps stored unit names into the canonical enum values', () => {
            expect(normalizeStoredTimeUnit('sec')).toBe(TimeUnit.Second);
            expect(normalizeStoredTimeUnit('min')).toBe(TimeUnit.Minute);
            expect(normalizeStoredTimeUnit('hour')).toBe(TimeUnit.Hour);
            expect(normalizeStoredTimeUnit('day')).toBe(TimeUnit.Day);
            expect(normalizeStoredTimeUnit('month')).toBe(TimeUnit.Month);
        });
    });

    describe('getTimeUnitMilliseconds', () => {
        it('converts supported time units to milliseconds', () => {
            expect(getTimeUnitMilliseconds(TimeUnit.Millisecond, 2)).toBe(2);
            expect(getTimeUnitMilliseconds(TimeUnit.Second, 2)).toBe(2000);
            expect(getTimeUnitMilliseconds(TimeUnit.Minute, 3)).toBe(180000);
            expect(getTimeUnitMilliseconds(TimeUnit.Hour, 4)).toBe(14400000);
            expect(getTimeUnitMilliseconds(TimeUnit.Day, 5)).toBe(432000000);
            expect(getTimeUnitMilliseconds(TimeUnit.Week, 1)).toBe(604800000);
        });
    });

    describe('getIntervalMs', () => {
        it('converts supported interval units to milliseconds', () => {
            expect(getIntervalMs('s', 2)).toBe(2000);
            expect(getIntervalMs('m', 3)).toBe(180000);
            expect(getIntervalMs('h', 4)).toBe(14400000);
            expect(getIntervalMs('d', 5)).toBe(432000000);
        });

        it('returns 0 for unsupported interval units', () => {
            expect(getIntervalMs('ms', 7)).toBe(0);
            expect(getIntervalMs('w', 7)).toBe(0);
        });
    });
});
