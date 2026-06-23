import { TimeUnit } from '../domain/time/model/TimeTypes';
import { fetchCalculationData, fetchRawData } from './ChartSeriesDataFetcher';
import {
    fetchNavigatorPanelSeriesRows,
    RAW_NAVIGATOR_SAMPLING_VALUE,
} from './PanelSeriesDataRepository';
import type { RuntimePanelSampling, RuntimePanelXAxis } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';

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