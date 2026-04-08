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
    resolveGlobalTimeTargetRange,
    resolveResetTimeRange,
    resolveTimeKeeperRanges,
    shouldReloadNavigatorData,
} from './PanelRuntimeUtils';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { getDateRange } from '../utils/TagAnalyzerDateUtils';

jest.mock('@/utils/bgnEndTimeRange', () => ({
    getBgnEndTimeRange: jest.fn(),
    subtractTime: jest.fn(),
}));

jest.mock('../utils/TagAnalyzerDateUtils', () => ({
    getDateRange: jest.fn(),
}));

const getBgnEndTimeRangeMock = jest.mocked(getBgnEndTimeRange);
const subtractTimeMock = jest.mocked(subtractTime);
const getDateRangeMock = jest.mocked(getDateRange);

const createPanelData = () =>
    ({
        tag_set: [
            {
                key: 'tag-1',
                table: 'TABLE_A',
                tagName: 'temp_sensor',
            },
        ],
    }) as any;

describe('PanelRuntimeUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSelectionMenuPosition', () => {
        it('returns a default position when the chart rect is missing', () => {
            expect(getSelectionMenuPosition()).toEqual({ x: 10, y: 10 });
        });

        it('offsets the selection menu relative to the chart rect', () => {
            expect(getSelectionMenuPosition({ left: 120, top: 80 })).toEqual({ x: 30, y: 45 });
        });
    });

    describe('getExpandedNavigatorRange', () => {
        it('returns undefined when the event cannot expand the navigator range', () => {
            expect(getExpandedNavigatorRange({ trigger: 'pan', min: 10, max: 20 }, { startTime: 0, endTime: 10000 })).toBeUndefined();
        });

        it('expands the navigator range when the zoom window is too small', () => {
            expect(getExpandedNavigatorRange({ trigger: 'zoom', min: 2000, max: 2050 }, { startTime: 0, endTime: 10000 })).toEqual({
                startTime: 1000,
                endTime: 6025,
            });
        });
    });

    describe('getNavigatorRangeFromEvent', () => {
        it('enforces a minimum navigator span of one second', () => {
            expect(getNavigatorRangeFromEvent({ min: 100, max: 500 })).toEqual({ startTime: 100, endTime: 1100 });
        });

        it('uses the event max when the range is already wide enough', () => {
            expect(getNavigatorRangeFromEvent({ min: 100, max: 1500 })).toEqual({ startTime: 100, endTime: 1500 });
        });
    });

    describe('shouldReloadNavigatorData', () => {
        it('ignores millisecond-only drift within the same second', () => {
            expect(
                shouldReloadNavigatorData(
                    { startTime: 1710000000123, endTime: 1710000010456 },
                    { startTime: 1710000000789, endTime: 1710000010999 },
                ),
            ).toBe(false);
        });

        it('reloads when the second-level range changes', () => {
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
            expect(getZoomInPanelRange({ startTime: 0, endTime: 100 }, 0.25)).toEqual({ startTime: 25, endTime: 75 });
        });

        it('keeps a minimum width when zooming in on a tiny range', () => {
            expect(getZoomInPanelRange({ startTime: 0, endTime: 5 }, 0.5)).toEqual({ startTime: 2.5, endTime: 12.5 });
        });

        it('zooms out and extends the navigator when the new range escapes the current bounds', () => {
            expect(getZoomOutRange({ startTime: 10, endTime: 30 }, { startTime: 5, endTime: 40 }, 1)).toEqual({
                panelRange: { startTime: 5, endTime: 50 },
                navigatorRange: { startTime: 5, endTime: 50 },
            });
        });

        it('focuses on the center of a sufficiently wide panel range', () => {
            expect(getFocusedPanelRange({ startTime: 0, endTime: 1000 })).toEqual({
                panelRange: { startTime: 400, endTime: 600 },
                navigatorRange: { startTime: 0, endTime: 1000 },
            });
        });

        it('does not focus ranges narrower than one second', () => {
            expect(getFocusedPanelRange({ startTime: 0, endTime: 999 })).toBeUndefined();
        });
    });

    describe('move helpers', () => {
        it('moves the panel range left and extends the navigator when needed', () => {
            expect(getMovedPanelRange({ startTime: 100, endTime: 200 }, { startTime: 120, endTime: 220 }, 'left')).toEqual({
                panelRange: { startTime: 50, endTime: 150 },
                navigatorRange: { startTime: 50, endTime: 170 },
            });
        });

        it('moves the panel range right and extends the navigator when needed', () => {
            expect(getMovedPanelRange({ startTime: 100, endTime: 200 }, { startTime: 80, endTime: 180 }, 'right')).toEqual({
                panelRange: { startTime: 150, endTime: 250 },
                navigatorRange: { startTime: 130, endTime: 250 },
            });
        });

        it('moves the navigator left and keeps the main panel within view', () => {
            expect(getMovedNavigatorRange({ startTime: 120, endTime: 180 }, { startTime: 100, endTime: 200 }, 'left')).toEqual({
                panelRange: { startTime: 90, endTime: 150 },
                navigatorRange: { startTime: 50, endTime: 150 },
            });
        });

        it('moves the navigator right and shifts the panel when it falls behind', () => {
            expect(getMovedNavigatorRange({ startTime: 100, endTime: 160 }, { startTime: 90, endTime: 150 }, 'right')).toEqual({
                panelRange: { startTime: 120, endTime: 180 },
                navigatorRange: { startTime: 120, endTime: 180 },
            });
        });
    });

    describe('time keeper helpers', () => {
        it('round-trips the time keeper payload', () => {
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
            expect(resolveTimeKeeperRanges({ startPanelTime: 10, endPanelTime: 20, startNaviTime: 30 })).toBeUndefined();
        });
    });

    describe('presentation helpers', () => {
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

        it('builds the panel presentation text for non-raw charts', () => {
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
            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'now-1h', range_end: 'now' } as any,
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
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-2h') return aEndMax - 2000;
                if (aValue === 'last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'last-30m', range_end: 'last-10m' } as any,
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('resolves relative panel last ranges through the fetched time bounds when no board-level last range applies', async () => {
            getBgnEndTimeRangeMock.mockResolvedValue({ end_max: 12_000 } as any);
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-30m') return aEndMax - 300;
                if (aValue === 'last-10m') return aEndMax - 100;
                return aEndMax;
            });

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'last-30m', range_end: 'last-10m' } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 11_700,
                endTime: 11_900,
            });

            expect(getBgnEndTimeRangeMock).toHaveBeenCalled();
        });

        it('falls back to the resolved now-range helper when the panel ends at now', async () => {
            getDateRangeMock.mockReturnValue({
                startTime: 500,
                endTime: 900,
            } as any);

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'now-1h', range_end: 'now', default_range: { min: 1, max: 2 } } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 500,
                endTime: 900,
            });
        });

        it('treats mixed-case relative now-ranges as relative panel time', async () => {
            getDateRangeMock.mockReturnValue({
                startTime: 600,
                endTime: 950,
            } as any);

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'Now-2h', range_end: 'Now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'Now-1h', range_end: 'Now', default_range: { min: 1, max: 2 } } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 600,
                endTime: 950,
            });
        });

        it('uses absolute numeric panel ranges when they are already concrete', async () => {
            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 10, range_end: 20 } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 10,
                endTime: 20,
            });
        });

        it('falls back to the default board range path when no more specific range applies', async () => {
            getDateRangeMock.mockReturnValue({
                startTime: 700,
                endTime: 800,
            } as any);

            await expect(
                resolveResetTimeRange({
                    boardRange: { range_bgn: '', range_end: '' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: '', range_end: '', default_range: { min: 1, max: 2 } } as any,
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
            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'now-1h', range_end: 'now' } as any,
                    bgnEndTimeRange: { bgn_max: 300, end_max: 400 },
                    isEdit: true,
                }),
            ).resolves.toEqual({
                startTime: 300,
                endTime: 400,
            });
        });

        it('uses the board-level last range in non-edit mode when it exists', async () => {
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-2h') return aEndMax - 2000;
                if (aValue === 'last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'last-2h', range_end: 'last-1h' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'last-30m', range_end: 'last-10m' } as any,
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('treats mixed-case board last ranges as relative board time', async () => {
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'Last-2h') return aEndMax - 2000;
                if (aValue === 'Last-1h') return aEndMax - 1000;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'Last-2h', range_end: 'Last-1h' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'Last-30m', range_end: 'Last-10m' } as any,
                    bgnEndTimeRange: { end_max: 10_000 },
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 8_000,
                endTime: 9_000,
            });
        });

        it('uses the relative panel last range when the board range is not last-based', async () => {
            getBgnEndTimeRangeMock.mockResolvedValue({ end_max: 15_000 } as any);
            subtractTimeMock.mockImplementation((aEndMax: number, aValue: string | number) => {
                if (aValue === 'last-30m') return aEndMax - 300;
                if (aValue === 'last-10m') return aEndMax - 100;
                return aEndMax;
            });

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'last-30m', range_end: 'last-10m' } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 14_700,
                endTime: 14_900,
            });
        });

        it('uses the resolved now-range helper when the panel ends at now', async () => {
            getDateRangeMock.mockReturnValue({
                startTime: 1_100,
                endTime: 1_900,
            } as any);

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: 'now-2h', range_end: 'now' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: 'now-1h', range_end: 'now', default_range: { min: 1, max: 2 } } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 1_100,
                endTime: 1_900,
            });
        });

        it('falls back to the general date-range helper when no special range path applies', async () => {
            getDateRangeMock.mockReturnValue({
                startTime: 2_100,
                endTime: 2_900,
            } as any);

            await expect(
                resolveInitialPanelRange({
                    boardRange: { range_bgn: '', range_end: '' },
                    panelData: createPanelData(),
                    panelTime: { range_bgn: '', range_end: '', default_range: { min: 1, max: 2 } } as any,
                    isEdit: false,
                }),
            ).resolves.toEqual({
                startTime: 2_100,
                endTime: 2_900,
            });
        });
    });
});
