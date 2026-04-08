import {
    convertTimeToFullDate,
    getDateRange,
    setTimeRange,
} from './TagAnalyzerDateUtils';

describe('TagAnalyzerDateUtils', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('convertTimeToFullDate', () => {
        it('returns numeric timestamps unchanged', () => {
            expect(convertTimeToFullDate(1234)).toBe(1234);
        });

        it('returns zero for undefined numeric values', () => {
            expect(convertTimeToFullDate(undefined)).toBe(0);
        });

        it('resolves relative now values using the current clock', () => {
            expect(convertTimeToFullDate('now-1h')).toBe(new Date('2026-04-06T23:00:00.000Z').getTime());
            expect(convertTimeToFullDate('now-30m')).toBe(new Date('2026-04-06T23:30:00.000Z').getTime());
        });

        it('falls back to now for malformed string inputs', () => {
            const now = new Date('2026-04-07T00:00:00.000Z').getTime();

            expect(convertTimeToFullDate('now')).toBe(now);
            expect(convertTimeToFullDate('now-foo')).toBe(now);
        });
    });

    describe('setTimeRange', () => {
        it('prefers panel-level range values when they exist', () => {
            expect(
                setTimeRange(
                    {
                        range_bgn: 100,
                        range_end: 200,
                        default_range: { min: 1, max: 2 },
                    },
                    {
                        range_bgn: 300,
                        range_end: 400,
                    },
                ),
            ).toEqual({
                startTime: 100,
                endTime: 200,
            });
        });

        it('falls back to the board range when panel values are empty', () => {
            expect(
                setTimeRange(
                    {
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    },
                    {
                        range_bgn: 300,
                        range_end: 400,
                    },
                ),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('falls back to the default range when panel and board values are absent', () => {
            expect(
                setTimeRange({
                    default_range: { min: 500, max: 600 },
                }),
            ).toEqual({
                startTime: 500,
                endTime: 600,
            });
        });

        it('converts relative string ranges before returning them', () => {
            expect(
                setTimeRange({
                    range_bgn: 'now-2h',
                    range_end: 'now-30m',
                    default_range: { min: 0, max: 0 },
                }),
            ).toEqual({
                startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                endTime: new Date('2026-04-06T23:30:00.000Z').getTime(),
            });
        });
    });

    describe('getDateRange', () => {
        it('returns the custom range unchanged when one is provided', () => {
            expect(
                getDateRange(
                    {
                        range_bgn: 100,
                        range_end: 200,
                        default_range: { min: 1, max: 2 },
                    },
                    {
                        range_bgn: 300,
                        range_end: 400,
                    },
                    {
                        startTime: 700,
                        endTime: 800,
                    },
                ),
            ).toEqual({
                startTime: 700,
                endTime: 800,
            });
        });

        it('otherwise delegates to the normal time-range resolution', () => {
            expect(
                getDateRange(
                    {
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    },
                    {
                        range_bgn: 300,
                        range_end: 400,
                    },
                ),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });
    });
});
