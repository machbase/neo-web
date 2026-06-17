import { fetchSeriesDataTimeRange } from '../fetch/DataTimeRangeFetcher';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    createAbsoluteTimeRangeConfig,
    createEmptyTimeRangeConfig,
    createTimeRangeMs,
} from '../domain/time/range/TimeRangeUtils';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import {
    getFullRangeFromSeries,
    resolveConcretePanelRangeState,
} from './PanelRangeResolver';

jest.mock('../fetch/DataTimeRangeFetcher', () => ({
    fetchSeriesDataTimeRange: jest.fn(),
}));

const sMockFetchSeriesDataTimeRange =
    fetchSeriesDataTimeRange as jest.MockedFunction<typeof fetchSeriesDataTimeRange>;

const EMPTY_RANGE_CONFIG = createEmptyTimeRangeConfig();
const FULL_RANGE = createDataTimeRange(0, 400);
const SERIES_LIST: PanelSeriesDefinition[] = [
    {
        key: 'series-1',
        table: 'table_1',
        sourceTagName: 'tag_1',
        alias: 'tag_1',
        calculationMode: 'avg',
        useSecondaryAxis: false,
        id: 'series-1',
        useRollupTable: false,
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
    },
];

describe('getFullRangeFromSeries', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('returns valid full range from series data', async () => {
        sMockFetchSeriesDataTimeRange.mockResolvedValue(FULL_RANGE);

        await expect(getFullRangeFromSeries(SERIES_LIST)).resolves.toEqual(
            FULL_RANGE,
        );
    });

    test('returns undefined when series data range is invalid', async () => {
        sMockFetchSeriesDataTimeRange.mockResolvedValue(createTimeRangeMs(0, 0));

        await expect(getFullRangeFromSeries(SERIES_LIST)).resolves.toBeUndefined();
    });
});

describe('resolveConcretePanelRangeState', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('uses centered 25 percent main chart window on first initialization', () => {
        expect(
            resolveConcretePanelRangeState({
                fullRange: FULL_RANGE,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: EMPTY_RANGE_CONFIG,
                applyInitialMainChartWindow: true,
            }),
        ).toEqual({
            panelRange: createTimeRangeMs(150, 250),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('preserves a valid saved last viewed range', () => {
        const sLastViewedRange = {
            panelRange: createTimeRangeMs(120, 180),
            navigatorRange: createTimeRangeMs(50, 250),
        };

        expect(
            resolveConcretePanelRangeState({
                fullRange: FULL_RANGE,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: sLastViewedRange,
                boardTime: EMPTY_RANGE_CONFIG,
                applyInitialMainChartWindow: true,
            }),
        ).toEqual({
            panelRange: sLastViewedRange.panelRange,
            navigatorRange: sLastViewedRange.navigatorRange,
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('uses panel time before board time', () => {
        expect(
            resolveConcretePanelRangeState({
                fullRange: FULL_RANGE,
                rangeConfig: createAbsoluteTimeRangeConfig(100, 200),
                lastViewedRange: undefined,
                boardTime: createAbsoluteTimeRangeConfig(220, 320),
                applyInitialMainChartWindow: true,
            }),
        ).toEqual({
            panelRange: createTimeRangeMs(100, 200),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('uses board time before full range fallback', () => {
        expect(
            resolveConcretePanelRangeState({
                fullRange: FULL_RANGE,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: createAbsoluteTimeRangeConfig(220, 320),
                applyInitialMainChartWindow: true,
            }),
        ).toEqual({
            panelRange: createTimeRangeMs(220, 320),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });

    test('keeps full range when initial main chart window is not requested', () => {
        expect(
            resolveConcretePanelRangeState({
                fullRange: FULL_RANGE,
                rangeConfig: EMPTY_RANGE_CONFIG,
                lastViewedRange: undefined,
                boardTime: EMPTY_RANGE_CONFIG,
            }),
        ).toEqual({
            panelRange: createTimeRangeMs(0, 400),
            navigatorRange: createTimeRangeMs(0, 400),
            fullRange: createTimeRangeMs(0, 400),
        });
    });
});

function createDataTimeRange(
    startTime: number,
    endTime: number,
): TimeRangeMs {
    return createTimeRangeMs(startTime, endTime);
}
