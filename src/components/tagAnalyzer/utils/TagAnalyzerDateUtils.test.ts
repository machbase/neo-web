import {
    createTagAnalyzerTimeRange,
    convertTimeToFullDate,
    EMPTY_TAG_ANALYZER_TIME_RANGE,
    normalizePanelTimeRangeSource,
    normalizeTimeRangeSource,
    setTimeRange,
} from './TagAnalyzerDateUtils';
import { normalizeLegacyTimeRangeBoundary } from './legacy/LegacyUtils';

describe('TagAnalyzerDateUtils', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('convertTimeToFullDate', () => {
        it('builds a simple time range object', () => {
            expect(createTagAnalyzerTimeRange(100, 200)).toEqual({
                startTime: 100,
                endTime: 200,
            });
            expect(EMPTY_TAG_ANALYZER_TIME_RANGE).toEqual({
                startTime: 0,
                endTime: 0,
            });
        });

        it('returns numeric timestamps unchanged', () => {
            expect(convertTimeToFullDate(1234)).toBe(1234);
        });

        it('returns zero for undefined numeric values', () => {
            expect(convertTimeToFullDate(undefined)).toBe(0);
        });

        it('resolves relative now values using the current clock', () => {
            expect(convertTimeToFullDate('now-1h')).toBe(
                new Date('2026-04-06T23:00:00.000Z').getTime(),
            );
            expect(convertTimeToFullDate('now-30m')).toBe(
                new Date('2026-04-06T23:30:00.000Z').getTime(),
            );
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
                        range: {
                            startTime: 100,
                            endTime: 200,
                        },
                        defaultRange: {
                            startTime: 1,
                            endTime: 2,
                        },
                    },
                    {
                        startTime: 300,
                        endTime: 400,
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
                        range: undefined,
                        defaultRange: {
                            startTime: 1,
                            endTime: 2,
                        },
                    },
                    {
                        startTime: 300,
                        endTime: 400,
                    },
                ),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('falls back to the default range when panel and board values are absent', () => {
            expect(
                setTimeRange(
                    {
                        range: undefined,
                        defaultRange: {
                            startTime: 500,
                            endTime: 600,
                        },
                    },
                    undefined,
                ),
            ).toEqual({
                startTime: 500,
                endTime: 600,
            });
        });

        it('returns already-normalized numeric ranges unchanged', () => {
            expect(
                setTimeRange(
                    {
                        range: {
                            startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                            endTime: new Date('2026-04-06T23:30:00.000Z').getTime(),
                        },
                        defaultRange: {
                            startTime: 0,
                            endTime: 0,
                        },
                    },
                    undefined,
                ),
            ).toEqual({
                startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                endTime: new Date('2026-04-06T23:30:00.000Z').getTime(),
            });
        });
    });

    describe('normalizeTimeRangeSource', () => {
        it('returns undefined when the input is missing or incomplete', () => {
            expect(normalizeTimeRangeSource(undefined)).toBeUndefined();
            expect(
                normalizeTimeRangeSource({
                    start: normalizeLegacyTimeRangeBoundary('', '').rangeConfig.start,
                    end: normalizeLegacyTimeRangeBoundary(400, 400).rangeConfig.end,
                }),
            ).toBeUndefined();
        });

        it('returns a concrete range when both boundaries exist', () => {
            expect(
                normalizeTimeRangeSource({
                    start: normalizeLegacyTimeRangeBoundary(300, 300).rangeConfig.start,
                    end: normalizeLegacyTimeRangeBoundary(400, 400).rangeConfig.end,
                }),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('converts relative ranges into numeric timestamps immediately', () => {
            expect(
                normalizeTimeRangeSource(normalizeLegacyTimeRangeBoundary('now-2h', 'now-1h').rangeConfig),
            ).toEqual({
                startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                endTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
            });
        });
    });

    describe('normalizePanelTimeRangeSource', () => {
        it('keeps the default range concrete even when the explicit range is empty', () => {
            expect(
                normalizePanelTimeRangeSource({
                    range_bgn: 0,
                    range_end: 0,
                    range_config: normalizeLegacyTimeRangeBoundary('', '').rangeConfig,
                    default_range: { min: 1, max: 2 },
                }),
            ).toEqual({
                range: undefined,
                defaultRange: {
                    startTime: 1,
                    endTime: 2,
                },
            });
        });

        it('normalizes the explicit range when both boundaries exist', () => {
            const sTimeRange = normalizeLegacyTimeRangeBoundary('now-2h', 'now-1h');
            expect(
                normalizePanelTimeRangeSource({
                    range_bgn: sTimeRange.range.min,
                    range_end: sTimeRange.range.max,
                    range_config: sTimeRange.rangeConfig,
                    default_range: { min: 1, max: 2 },
                }),
            ).toEqual({
                range: {
                    startTime: new Date('2026-04-06T22:00:00.000Z').getTime(),
                    endTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
                },
                defaultRange: {
                    startTime: 1,
                    endTime: 2,
                },
            });
        });
    });
});
