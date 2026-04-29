import { EMPTY_TIME_RANGE } from './TimeConstants';
import {
    normalizePanelTimeRangeSource,
    resolvePanelTimeRange,
    resolveGlobalTimeTargetRange,
    restoreTimeRangePair,
    toConcreteTimeRange,
    setTimeRange,
} from './PanelTimeRangeResolver';
import { parseStoredTimeRangeBoundary } from '../persistence/load/LegacySupport/StoredTimeBoundaryParser';
import {
    createTagAnalyzerPanelDataFixture,
} from '../TestData/PanelTestData';

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
                    start: parseStoredTimeRangeBoundary('', '').rangeConfig.start,
                    end: parseStoredTimeRangeBoundary(400, 400).rangeConfig.end,
                }),
            ).toBeUndefined();
        });

        it('returns a concrete range when both boundaries exist', () => {
            expect(
                toConcreteTimeRange({
                    start: parseStoredTimeRangeBoundary(300, 300).rangeConfig.start,
                    end: parseStoredTimeRangeBoundary(400, 400).rangeConfig.end,
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
            toConcreteTimeRange(parseStoredTimeRangeBoundary('now-2h', 'now-1h').rangeConfig),
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
                rangeConfig: parseStoredTimeRangeBoundary('', '').rangeConfig,
                    defaultRange: { min: 1, max: 2 },
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
            const sTimeRange = parseStoredTimeRangeBoundary('now-2h', 'now-1h');
            expect(
                normalizePanelTimeRangeSource({
                    rangeConfig: sTimeRange.rangeConfig,
                    defaultRange: { min: 1, max: 2 },
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

    describe('resolvePanelTimeRange reset mode', () => {
        it('falls back to fetched time boundaries when persisted ranges are empty', async () => {
            const sResolvedRange = await resolvePanelTimeRange(
                {
                    kind: 'resolved',
                    value: parseStoredTimeRangeBoundary('', ''),
                },
                createTagAnalyzerPanelDataFixture(undefined),
                {
                    rangeConfig: parseStoredTimeRangeBoundary('', '').rangeConfig,
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                    defaultRange: undefined,
                },
                {
                    start: {
                        min: 100,
                        max: 200,
                    },
                    end: {
                        min: 250,
                        max: 400,
                    },
                },
                false,
                'reset',
            );

            expect(sResolvedRange).toEqual({
                startTime: 100,
                endTime: 400,
            });
        });
    });
});
