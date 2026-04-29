import {
    resolveGlobalTimeTargetRange,
    resolvePanelTimeRange,
    restoreTimeRangePair,
} from './PanelTimeRangeResolver';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import { parseStoredTimeRangeBoundary } from '../persistence/load/LegacySupport/StoredTimeBoundaryParser';
import {
    createEmptyTagAnalyzerPanelTimeFixture as createPanelTime,
    createTagAnalyzerPanelDataFixture as createPanelData,
} from '../TestData/PanelTestData';

const fetchVirtualStatTableMock = jest.spyOn(timeBoundaryRepositoryApi, 'fetchVirtualStatTable');

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Builds a board-time value for the range resolution tests.
 * Intent: Keep the test setup consistent when exercising the resolver with different board inputs.
 * @param {string | number | ''} start - The board start value to encode.
 * @param {string | number | ''} end - The board end value to encode.
 * @returns {{ kind: 'resolved'; value: ReturnType<typeof parseStoredTimeRangeBoundary> }} The test board-time payload.
 */
function createBoardTime(start: string | number | '', end: string | number | '') {
    const sBoardTime = parseStoredTimeRangeBoundary(start, end);
    return {
        kind: 'resolved' as const,
        value: sBoardTime,
    };
}

describe('Panel range utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchVirtualStatTableMock.mockReset();
    });

    describe('time range pair helpers', () => {
        it('round-trips the saved time-range pair', () => {
            // Confirms persisted panel and navigator ranges deserialize back to the same values.
            const payload = {
                panelRange: { startTime: 10, endTime: 20 },
                navigatorRange: { startTime: 30, endTime: 40 },
            };

            expect(payload).toEqual({
                panelRange: { startTime: 10, endTime: 20 },
                navigatorRange: { startTime: 30, endTime: 40 },
            });

            expect(restoreTimeRangePair(payload)).toEqual({
                kind: 'resolved',
                value: {
                    panelRange: { startTime: 10, endTime: 20 },
                    navigatorRange: { startTime: 30, endTime: 40 },
                },
            });
        });

        it('returns an explicit empty result when the saved time-range pair is incomplete', () => {
            // Confirms partial saved time-range pairs are rejected instead of guessing missing values.
            expect(
                restoreTimeRangePair({ panelRange: { startTime: 10, endTime: 20 } }),
            ).toEqual({ kind: 'empty' });
        });
    });

    describe('presentation helpers', () => {
        it('prefers the pre-overflow range when one exists', () => {
            // Confirms global-time broadcast uses the unclamped pre-overflow range when available.
            expect(
                resolveGlobalTimeTargetRange(
                    { startTime: 1, endTime: 2 },
                    { startTime: 3, endTime: 4 },
                ),
            ).toEqual({ startTime: 1, endTime: 2 });
        });

        it('falls back to the panel range when there is no overflow range', () => {
            // Confirms global-time broadcast falls back to the visible panel window otherwise.
            expect(
                resolveGlobalTimeTargetRange(
                    { startTime: 0, endTime: 0 },
                    { startTime: 3, endTime: 4 },
                ),
            ).toEqual({ startTime: 3, endTime: 4 });
        });
    });

    describe('resolvePanelTimeRange reset mode', () => {
        it('uses the edit preview bounds when edit mode already has concrete min/max values', async () => {
            // Confirms edit mode prefers the already-fetched preview bounds over relative-time resolution.
            await expect(
                resolvePanelTimeRange(
                    createBoardTime('last-2h', 'last-1h'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'now-1h',
                        range_end: 'now',
                        time_keeper: undefined,
                    }),
                    {
                        start: { min: 100, max: 100 },
                        end: { min: 200, max: 200 },
                    },
                    true,
                    'reset',
                ),
            ).resolves.toEqual({
                startTime: 100,
                endTime: 200,
            });
        });

        it('uses the board-level last range before the panel-specific range logic', async () => {
            // Confirms board-level last-ranges take priority over panel-level relative rules.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolvePanelTimeRange(
                    createBoardTime('last-2h', 'last-1h'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    false,
                    'reset',
                ),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 2 * HOUR_MS,
                endTime: sResolvedEndTime - HOUR_MS,
            });
        });

        it('resolves relative panel last ranges through the fetched time bounds when no board-level last range applies', async () => {
            // Confirms panel-level last-ranges are resolved from fetched tag time bounds.
            const sResolvedEndTime = new Date('2026-04-07T04:00:00.000Z').getTime();
            fetchVirtualStatTableMock.mockResolvedValue([[0, sResolvedEndTime]]);

            await expect(
                resolvePanelTimeRange(
                    createBoardTime('now-2h', 'now'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    null,
                    false,
                    'reset',
                ),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 30 * MINUTE_MS,
                endTime: sResolvedEndTime - 10 * MINUTE_MS,
            });

            expect(fetchVirtualStatTableMock).toHaveBeenCalled();
        });

        it('falls back to the resolved now-range helper when the panel ends at now', async () => {
            // Confirms now-relative panel ranges fall back to the shared date-range helper.
            jest.useFakeTimers().setSystemTime(new Date('2026-04-20T12:00:00.000Z'));

            try {
                const sExpectedRange = parseStoredTimeRangeBoundary('now-1h', 'now').range;

                await expect(
                    resolvePanelTimeRange(
                        createBoardTime('now-2h', 'now'),
                        createPanelData(undefined),
                        createPanelTime({
                            range_bgn: 'now-1h',
                            range_end: 'now',
                            default_range: { min: 1, max: 2 },
                        }),
                        null,
                        false,
                        'reset',
                    ),
                ).resolves.toEqual({
                    startTime: sExpectedRange.min,
                    endTime: sExpectedRange.max,
                });
            } finally {
                jest.useRealTimers();
            }
        });

        it('treats mixed-case relative now-ranges as relative panel time', async () => {
            // Confirms relative-time parsing stays case-insensitive for now-based ranges.
            const sNow = new Date('2026-04-20T00:00:00.000Z');

            jest.useFakeTimers();
            jest.setSystemTime(sNow);

            try {
                const sResolvedRange = await resolvePanelTimeRange(
                    createBoardTime('Now-2h', 'Now'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'Now-1h',
                        range_end: 'Now',
                        default_range: { min: 1, max: 2 },
                    }),
                    null,
                    false,
                    'reset',
                );

                expect(sResolvedRange).toEqual({
                    startTime: sNow.getTime() - 60 * 60 * 1000,
                    endTime: sNow.getTime(),
                });
            } finally {
                jest.useRealTimers();
            }
        });

        it('uses absolute numeric panel ranges when they are already concrete', async () => {
            // Confirms literal numeric panel ranges bypass the relative-time helpers entirely.
            await expect(
                resolvePanelTimeRange(
                    createBoardTime('now-2h', 'now'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 10,
                        range_end: 20,
                        time_keeper: undefined,
                    }),
                    null,
                    false,
                    'reset',
                ),
            ).resolves.toEqual({
                startTime: 10,
                endTime: 20,
            });
        });

        it('falls back to the default board range path when no more specific range applies', async () => {
            // Confirms the default board range is the final fallback for reset resolution.
            await expect(
                resolvePanelTimeRange(
                    createBoardTime('', ''),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    }),
                    null,
                    false,
                    'reset',
                ),
            ).resolves.toEqual({
                startTime: 1,
                endTime: 2,
            });
        });
    });

    describe('resolvePanelTimeRange initialize mode', () => {
        it('uses the edit board last range in edit mode when concrete bounds already exist', async () => {
            // Confirms edit mode initialization prefers the already-fetched board bounds.
            await expect(
                resolvePanelTimeRange(
                    createBoardTime('last-2h', 'last-1h'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'now-1h',
                        range_end: 'now',
                        time_keeper: undefined,
                    }),
                    {
                        start: { min: 300, max: 300 },
                        end: { min: 400, max: 400 },
                    },
                    true,
                    'initialize',
                ),
            ).resolves.toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('uses the board-level last range in non-edit mode when it exists', async () => {
            // Confirms board-level last-ranges seed the first visible panel range.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolvePanelTimeRange(
                    createBoardTime('last-2h', 'last-1h'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    false,
                    'initialize',
                ),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 2 * HOUR_MS,
                endTime: sResolvedEndTime - HOUR_MS,
            });
        });

        it('treats mixed-case board last ranges as relative board time', async () => {
            // Confirms board-level relative parsing stays case-insensitive during initialization.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolvePanelTimeRange(
                    createBoardTime('Last-2h', 'Last-1h'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'Last-30m',
                        range_end: 'Last-10m',
                        time_keeper: undefined,
                    }),
                    {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    false,
                    'initialize',
                ),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 2 * HOUR_MS,
                endTime: sResolvedEndTime - HOUR_MS,
            });
        });

        it('uses the relative panel last range when the board range is not last-based', async () => {
            // Confirms panel-level last-ranges resolve from fetched panel bounds when needed.
            const sResolvedEndTime = new Date('2026-04-07T05:00:00.000Z').getTime();
            fetchVirtualStatTableMock.mockResolvedValue([[0, sResolvedEndTime]]);

            await expect(
                resolvePanelTimeRange(
                    createBoardTime('now-2h', 'now'),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    null,
                    false,
                    'initialize',
                ),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 30 * MINUTE_MS,
                endTime: sResolvedEndTime - 10 * MINUTE_MS,
            });
        });

        it('uses the resolved now-range helper when the panel ends at now', async () => {
            // Confirms now-relative panel ranges initialize through the shared date helper.
            const sNow = new Date('2026-04-20T00:00:00.000Z');
            jest.useFakeTimers();
            jest.setSystemTime(sNow);

            try {
                const sExpectedRange = parseStoredTimeRangeBoundary('now-1h', 'now').range;

                await expect(
                    resolvePanelTimeRange(
                        createBoardTime('now-2h', 'now'),
                        createPanelData(undefined),
                        createPanelTime({
                            range_bgn: 'now-1h',
                            range_end: 'now',
                            default_range: { min: 1, max: 2 },
                        }),
                        null,
                        false,
                        'initialize',
                    ),
                ).resolves.toEqual({
                    startTime: sExpectedRange.min,
                    endTime: sExpectedRange.max,
                });
            } finally {
                jest.useRealTimers();
            }
        });

        it('falls back to the general date-range helper when no special range path applies', async () => {
            // Confirms the shared date-range helper is the final initialization fallback.
            await expect(
                resolvePanelTimeRange(
                    createBoardTime('', ''),
                    createPanelData(undefined),
                    createPanelTime({
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    }),
                    null,
                    false,
                    'initialize',
                ),
            ).resolves.toEqual({
                startTime: 1,
                endTime: 2,
            });
        });
    });
});

