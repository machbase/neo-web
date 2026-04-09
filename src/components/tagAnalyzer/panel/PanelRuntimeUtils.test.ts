import {
    buildPanelPresentationState,
    createPanelTimeKeeperPayload,
    getExpandedNavigatorRange,
    getFocusedPanelRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getNavigatorRangeFromEvent,
    getSelectionMenuPosition,
    getZoomInPanelRange,
    getZoomOutRange,
    resolveInitialPanelRange,
    resolveAppliedPanelRange,
    resolveGlobalTimeTargetRange,
    resolveResetTimeRange,
    resolveTimeKeeperRanges,
    shouldReloadNavigatorData,
} from './PanelRuntimeUtils';
import { subtractTime } from '@/utils/bgnEndTimeRange';
import { getDateRange } from '../utils/TagAnalyzerDateUtils';
import { callTagAnalyzerBgnEndTimeRange } from '../TagAnalyzerUtilCaller';
import {
    createEmptyTagAnalyzerPanelTimeFixture as createPanelTime,
    createTagAnalyzerPanelDataFixture as createPanelData,
} from '../TestData/PanelTestData';

jest.mock('@/utils/bgnEndTimeRange', () => ({
    subtractTime: jest.fn(),
}));

jest.mock('../utils/TagAnalyzerDateUtils', () => ({
    getDateRange: jest.fn(),
}));

jest.mock('../TagAnalyzerUtilCaller', () => ({
    callTagAnalyzerBgnEndTimeRange: jest.fn(),
}));

const subtractTimeMock = jest.mocked(subtractTime);
const getDateRangeMock = jest.mocked(getDateRange);
const callTagAnalyzerBgnEndTimeRangeMock = jest.mocked(callTagAnalyzerBgnEndTimeRange);

describe('PanelRuntimeUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSelectionMenuPosition', () => {
        it('returns a default position when the chart rect is missing', () => {
            // Confirms the popover still opens in a predictable fallback spot without chart bounds.
            expect(getSelectionMenuPosition()).toEqual({ x: 10, y: 10 });
        });

        it('offsets the selection menu relative to the chart rect', () => {
            // Confirms the popover is positioned relative to the chart instead of the page origin.
            expect(getSelectionMenuPosition({ left: 120, top: 80 })).toEqual({ x: 30, y: 45 });
        });
    });

    describe('getExpandedNavigatorRange', () => {
        it('returns undefined when the event cannot expand the navigator range', () => {
            // Confirms only brush-zoom events can trigger navigator widening.
            expect(
                getExpandedNavigatorRange(
                    { trigger: 'pan' as unknown as 'dataZoom', min: 10, max: 20 },
                    { startTime: 0, endTime: 10000 },
                ),
            ).toBeUndefined();
        });

        it('expands the navigator range when the zoom window is too small', () => {
            // Confirms narrow brush zooms widen the navigator so the selected slice stays workable.
            expect(getExpandedNavigatorRange({ trigger: 'brushZoom', min: 2000, max: 2050 }, { startTime: 0, endTime: 10000 })).toEqual({
                startTime: 1000,
                endTime: 6025,
            });
        });
    });

    describe('resolveAppliedPanelRange', () => {
        it('prefers the overflow range when fetch results clamp the requested window', () => {
            // Confirms overflow-corrected ranges win over the originally requested range.
            expect(
                resolveAppliedPanelRange(
                    { startTime: 100, endTime: 200 },
                    { startTime: 120, endTime: 180 },
                ),
            ).toEqual({ startTime: 120, endTime: 180 });
        });

        it('keeps the requested range when there is no overflow clamp', () => {
            // Confirms the helper is a no-op when fetches return the requested window unchanged.
            expect(resolveAppliedPanelRange({ startTime: 100, endTime: 200 }, null)).toEqual({
                startTime: 100,
                endTime: 200,
            });
        });
    });

    describe('getNavigatorRangeFromEvent', () => {
        it('enforces a minimum navigator span of one second', () => {
            // Confirms tiny drag windows are widened to the footer's minimum span.
            expect(getNavigatorRangeFromEvent({ min: 100, max: 500 })).toEqual({ startTime: 100, endTime: 1100 });
        });

        it('uses the event max when the range is already wide enough', () => {
            // Confirms already valid navigator windows are preserved as-is.
            expect(getNavigatorRangeFromEvent({ min: 100, max: 1500 })).toEqual({ startTime: 100, endTime: 1500 });
        });
    });

    describe('shouldReloadNavigatorData', () => {
        it('ignores millisecond-only drift within the same second', () => {
            // Confirms minor millisecond drift does not trigger navigator reload churn.
            expect(
                shouldReloadNavigatorData(
                    { startTime: 1710000000123, endTime: 1710000010456 },
                    { startTime: 1710000000789, endTime: 1710000010999 },
                ),
            ).toBe(false);
        });

        it('reloads when the second-level range changes', () => {
            // Confirms crossing a new second bucket forces navigator data to refresh.
            expect(
                shouldReloadNavigatorData(
                    { startTime: 1710000000123, endTime: 1710000010456 },
                    { startTime: 1710000000123, endTime: 1710000020456 },
                ),
            ).toBe(true);
        });
    });

    describe('zoom helpers', () => {
        it('zooms in around the middle of the panel range', () => {
            // Confirms zoom-in keeps the center point stable while shrinking the window.
            expect(getZoomInPanelRange({ startTime: 0, endTime: 100 }, 0.25)).toEqual({ startTime: 25, endTime: 75 });
        });

        it('keeps a minimum width when zooming in on a tiny range', () => {
            // Confirms zoom-in never collapses the panel range below the minimum width.
            expect(getZoomInPanelRange({ startTime: 0, endTime: 5 }, 0.5)).toEqual({ startTime: 2.5, endTime: 12.5 });
        });

        it('zooms out and extends the navigator when the new range escapes the current bounds', () => {
            // Confirms zoom-out widens both the panel and navigator when needed.
            expect(getZoomOutRange({ startTime: 10, endTime: 30 }, { startTime: 5, endTime: 40 }, 1)).toEqual({
                panelRange: { startTime: 5, endTime: 50 },
                navigatorRange: { startTime: 5, endTime: 50 },
            });
        });

        it('focuses on the center of a sufficiently wide panel range and halves the slider range', () => {
            // Confirms focus mode narrows the panel and shrinks the slider window around the current panel center.
            expect(getFocusedPanelRange({ startTime: 0, endTime: 1000 }, { startTime: 0, endTime: 4000 })).toEqual({
                panelRange: { startTime: 400, endTime: 600 },
                navigatorRange: { startTime: 0, endTime: 2000 },
            });
        });

        it('does not focus ranges narrower than one second', () => {
            // Confirms focus mode refuses windows that are already too narrow to shrink again.
            expect(getFocusedPanelRange({ startTime: 0, endTime: 999 }, { startTime: 0, endTime: 4000 })).toBeUndefined();
        });
    });

    describe('move helpers', () => {
        it('moves the panel range left and extends the navigator when needed', () => {
            // Confirms left shifts widen the navigator if the panel would move outside it.
            expect(getMovedPanelRange({ startTime: 100, endTime: 200 }, { startTime: 120, endTime: 220 }, 'left')).toEqual({
                panelRange: { startTime: 50, endTime: 150 },
                navigatorRange: { startTime: 50, endTime: 170 },
            });
        });

        it('moves the panel range right and extends the navigator when needed', () => {
            // Confirms right shifts widen the navigator when the panel reaches the current edge.
            expect(getMovedPanelRange({ startTime: 100, endTime: 200 }, { startTime: 80, endTime: 180 }, 'right')).toEqual({
                panelRange: { startTime: 150, endTime: 250 },
                navigatorRange: { startTime: 130, endTime: 250 },
            });
        });

        it('moves the navigator left and keeps the main panel within view', () => {
            // Confirms leftward navigator shifts move the main panel with the overview window.
            expect(getMovedNavigatorRange({ startTime: 120, endTime: 180 }, { startTime: 100, endTime: 200 }, 'left')).toEqual({
                panelRange: { startTime: 70, endTime: 130 },
                navigatorRange: { startTime: 50, endTime: 150 },
            });
        });

        it('moves the navigator right and shifts the panel when it falls behind', () => {
            // Confirms rightward navigator shifts move the panel by the same overview offset.
            expect(getMovedNavigatorRange({ startTime: 100, endTime: 160 }, { startTime: 90, endTime: 150 }, 'right')).toEqual({
                panelRange: { startTime: 130, endTime: 190 },
                navigatorRange: { startTime: 120, endTime: 180 },
            });
        });
    });

    describe('time keeper helpers', () => {
        it('round-trips the time keeper payload', () => {
            // Confirms persisted panel and navigator ranges deserialize back to the same values.
            const payload = createPanelTimeKeeperPayload(
                { startTime: 10, endTime: 20 },
                { startTime: 30, endTime: 40 },
            );

            expect(payload).toEqual({
                startPanelTime: 10,
                endPanelTime: 20,
                startNaviTime: 30,
                endNaviTime: 40,
            });

            expect(resolveTimeKeeperRanges(payload)).toEqual({
                panelRange: { startTime: 10, endTime: 20 },
                navigatorRange: { startTime: 30, endTime: 40 },
            });
        });

        it('returns undefined when the time keeper is incomplete', () => {
            // Confirms partial time-keeper payloads are rejected instead of guessing missing values.
            expect(resolveTimeKeeperRanges({ startPanelTime: 10, endPanelTime: 20, startNaviTime: 30 })).toBeUndefined();
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

        it('builds the panel presentation text for non-raw charts', () => {
            // Confirms non-raw panels include both the time label and the interval label.
            expect(
                buildPanelPresentationState({
                    title: 'Chart A',
                    panelRange: { startTime: 10, endTime: 20 },
                    rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
                    isEdit: false,
                    isRaw: false,
                    isSelectedForOverlap: true,
                    isOverlapAnchor: false,
                    canToggleOverlap: true,
                    isDragSelectActive: false,
                    canOpenFft: true,
                    canSaveLocal: false,
                    changeUtcToText: (aUtc) => `T${aUtc}`,
                }),
            ).toEqual({
                title: 'Chart A',
                timeText: 'T10 ~ T20',
                intervalText: '5sec',
                isEdit: false,
                isRaw: false,
                isSelectedForOverlap: true,
                isOverlapAnchor: false,
                canToggleOverlap: true,
                isDragSelectActive: false,
                canOpenFft: true,
                canSaveLocal: false,
            });
        });

        it('suppresses the interval text for raw charts', () => {
            // Confirms raw panels hide interval text because they are not interval-based.
            expect(
                buildPanelPresentationState({
                    title: 'Chart B',
                    panelRange: { startTime: 10, endTime: 20 },
                    rangeOption: { IntervalType: 'sec', IntervalValue: 5 },
                    isEdit: true,
                    isRaw: true,
                    isSelectedForOverlap: false,
                    isOverlapAnchor: true,
                    canToggleOverlap: false,
                    isDragSelectActive: true,
                    canOpenFft: false,
                    canSaveLocal: true,
                    changeUtcToText: (aUtc) => `T${aUtc}`,
                }).intervalText,
            ).toBe('');
        });
    });

    describe('resolveResetTimeRange', () => {
        it('uses the edit preview bounds when edit mode already has concrete min/max values', async () => {
            // Confirms edit mode prefers the already-fetched preview bounds over relative-time resolution.
            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'now-1h', range_end: 'now' }),
                    bgnEndTimeRange: { bgn_min: 100, end_max: 200 },
                    isEdit: true,
                }),
            ).resolves.toEqual({
                startTime: 100,
                endTime: 200,
            });

            expect(getDateRangeMock).not.toHaveBeenCalled();
        });

        it('uses the board-level last range before the panel-specific range logic', async () => {
            // Confirms board-level last-ranges take priority over panel-level relative rules.
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-2h') return aEndMax - 2000;
                if (aValue === 'last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'last-30m', range_end: 'last-10m' }),
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('resolves relative panel last ranges through the fetched time bounds when no board-level last range applies', async () => {
            // Confirms panel-level last-ranges are resolved from fetched tag time bounds.
            callTagAnalyzerBgnEndTimeRangeMock.mockResolvedValue({
                bgn_min: 0,
                bgn_max: 0,
                end_min: 0,
                end_max: 12_000,
            });
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-30m') return aEndMax - 300;
                if (aValue === 'last-10m') return aEndMax - 100;
                return aEndMax;
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'last-30m', range_end: 'last-10m' }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 11_700,
                endTime: 11_900,
            });

            expect(callTagAnalyzerBgnEndTimeRangeMock).toHaveBeenCalled();
        });

        it('falls back to the resolved now-range helper when the panel ends at now', async () => {
            // Confirms now-relative panel ranges fall back to the shared date-range helper.
            getDateRangeMock.mockReturnValue({
                startTime: 500,
                endTime: 900,
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'now-1h', range_end: 'now', default_range: { min: 1, max: 2 } }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 500,
                endTime: 900,
            });
        });

        it('treats mixed-case relative now-ranges as relative panel time', async () => {
            // Confirms relative-time parsing stays case-insensitive for now-based ranges.
            getDateRangeMock.mockReturnValue({
                startTime: 600,
                endTime: 950,
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'Now-2h', range_end: 'Now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'Now-1h', range_end: 'Now', default_range: { min: 1, max: 2 } }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 600,
                endTime: 950,
            });
        });

        it('uses absolute numeric panel ranges when they are already concrete', async () => {
            // Confirms literal numeric panel ranges bypass the relative-time helpers entirely.
            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 10, range_end: 20 }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 10,
                endTime: 20,
            });
        });

        it('falls back to the default board range path when no more specific range applies', async () => {
            // Confirms the default board range is the final fallback for reset resolution.
            getDateRangeMock.mockReturnValue({
                startTime: 700,
                endTime: 800,
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: '', range_end: '' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: '', range_end: '', default_range: { min: 1, max: 2 } }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 700,
                endTime: 800,
            });
        });
    });

    describe('resolveInitialPanelRange', () => {
        it('uses the edit board last range in edit mode when concrete bounds already exist', async () => {
            // Confirms edit mode initialization prefers the already-fetched board bounds.
            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'now-1h', range_end: 'now' }),
                    bgnEndTimeRange: { bgn_max: 300, end_max: 400 },
                    isEdit: true,
                }),
            ).resolves.toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('uses the board-level last range in non-edit mode when it exists', async () => {
            // Confirms board-level last-ranges seed the first visible panel range.
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-2h') return aEndMax - 2000;
                if (aValue === 'last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'last-30m', range_end: 'last-10m' }),
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('treats mixed-case board last ranges as relative board time', async () => {
            // Confirms board-level relative parsing stays case-insensitive during initialization.
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'Last-2h') return aEndMax - 2000;
                if (aValue === 'Last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'Last-2h', range_end: 'Last-1h' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'Last-30m', range_end: 'Last-10m' }),
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('uses the relative panel last range when the board range is not last-based', async () => {
            // Confirms panel-level last-ranges resolve from fetched panel bounds when needed.
            callTagAnalyzerBgnEndTimeRangeMock.mockResolvedValue({
                bgn_min: 0,
                bgn_max: 0,
                end_min: 0,
                end_max: 15_000,
            });
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-30m') return aEndMax - 300;
                if (aValue === 'last-10m') return aEndMax - 100;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'last-30m', range_end: 'last-10m' }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 14_700,
                endTime: 14_900,
            });
        });

        it('uses the resolved now-range helper when the panel ends at now', async () => {
            // Confirms now-relative panel ranges initialize through the shared date helper.
            getDateRangeMock.mockReturnValue({
                startTime: 1_100,
                endTime: 1_900,
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: 'now-1h', range_end: 'now', default_range: { min: 1, max: 2 } }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 1_100,
                endTime: 1_900,
            });
        });

        it('falls back to the general date-range helper when no special range path applies', async () => {
            // Confirms the shared date-range helper is the final initialization fallback.
            getDateRangeMock.mockReturnValue({
                startTime: 2_100,
                endTime: 2_900,
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: '', range_end: '' },
                    panelData: createPanelData(),
                    panelTime: createPanelTime({ range_bgn: '', range_end: '', default_range: { min: 1, max: 2 } }),
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 2_100,
                endTime: 2_900,
            });
        });
    });
});
