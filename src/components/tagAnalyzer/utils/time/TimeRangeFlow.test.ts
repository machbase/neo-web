import {
    createPanelRangeControlHandlers,
    getFocusedPanelRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getNavigatorRangeFromEvent,
    getZoomInPanelRange,
    getZoomOutRange,
} from './PanelRangeControlLogic';
import {
    resolveGlobalTimeTargetRange,
    restoreTimeRangePair,
} from './PanelTimeRangeResolver';
import {
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelTimeRangeResolver';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import { changeUtcToText } from '@/utils/helpers/date';
import { normalizeLegacyTimeRangeBoundary } from '../legacy/LegacyTimeAdapter';
import {
    createEmptyTagAnalyzerPanelTimeFixture as createPanelTime,
    createTagAnalyzerPanelDataFixture as createPanelData,
} from '../../TestData/PanelTestData';

jest.mock('@/utils/helpers/date', () => ({
    ...jest.requireActual('@/utils/helpers/date'),
    changeUtcToText: jest.fn(),
}));

const fetchVirtualStatTableMock = jest.spyOn(timeBoundaryRepositoryApi, 'fetchVirtualStatTable');
const changeUtcToTextMock = jest.mocked(changeUtcToText);

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Builds a board-time parameter object for the range resolution tests.
 * Intent: Keep the test setup consistent when exercising the resolver with different board inputs.
 * @param {string | number | ''} aStart - The board start value to encode.
 * @param {string | number | ''} aEnd - The board end value to encode.
 * @returns {{ boardTime: { kind: 'resolved'; value: ReturnType<typeof normalizeLegacyTimeRangeBoundary> } }} The test board-time payload.
 */
function createBoardRangeParams(aStart: string | number | '', aEnd: string | number | '') {
    const sBoardTime = normalizeLegacyTimeRangeBoundary(aStart, aEnd);
    return {
        boardTime: {
            kind: 'resolved' as const,
            value: sBoardTime,
        },
    };
}

describe('Panel range utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchVirtualStatTableMock.mockReset();
        changeUtcToTextMock.mockImplementation((aUtc) => `T${aUtc}`);
    });

    describe('getNavigatorRangeFromEvent', () => {
        it('enforces a minimum navigator span of one second', () => {
            // Confirms tiny drag windows are widened to the footer's minimum span.
            expect(getNavigatorRangeFromEvent({ min: 100, max: 500 })).toEqual({
                startTime: 100,
                endTime: 1100,
            });
        });

        it('uses the event max when the range is already wide enough', () => {
            // Confirms already valid navigator windows are preserved as-is.
            expect(getNavigatorRangeFromEvent({ min: 100, max: 1500 })).toEqual({
                startTime: 100,
                endTime: 1500,
            });
        });
    });

    describe('zoom helpers', () => {
        it('zooms in around the middle of the panel range', () => {
            // Confirms zoom-in keeps the center point stable while shrinking the window.
            expect(getZoomInPanelRange({ startTime: 0, endTime: 100 }, 0.25)).toEqual({
                startTime: 25,
                endTime: 75,
            });
        });

        it('keeps a minimum width when zooming in on a tiny range', () => {
            // Confirms zoom-in never collapses the panel range below the minimum width.
            expect(getZoomInPanelRange({ startTime: 0, endTime: 5 }, 0.5)).toEqual({
                startTime: 2.5,
                endTime: 12.5,
            });
        });

        it('zooms out and extends the navigator when the new range escapes the current bounds', () => {
            // Confirms zoom-out widens both the panel and navigator when needed.
            expect(
                getZoomOutRange({ startTime: 10, endTime: 30 }, { startTime: 5, endTime: 40 }, 1),
            ).toEqual({
                panelRange: { startTime: 5, endTime: 50 },
                navigatorRange: { startTime: 5, endTime: 50 },
            });
        });

        it('focuses on the center of a sufficiently wide panel range and halves the slider range', () => {
            // Confirms focus mode narrows the panel and shrinks the slider window around the current panel center.
            expect(
                getFocusedPanelRange(
                    { startTime: 0, endTime: 1000 },
                    { startTime: 0, endTime: 4000 },
                ),
            ).toEqual({
                panelRange: { startTime: 400, endTime: 600 },
                navigatorRange: { startTime: 0, endTime: 2000 },
            });
        });

        it('does not focus ranges narrower than one second', () => {
            // Confirms focus mode refuses windows that are already too narrow to shrink again.
            expect(
                getFocusedPanelRange(
                    { startTime: 0, endTime: 999 },
                    { startTime: 0, endTime: 4000 },
                ),
            ).toBeUndefined();
        });

        it('builds separate shift and zoom handlers around the shared setter', () => {
            // Confirms the board and preview shells receive explicit shift and zoom handler sets.
            const sSetExtremes = jest.fn();
            const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
                sSetExtremes,
                { startTime: 1_000, endTime: 2_000 },
                { startTime: 800, endTime: 2_200 },
            );

            shiftHandlers.onShiftPanelRangeRight();
            shiftHandlers.onShiftNavigatorRangeLeft();
            zoomHandlers.onZoomIn(0.25);
            zoomHandlers.onZoomOut(0.5);
            zoomHandlers.onFocus();

            expect(sSetExtremes).toHaveBeenNthCalledWith(
                1,
                { startTime: 1_500, endTime: 2_500 },
                { startTime: 1_300, endTime: 2_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                2,
                { startTime: 300, endTime: 1_300 },
                { startTime: 100, endTime: 1_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                3,
                { startTime: 1_250, endTime: 1_750 },
                undefined,
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                4,
                { startTime: 500, endTime: 2_500 },
                { startTime: 500, endTime: 2_500 },
            );
            expect(sSetExtremes).toHaveBeenNthCalledWith(
                5,
                { startTime: 1_400, endTime: 1_600 },
                { startTime: 1_000, endTime: 2_000 },
            );
        });
    });

    describe('move helpers', () => {
        it('moves the panel range left and extends the navigator when needed', () => {
            // Confirms left shifts widen the navigator if the panel would move outside it.
            expect(
                getMovedPanelRange(
                    { startTime: 100, endTime: 200 },
                    { startTime: 120, endTime: 220 },
                    'left',
                ),
            ).toEqual({
                panelRange: { startTime: 50, endTime: 150 },
                navigatorRange: { startTime: 50, endTime: 170 },
            });
        });

        it('moves the panel range right and extends the navigator when needed', () => {
            // Confirms right shifts widen the navigator when the panel reaches the current edge.
            expect(
                getMovedPanelRange(
                    { startTime: 100, endTime: 200 },
                    { startTime: 80, endTime: 180 },
                    'right',
                ),
            ).toEqual({
                panelRange: { startTime: 150, endTime: 250 },
                navigatorRange: { startTime: 130, endTime: 250 },
            });
        });

        it('moves the navigator left and keeps the main panel within view', () => {
            // Confirms leftward navigator shifts move the main panel with the overview window.
            expect(
                getMovedNavigatorRange(
                    { startTime: 120, endTime: 180 },
                    { startTime: 100, endTime: 200 },
                    'left',
                ),
            ).toEqual({
                panelRange: { startTime: 70, endTime: 130 },
                navigatorRange: { startTime: 50, endTime: 150 },
            });
        });

        it('moves the navigator right and shifts the panel when it falls behind', () => {
            // Confirms rightward navigator shifts move the panel by the same overview offset.
            expect(
                getMovedNavigatorRange(
                    { startTime: 100, endTime: 160 },
                    { startTime: 90, endTime: 150 },
                    'right',
                ),
            ).toEqual({
                panelRange: { startTime: 130, endTime: 190 },
                navigatorRange: { startTime: 120, endTime: 180 },
            });
        });
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

    describe('resolveResetTimeRange', () => {
        it('uses the edit preview bounds when edit mode already has concrete min/max values', async () => {
            // Confirms edit mode prefers the already-fetched preview bounds over relative-time resolution.
            await expect(
                resolveResetTimeRange({
                    ...createBoardRangeParams('last-2h', 'last-1h'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'now-1h',
                        range_end: 'now',
                        time_keeper: undefined,
                    }),
                    timeBoundaryRanges: {
                        start: { min: 100, max: 100 },
                        end: { min: 200, max: 200 },
                    },
                    isEdit: true,
                }),
            ).resolves.toEqual({
                startTime: 100,
                endTime: 200,
            });
        });

        it('uses the board-level last range before the panel-specific range logic', async () => {
            // Confirms board-level last-ranges take priority over panel-level relative rules.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolveResetTimeRange({
                    ...createBoardRangeParams('last-2h', 'last-1h'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    timeBoundaryRanges: {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    isEdit: false,
                }),
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
                resolveResetTimeRange({
                    ...createBoardRangeParams('now-2h', 'now'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                }),
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
                const sExpectedRange = normalizeLegacyTimeRangeBoundary('now-1h', 'now').range;

                await expect(
                    resolveResetTimeRange({
                        ...createBoardRangeParams('now-2h', 'now'),
                        panelData: createPanelData(undefined),
                        panelTime: createPanelTime({
                            range_bgn: 'now-1h',
                            range_end: 'now',
                            default_range: { min: 1, max: 2 },
                        }),
                        isEdit: false,

                        timeBoundaryRanges: null,
                    }),
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
                const sResolvedRange = await resolveResetTimeRange({
                    ...createBoardRangeParams('Now-2h', 'Now'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'Now-1h',
                        range_end: 'Now',
                        default_range: { min: 1, max: 2 },
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                });

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
                resolveResetTimeRange({
                    ...createBoardRangeParams('now-2h', 'now'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 10,
                        range_end: 20,
                        time_keeper: undefined,
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                }),
            ).resolves.toEqual({
                startTime: 10,
                endTime: 20,
            });
        });

        it('falls back to the default board range path when no more specific range applies', async () => {
            // Confirms the default board range is the final fallback for reset resolution.
            await expect(
                resolveResetTimeRange({
                    ...createBoardRangeParams('', ''),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                }),
            ).resolves.toEqual({
                startTime: 1,
                endTime: 2,
            });
        });
    });

    describe('resolveInitialPanelRange', () => {
        it('uses the edit board last range in edit mode when concrete bounds already exist', async () => {
            // Confirms edit mode initialization prefers the already-fetched board bounds.
            await expect(
                resolveInitialPanelRange({
                    ...createBoardRangeParams('last-2h', 'last-1h'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'now-1h',
                        range_end: 'now',
                        time_keeper: undefined,
                    }),
                    timeBoundaryRanges: {
                        start: { min: 300, max: 300 },
                        end: { min: 400, max: 400 },
                    },
                    isEdit: true,
                }),
            ).resolves.toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('uses the board-level last range in non-edit mode when it exists', async () => {
            // Confirms board-level last-ranges seed the first visible panel range.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolveInitialPanelRange({
                    ...createBoardRangeParams('last-2h', 'last-1h'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    timeBoundaryRanges: {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: sResolvedEndTime - 2 * HOUR_MS,
                endTime: sResolvedEndTime - HOUR_MS,
            });
        });

        it('treats mixed-case board last ranges as relative board time', async () => {
            // Confirms board-level relative parsing stays case-insensitive during initialization.
            const sResolvedEndTime = new Date('2026-04-07T03:00:00.000Z').getTime();

            await expect(
                resolveInitialPanelRange({
                    ...createBoardRangeParams('Last-2h', 'Last-1h'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'Last-30m',
                        range_end: 'Last-10m',
                        time_keeper: undefined,
                    }),
                    timeBoundaryRanges: {
                        start: { min: 0, max: 0 },
                        end: { min: sResolvedEndTime, max: sResolvedEndTime },
                    },
                    isEdit: false,
                }),
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
                resolveInitialPanelRange({
                    ...createBoardRangeParams('now-2h', 'now'),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: 'last-30m',
                        range_end: 'last-10m',
                        time_keeper: undefined,
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                }),
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
                const sExpectedRange = normalizeLegacyTimeRangeBoundary('now-1h', 'now').range;

                await expect(
                    resolveInitialPanelRange({
                        ...createBoardRangeParams('now-2h', 'now'),
                        panelData: createPanelData(undefined),
                        panelTime: createPanelTime({
                            range_bgn: 'now-1h',
                            range_end: 'now',
                            default_range: { min: 1, max: 2 },
                        }),
                        isEdit: false,

                        timeBoundaryRanges: null,
                    }),
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
                resolveInitialPanelRange({
                    ...createBoardRangeParams('', ''),
                    panelData: createPanelData(undefined),
                    panelTime: createPanelTime({
                        range_bgn: '',
                        range_end: '',
                        default_range: { min: 1, max: 2 },
                    }),
                    isEdit: false,

                    timeBoundaryRanges: null,
                }),
            ).resolves.toEqual({
                startTime: 1,
                endTime: 2,
            });
        });
    });
});
