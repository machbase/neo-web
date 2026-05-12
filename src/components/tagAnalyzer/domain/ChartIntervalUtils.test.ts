import { calculateInterval } from './ChartIntervalUtils';

describe('ChartIntervalUtils', () => {
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
            const sInterval = calculateInterval(
                0,
                10 * 60 * 1000,
                100,
                true,
                10,
                25,
                false,
            );

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
});
