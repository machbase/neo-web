import {
    EMPTY_TIME_RANGE,
    normalizePanelTimeRangeSource,
    resolveGlobalTimeTargetRange,
    restoreTimeRangePair,
    toConcreteTimeRange,
    setTimeRange,
} from './PanelTimeRangeResolver';
import { normalizeLegacyTimeRangeBoundary } from '../legacy/LegacyTimeAdapter';

describe('PanelTimeRangeResolver', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('keeps the shared empty time range concrete', () => {
            expect(EMPTY_TIME_RANGE).toEqual({
                startTime: 0,
                endTime: 0,
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

    describe('toConcreteTimeRange', () => {
        it('returns undefined when the provided range is incomplete', () => {
            expect(
                toConcreteTimeRange({
                    start: normalizeLegacyTimeRangeBoundary('', '').rangeConfig.start,
                    end: normalizeLegacyTimeRangeBoundary(400, 400).rangeConfig.end,
                }),
            ).toBeUndefined();
        });

        it('returns a concrete range when both boundaries exist', () => {
            expect(
                toConcreteTimeRange({
                    start: normalizeLegacyTimeRangeBoundary(300, 300).rangeConfig.start,
                    end: normalizeLegacyTimeRangeBoundary(400, 400).rangeConfig.end,
                }),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('returns numeric value ranges unchanged', () => {
            expect(
                toConcreteTimeRange({
                    min: 300,
                    max: 400,
                }),
            ).toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('converts relative ranges into numeric timestamps immediately', () => {
            expect(
                toConcreteTimeRange(normalizeLegacyTimeRangeBoundary('now-2h', 'now-1h').rangeConfig),
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

    describe('time range pair helpers', () => {
        it('round-trips the saved time-range pair', () => {
            const sPayload = {
                panelRange: { startTime: 10, endTime: 20 },
                navigatorRange: { startTime: 30, endTime: 40 },
            };

            expect(sPayload).toEqual({
                panelRange: { startTime: 10, endTime: 20 },
                navigatorRange: { startTime: 30, endTime: 40 },
            });

            expect(restoreTimeRangePair(sPayload)).toEqual({
                kind: 'resolved',
                value: {
                    panelRange: { startTime: 10, endTime: 20 },
                    navigatorRange: { startTime: 30, endTime: 40 },
                },
            });
        });

        it('returns an explicit empty result when the saved time-range pair is incomplete', () => {
            expect(
                restoreTimeRangePair({ panelRange: { startTime: 10, endTime: 20 } }),
            ).toEqual({ kind: 'empty' });
        });
    });

    describe('resolveGlobalTimeTargetRange', () => {
        it('prefers the pre-overflow range when one exists', () => {
            expect(
                resolveGlobalTimeTargetRange(
                    { startTime: 1, endTime: 2 },
                    { startTime: 3, endTime: 4 },
                ),
            ).toEqual({ startTime: 1, endTime: 2 });
        });

        it('falls back to the panel range when there is no overflow range', () => {
            expect(
                resolveGlobalTimeTargetRange(
                    { startTime: 0, endTime: 0 },
                    { startTime: 3, endTime: 4 },
                ),
            ).toEqual({ startTime: 3, endTime: 4 });
        });
    });
});
