import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import type {
    AbsoluteTimeBoundary,
    FetchedTimeBoundaryRange,
} from '../domain/time/TimeTypes';
import {
    createAbsoluteTimeRangeConfig,
    createEmptyTimeRangeConfig,
    createTimeRangeMs,
} from '../domain/time/TimeRangeUtils';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { resolveConcretePanelRangeState } from './PanelRangeResolver';

jest.mock('../domain/time/TimeBoundaryRangeResolver', () => ({
    resolveTimeBoundaryRanges: jest.fn(),
    resolveSeriesTimeBoundaryRanges: jest.fn(),
}));

const sMockResolveTimeBoundaryRanges =
    resolveTimeBoundaryRanges as jest.MockedFunction<typeof resolveTimeBoundaryRanges>;
const sMockResolveSeriesTimeBoundaryRanges =
    resolveSeriesTimeBoundaryRanges as jest.MockedFunction<typeof resolveSeriesTimeBoundaryRanges>;

const EMPTY_RANGE_CONFIG = createEmptyTimeRangeConfig();
const SERIES_LIST: PanelSeriesDefinition[] = [];

describe('resolveConcretePanelRangeState', () => {
    beforeEach(() => {
        const sFullBoundaryRange = createBoundaryRange(0, 400);

        sMockResolveTimeBoundaryRanges.mockResolvedValue(sFullBoundaryRange);
        sMockResolveSeriesTimeBoundaryRanges.mockResolvedValue(sFullBoundaryRange);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('uses centered 25 percent main chart window on first initialization', async () => {
        await expect(
            resolveConcretePanelRangeState({
                seriesList: SERIES_LIST,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: EMPTY_RANGE_CONFIG,
                applyInitialMainChartWindow: true,
            }),
        ).resolves.toEqual({
            panelRange: createTimeRangeMs(150, 250),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('preserves a valid saved last viewed range', async () => {
        const sLastViewedRange = {
            panelRange: createTimeRangeMs(120, 180),
            navigatorRange: createTimeRangeMs(50, 250),
        };

        await expect(
            resolveConcretePanelRangeState({
                seriesList: SERIES_LIST,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: sLastViewedRange,
                boardTime: EMPTY_RANGE_CONFIG,
                applyInitialMainChartWindow: true,
            }),
        ).resolves.toEqual({
            panelRange: sLastViewedRange.panelRange,
            navigatorRange: sLastViewedRange.navigatorRange,
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('preserves explicit panel and board time ranges', async () => {
        await expect(
            resolveConcretePanelRangeState({
                seriesList: SERIES_LIST,
                rangeConfig: createAbsoluteTimeRangeConfig(100, 200),
                lastViewedRange: undefined,
                boardTime: EMPTY_RANGE_CONFIG,
                applyInitialMainChartWindow: true,
            }),
        ).resolves.toEqual({
            panelRange: createTimeRangeMs(100, 200),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });

        await expect(
            resolveConcretePanelRangeState({
                seriesList: SERIES_LIST,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: createAbsoluteTimeRangeConfig(220, 320),
                applyInitialMainChartWindow: true,
            }),
        ).resolves.toEqual({
            panelRange: createTimeRangeMs(220, 320),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('keeps full range when initial main chart window is not requested', async () => {
        await expect(
            resolveConcretePanelRangeState({
                seriesList: SERIES_LIST,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: EMPTY_RANGE_CONFIG,
            }),
        ).resolves.toEqual({
            panelRange: createTimeRangeMs(0, 400),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });
});

function createBoundaryRange(
    startTime: number,
    endTime: number,
): FetchedTimeBoundaryRange {
    return {
        start: {
            min: createBoundaryTimestamp(startTime),
            max: createBoundaryTimestamp(startTime),
        },
        end: {
            min: createBoundaryTimestamp(endTime),
            max: createBoundaryTimestamp(endTime),
        },
    };
}

function createBoundaryTimestamp(timestamp: number): AbsoluteTimeBoundary {
    return { kind: 'absolute', timestamp };
}
