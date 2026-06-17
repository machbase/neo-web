import { fetchSeriesDataTimeRange } from '../fetch/DataTimeRangeFetcher';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    createAbsoluteTimeRangeConfig,
    createEmptyTimeRangeConfig,
    createTimeRangeMs,
} from '../domain/time/range/TimeRangeUtils';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { resolveConcretePanelRangeState } from './PanelRangeResolver';

jest.mock('../fetch/DataTimeRangeFetcher', () => ({
    fetchSeriesDataTimeRange: jest.fn(),
}));

const sMockFetchSeriesDataTimeRange =
    fetchSeriesDataTimeRange as jest.MockedFunction<typeof fetchSeriesDataTimeRange>;

const EMPTY_RANGE_CONFIG = createEmptyTimeRangeConfig();
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

describe('resolveConcretePanelRangeState', () => {
    beforeEach(() => {
        const sFullDataTimeRange = createDataTimeRange(0, 400);

        sMockFetchSeriesDataTimeRange.mockResolvedValue(sFullDataTimeRange);
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

function createDataTimeRange(
    startTime: number,
    endTime: number,
): TimeRangeMs {
    return createTimeRangeMs(startTime, endTime);
}
