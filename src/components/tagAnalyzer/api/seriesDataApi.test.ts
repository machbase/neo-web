import request from '@/api/core';
import { TimeUnit } from '../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../seriesModel';
import { seriesDataApi, type SeriesRowsQuery } from './seriesDataApi';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;
const SERIES: PanelSeriesDefinition = {
    key: 'temperature',
    table: 'TAG',
    sourceTagName: 'TEMPERATURE',
    alias: 'Temperature',
    calculationMode: PanelSeriesCalculationMode.Average,
    color: undefined,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};
const RANGE = { start: 0, end: 100 };

describe('seriesDataApi.fetchSeriesRows', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({
            success: true,
            data: { rows: [[50, 1]], columns: [] },
        });
    });

    it.each<{
        query: SeriesRowsQuery;
        expectedMetadataKind: 'raw' | 'calculated';
    }>([
        {
            query: {
                kind: 'raw',
                seriesList: [SERIES],
                range: RANGE,
                useOrderBy: true,
            },
            expectedMetadataKind: 'raw',
        },
        {
            query: {
                kind: 'sampled-raw',
                seriesList: [SERIES],
                range: RANGE,
                sampleCount: 10,
                useOrderBy: true,
            },
            expectedMetadataKind: 'raw',
        },
        {
            query: {
                kind: 'calculated',
                seriesList: [SERIES],
                range: RANGE,
                interval: {
                    IntervalType: TimeUnit.Second,
                    IntervalValue: 1,
                },
                rowLimit: 100,
                rollupTables: {},
            },
            expectedMetadataKind: 'calculated',
        },
    ])(
        'dispatches a $query.kind query to its row strategy',
        async ({ query, expectedMetadataKind }) => {
            const result = await seriesDataApi.fetchSeriesRows(query);

            expect(result?.[0]).toMatchObject({
                seriesKey: SERIES.key,
                data: [[50, 1]],
                metadata: { kind: expectedMetadataKind },
            });
            expect(mockedRequest).toHaveBeenCalledTimes(1);
        },
    );
});
