import {
    calculateInterval,
    convertIntervalUnit,
    formatDurationLabel,
    getIntervalMs,
} from './IntervalUtils';

describe('IntervalUtils', () => {
    describe('convertIntervalUnit', () => {
        it('maps shorthand units to full names', () => {
            expect(convertIntervalUnit('s')).toBe('sec');
            expect(convertIntervalUnit('m')).toBe('min');
            expect(convertIntervalUnit('h')).toBe('hour');
            expect(convertIntervalUnit('d')).toBe('day');
        });

        it('returns unknown units unchanged', () => {
            expect(convertIntervalUnit('week')).toBe('week');
        });
    });

    describe('getIntervalMs', () => {
        it('converts supported units to milliseconds', () => {
            expect(getIntervalMs('sec', 2)).toBe(2000);
            expect(getIntervalMs('min', 3)).toBe(180000);
            expect(getIntervalMs('hour', 4)).toBe(14400000);
            expect(getIntervalMs('day', 5)).toBe(432000000);
        });

        it('returns 0 for unknown units', () => {
            expect(getIntervalMs('week', 7)).toBe(0);
        });
    });

    describe('calculateInterval', () => {
        it('chooses the expected coarse interval for long ranges', () => {
            const sInterval = calculateInterval(
                0,
                6 * 24 * 60 * 60 * 1000,
                100,
                false,
                10,
                20,
                undefined,
            );

            expect(sInterval).toEqual({
                IntervalType: 'day',
                IntervalValue: 1,
            });
        });

        it('uses raw pixel spacing when raw mode is active outside navigator mode', () => {
            const sInterval = calculateInterval(0, 10 * 60 * 1000, 100, true, 10, 25, false);

            expect(sInterval.IntervalType).toBe('min');
            expect(sInterval.IntervalValue).toBeGreaterThanOrEqual(1);
        });

        it('falls back to second-based intervals for short spans', () => {
            const sInterval = calculateInterval(0, 2_500, 200, false, 10, 20, undefined);

            expect(sInterval).toEqual({
                IntervalType: 'sec',
                IntervalValue: 1,
            });
        });
    });

    describe('formatDurationLabel', () => {
        it('formats duration parts in descending units', () => {
            expect(formatDurationLabel(0, 3_661_005)).toBe('1h 1m 1s  5ms');
        });
    });
});
