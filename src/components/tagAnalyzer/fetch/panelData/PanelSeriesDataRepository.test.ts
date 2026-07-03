import { TimeUnit } from '../../domain/time/TimeTypes';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import {
    fetchCalculationData,
    fetchRawData,
} from './ChartSeriesDataFetcher';
import {
    MAIN_CALCULATED_FETCH_ROW_LIMIT,
    MAIN_NUMERIC_VISIBLE_BUCKET_TARGET,
    NAVIGATOR_CALCULATED_FETCH_ROW_LIMIT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
} from './PanelSeriesDataRepository';

jest.mock('./ChartSeriesDataFetcher', () => ({
    fetchCalculationData: jest.fn(),
    fetchRawData: jest.fn(),
}));

const mockedFetchCalculationData = fetchCalculationData as jest.MockedFunction<
    typeof fetchCalculationData
>;
const mockedFetchRawData = fetchRawData as jest.MockedFunction<typeof fetchRawData>;

const NUMERIC_SERIES: PanelSeriesDefinition = {
    key: 'SYS.DISTANCE_SENSOR:SENSOR_02',
    table: 'SYS.DISTANCE_SENSOR',
    sourceTagName: 'SENSOR_02',
    alias: 'SENSOR_02',
    calculationMode: 'avg',
    useSecondaryAxis: false,
    id: 'SENSOR_02',
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'ODOMETER_M',
        value: 'VALUE',
        timeBaseTime: true,
        timeType: 20,
    },
};

const DATETIME_ROLLUP_SERIES: PanelSeriesDefinition = {
    key: 'SYS.SENSOR:SENSOR_02',
    table: 'SYS.SENSOR',
    sourceTagName: 'SENSOR_02',
    alias: 'SENSOR_02',
    calculationMode: 'avg',
    useSecondaryAxis: false,
    id: 'SENSOR_02',
    useRollupTable: true,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: true,
        timeType: 6,
    },
};

describe('fetchMainPanelSeriesRows', () => {
    beforeEach(() => {
        mockedFetchCalculationData.mockReset();
        mockedFetchRawData.mockReset();
        mockedFetchCalculationData.mockResolvedValue({
            data: {
                column: ['TIME', 'VALUE'],
                rows: [],
            },
        });
    });

    it('targets about 1000 visible numeric buckets plus side prefetch', async () => {
        const result = await fetchMainPanelSeriesRows(
            [NUMERIC_SERIES],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            false,
            true,
            {
                startTime: 0,
                endTime: 150000,
            },
            {
                IntervalType: TimeUnit.Day,
                IntervalValue: 1,
            },
            {},
            {
                startTime: 50000,
                endTime: 100000,
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                Count: MAIN_NUMERIC_VISIBLE_BUCKET_TARGET * 3,
                isRollup: false,
            }),
        );
        expect(result?.numericInterval).toBe(50);
        expect(result?.seriesFetchResults[0].usesRollup).toBe(false);
    });

    it('does not use rollup when the runtime interval is smaller than the available rollup', async () => {
        const result = await fetchMainPanelSeriesRows(
            [DATETIME_ROLLUP_SERIES],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            false,
            true,
            {
                startTime: 0,
                endTime: 600000,
            },
            {
                IntervalType: TimeUnit.Second,
                IntervalValue: 20,
            },
            {
                SYS: {
                    'MACHBASEDB.SENSOR': {
                        VALUE: ['60000'],
                        EXT_TYPE: ['0'],
                    },
                },
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                IntervalType: TimeUnit.Second,
                IntervalValue: 20,
                isRollup: false,
            }),
        );
        expect(result?.seriesFetchResults[0].usesRollup).toBe(false);
    });

    it('uses rollup when the runtime interval can be served by an available rollup', async () => {
        const result = await fetchMainPanelSeriesRows(
            [DATETIME_ROLLUP_SERIES],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            false,
            true,
            {
                startTime: 0,
                endTime: 600000,
            },
            {
                IntervalType: TimeUnit.Minute,
                IntervalValue: 10,
            },
            {
                SYS: {
                    'MACHBASEDB.SENSOR': {
                        VALUE: ['60000'],
                        EXT_TYPE: ['0'],
                    },
                },
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                Count: MAIN_CALCULATED_FETCH_ROW_LIMIT,
                IntervalType: TimeUnit.Minute,
                IntervalValue: 10,
                isRollup: true,
                rollupColumnName: 'VALUE',
            }),
        );
        expect(result?.seriesFetchResults[0].usesRollup).toBe(true);
    });

    it('uses a one second rollup for a fifteen second runtime interval even when saved rollup metadata is stale', async () => {
        const result = await fetchMainPanelSeriesRows(
            [
                {
                    ...DATETIME_ROLLUP_SERIES,
                    useRollupTable: false,
                },
            ],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            false,
            true,
            {
                startTime: 0,
                endTime: 600000,
            },
            {
                IntervalType: TimeUnit.Second,
                IntervalValue: 15,
            },
            {
                SYS: {
                    'MACHBASEDB.SENSOR': {
                        VALUE: ['1000'],
                        EXT_TYPE: ['0'],
                    },
                },
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                IntervalType: TimeUnit.Second,
                IntervalValue: 15,
                isRollup: true,
                rollupColumnName: 'VALUE',
            }),
        );
        expect(result?.seriesFetchResults[0].usesRollup).toBe(true);
    });

    it('does not include interval fields in raw main fetch requests', async () => {
        mockedFetchRawData.mockResolvedValue({
            data: {
                column: ['TIME', 'VALUE'],
                rows: [],
            },
        });

        const result = await fetchMainPanelSeriesRows(
            [DATETIME_ROLLUP_SERIES],
            0,
            TimeUnit.Second,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            true,
            true,
            {
                startTime: 0,
                endTime: 600000,
            },
        );

        expect(mockedFetchRawData).toHaveBeenCalledWith(
            expect.not.objectContaining({
                CalculationMode: expect.anything(),
                IntervalType: expect.anything(),
                IntervalValue: expect.anything(),
            }),
        );
        expect(result?.interval).toBeUndefined();
    });

    it('uses the smaller fixed calculated limit for navigator requests', async () => {
        const result = await fetchNavigatorPanelSeriesRows(
            [DATETIME_ROLLUP_SERIES],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            500,
            false,
            {
                startTime: 0,
                endTime: 600000,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            {
                SYS: {
                    'MACHBASEDB.SENSOR': {
                        VALUE: ['1000'],
                        EXT_TYPE: ['0'],
                    },
                },
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                Count: NAVIGATOR_CALCULATED_FETCH_ROW_LIMIT,
                isRollup: true,
                rollupColumnName: 'VALUE',
            }),
        );
        expect(result?.count).toBe(NAVIGATOR_CALCULATED_FETCH_ROW_LIMIT);
    });

    it('passes the matched JSON-path rollup column when one is available', async () => {
        await fetchMainPanelSeriesRows(
            [
                {
                    ...DATETIME_ROLLUP_SERIES,
                    sourceColumns: {
                        ...DATETIME_ROLLUP_SERIES.sourceColumns,
                        value: 'VALUE',
                        jsonKey: 'metrics.temperature',
                    },
                },
            ],
            0,
            undefined,
            {
                showTickline: false,
                rawDataPixelsPerTick: 1,
                calculatedDataPixelsPerTick: 2,
                calculatedNavigatorPixelsPerTick: 1,
            },
            {
                enabled: false,
                sampleCount: 0,
            },
            500,
            false,
            true,
            {
                startTime: 0,
                endTime: 600000,
            },
            {
                IntervalType: TimeUnit.Minute,
                IntervalValue: 10,
            },
            {
                SYS: {
                    'MACHBASEDB.SENSOR': {
                        'VALUE->$metrics.temperature': ['60000'],
                        VALUE: ['60000'],
                        EXT_TYPE: ['0', '0'],
                    },
                },
            },
        );

        expect(mockedFetchCalculationData).toHaveBeenCalledWith(
            expect.objectContaining({
                isRollup: true,
                rollupColumnName: 'VALUE->$metrics.temperature',
            }),
        );
    });
});
