import {
    calculateInterval,
    calculateSampleCount,
    checkTableUser,
    computeSeriesCalcList,
    convertIntervalUnit,
    getDuration,
    getIntervalMs,
} from './TagAnalyzerUtils';

describe('TagAnalyzerUtils', () => {
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

    describe('checkTableUser', () => {
        it('keeps fully qualified tables unchanged', () => {
            expect(checkTableUser('APP.table_name', 'admin')).toBe('APP.table_name');
        });

        it('prefixes bare tables with the admin id', () => {
            expect(checkTableUser('table_name', 'admin')).toBe('ADMIN.table_name');
        });
    });

    describe('calculateInterval', () => {
        it('chooses the expected coarse interval for long ranges', () => {
            const interval = calculateInterval(0, 6 * 24 * 60 * 60 * 1000, 100, false, 10, 20);

            expect(interval).toEqual({
                IntervalType: 'day',
                IntervalValue: 1,
            });
        });

        it('uses raw pixel spacing when raw mode is active outside navigator mode', () => {
            const interval = calculateInterval(0, 10 * 60 * 1000, 100, true, 10, 25, false);

            expect(interval.IntervalType).toBe('min');
            expect(interval.IntervalValue).toBeGreaterThanOrEqual(1);
        });

        it('falls back to second-based intervals for short spans', () => {
            const interval = calculateInterval(0, 2_500, 200, false, 10, 20);

            expect(interval).toEqual({
                IntervalType: 'sec',
                IntervalValue: 1,
            });
        });
    });

    describe('getDuration', () => {
        it('formats duration parts in descending units', () => {
            expect(getDuration(0, 3_661_005)).toBe('1h 1m 1s  5ms');
        });
    });

    describe('computeSeriesCalcList', () => {
        it('calculates min, max, and avg for values within the selected range', () => {
            const result = computeSeriesCalcList(
                [
                    {
                        data: [
                            [10, 1],
                            [20, 3],
                            [30, 5],
                        ],
                    },
                ],
                [
                    {
                        table: 'APP.table',
                        tagName: 'sensor',
                        alias: 'Sensor A',
                    },
                ],
                15,
                35,
            );

            expect(result).toEqual([
                {
                    table: 'APP.table',
                    name: 'sensor',
                    alias: 'Sensor A',
                    min: '3.00000',
                    max: '5.00000',
                    avg: '4.00000',
                },
            ]);
        });

        it('supports series data coming from xData and yData arrays', () => {
            const result = computeSeriesCalcList(
                [
                    {
                        data: [],
                        xData: [100, 200, 300],
                        yData: [2, 4, 6],
                    },
                ],
                [
                    {
                        table: 'APP.table',
                        tagName: 'sensor',
                        alias: '',
                    },
                ],
                150,
                350,
            );

            expect(result).toEqual([
                {
                    table: 'APP.table',
                    name: 'sensor',
                    alias: '',
                    min: '4.00000',
                    max: '6.00000',
                    avg: '5.00000',
                },
            ]);
        });
    });

    describe('calculateSampleCount', () => {
        it('returns -1 when the limit is already capped', () => {
            expect(calculateSampleCount(10, false, false, 20, 40, 500)).toBe(-1);
        });

        it('uses raw pixels per tick when sampling raw data', () => {
            expect(calculateSampleCount(-1, true, true, 10, 25, 500)).toBe(20);
        });

        it('uses regular pixels per tick when sampling non-raw data', () => {
            expect(calculateSampleCount(-1, false, false, 25, 10, 500)).toBe(20);
        });
    });
});
