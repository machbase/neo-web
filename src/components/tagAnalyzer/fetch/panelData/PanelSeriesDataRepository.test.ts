import { TimeUnit } from '../../domain/time/TimeTypes';
import { fetchCalculationData, fetchRawData } from './ChartSeriesDataFetcher';
import {
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
    RAW_NAVIGATOR_SAMPLING_VALUE,
} from './PanelSeriesDataRepository';
import type { RuntimePanelSampling, RuntimePanelXAxis } from '../../domain/panel/PanelRuntime';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';

jest.mock('./ChartSeriesDataFetcher', () => ({
    fetchCalculationData: jest.fn(),
    fetchRawData: jest.fn(),
}));

const fetchCalculationDataMock = jest.mocked(fetchCalculationData);
const fetchRawDataMock = jest.mocked(fetchRawData);

const xAxis: RuntimePanelXAxis = {
    showTickline: false,
    rawDataPixelsPerTick: 0.1,
    calculatedDataPixelsPerTick: 3,
    calculatedNavigatorPixelsPerTick: 3,
};

const rawNavigatorSamplingOff: RuntimePanelSampling = {
    enabled: false,
    sampleCount: RAW_NAVIGATOR_SAMPLING_VALUE,
};

const rawNavigatorSamplingOn: RuntimePanelSampling = {
    enabled: true,
    sampleCount: RAW_NAVIGATOR_SAMPLING_VALUE,
};

const series: PanelSeriesDefinition = {
    key: 'series-1',
    table: 'tag_table',
    sourceTagName: 'tag_a',
    alias: 'Tag A',
    calculationMode: 'max',
    color: undefined,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
    },
};

const secondSeries: PanelSeriesDefinition = {
    ...series,
    key: 'series-2',
    sourceTagName: 'tag_b',
    alias: 'Tag B',
};

const numericSeries: PanelSeriesDefinition = {
    ...series,
    key: 'numeric-series-1',
    sourceColumns: {
        ...series.sourceColumns,
        timeBaseTime: true,
        timeType: 0,
    },
};

const range = {
    startTime: 0,
    endTime: 60000,
};

function mockFetchResponse(): void {
    const response = {
        data: {
            column: ['TIME', 'VALUE'],
            rows: [],
        },
    };

    fetchCalculationDataMock.mockResolvedValue(response);
    fetchRawDataMock.mockResolvedValue(response);
}

describe('fetchNavigatorPanelSeriesRows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchResponse();
    });

    it('uses average calculation for raw navigator by default', async () => {
        await fetchNavigatorPanelSeriesRows(
            [series],
            0,
            undefined,
            xAxis,
            900,
            true,
            range,
            rawNavigatorSamplingOff,
            {},
        );

        expect(fetchCalculationDataMock).toHaveBeenCalledWith(
            expect.objectContaining({
                CalculationMode: 'avg',
            }),
        );
        expect(fetchRawDataMock).not.toHaveBeenCalled();
    });

    it('uses raw database sampling when raw navigator sampling is enabled', async () => {
        await fetchNavigatorPanelSeriesRows(
            [series],
            0,
            undefined,
            xAxis,
            900,
            true,
            range,
            rawNavigatorSamplingOn,
            {},
        );

        expect(fetchRawDataMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sampling: {
                    kind: 'enabled',
                    value: RAW_NAVIGATOR_SAMPLING_VALUE,
                },
            }),
        );
        expect(fetchCalculationDataMock).not.toHaveBeenCalled();
    });

    it('forces raw sampling for numeric raw navigator', async () => {
        await fetchNavigatorPanelSeriesRows(
            [numericSeries],
            0,
            undefined,
            xAxis,
            900,
            true,
            range,
            rawNavigatorSamplingOff,
            {},
        );

        expect(fetchRawDataMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sampling: {
                    kind: 'enabled',
                    value: RAW_NAVIGATOR_SAMPLING_VALUE,
                },
            }),
        );
        expect(fetchCalculationDataMock).not.toHaveBeenCalled();
    });

    it('keeps the requested raw mode in the navigator result metadata', async () => {
        const result = await fetchNavigatorPanelSeriesRows(
            [series],
            0,
            undefined,
            xAxis,
            900,
            true,
            range,
            rawNavigatorSamplingOff,
            {},
        );

        expect(result?.isRaw).toBe(true);
        expect(result?.interval.IntervalType).toBe(TimeUnit.Second);
    });
});
describe('fetchMainPanelSeriesRows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchResponse();
    });

    it('keeps successful series and records failed series errors', async () => {
        fetchCalculationDataMock
            .mockResolvedValueOnce({
                data: {
                    column: ['TIME', 'VALUE'],
                    rows: [[1000, 1]],
                },
            })
            .mockRejectedValueOnce(new Error('missing table'));

        const result = await fetchMainPanelSeriesRows(
            [series, secondSeries],
            100,
            undefined,
            xAxis,
            rawNavigatorSamplingOff,
            900,
            false,
            true,
            range,
            {},
        );

        expect(result?.seriesFetchResults).toHaveLength(2);
        expect(result?.seriesFetchResults[0].error).toBeUndefined();
        expect(result?.seriesFetchResults[0].fetchResult.data?.rows).toEqual([[1000, 1]]);
        expect(result?.seriesFetchResults[1].error).toEqual({
            kind: 'request-failed',
            message: 'missing table',
        });
        expect(result?.seriesFetchResults[1].fetchResult.data?.rows).toEqual([]);
    });

    it('returns empty errored series results when all main series fail', async () => {
        fetchCalculationDataMock.mockRejectedValue(new Error('missing table'));

        const result = await fetchMainPanelSeriesRows(
            [series, secondSeries],
            100,
            undefined,
            xAxis,
            rawNavigatorSamplingOff,
            900,
            false,
            true,
            range,
            {},
        );

        expect(result?.seriesFetchResults).toHaveLength(2);
        expect(
            result?.seriesFetchResults.every(
                (seriesResult) => seriesResult.error?.message === 'missing table',
            ),
        ).toBe(true);
        expect(
            result?.seriesFetchResults.every(
                (seriesResult) => seriesResult.fetchResult.data?.rows?.length === 0,
            ),
        ).toBe(true);
    });
});

describe('fetchNavigatorPanelSeriesRows error tolerance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('records navigator series errors without rejecting the whole fetch', async () => {
        fetchCalculationDataMock.mockRejectedValue(new Error('missing table'));

        const result = await fetchNavigatorPanelSeriesRows(
            [series, secondSeries],
            0,
            undefined,
            xAxis,
            900,
            false,
            range,
            rawNavigatorSamplingOff,
            {},
        );

        expect(result?.seriesFetchResults).toHaveLength(2);
        expect(
            result?.seriesFetchResults.every(
                (seriesResult) => seriesResult.error?.message === 'missing table',
            ),
        ).toBe(true);
    });
});
