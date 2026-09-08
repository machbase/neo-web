import request from '@/api/core';
import { TimeUnit } from '../range/intervalResolver';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../seriesModel';
import { seriesDataApi, type SeriesRowsQuery } from './seriesDataApi';

jest.mock('@/api/core', () => jest.fn());
jest.mock('@/api/repository/currentDatabase', () => ({
    ensureCurrentDatabase: jest.fn().mockResolvedValue(undefined),
}));

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
const NUMERIC_SERIES: PanelSeriesDefinition = {
    ...SERIES,
    sourceColumns: {
        ...SERIES.sourceColumns,
        time: 'ODOMETER_M',
        timeBaseTime: true,
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

    it.each<{
        label: string;
        query: SeriesRowsQuery;
        expectedInRangeHint: string;
    }>([
        {
            label: 'raw',
            query: {
                kind: 'raw',
                seriesList: [SERIES],
                range: { start: 0, end: seriesDataApi.rawRowLimit },
                useOrderBy: false,
            },
            expectedInRangeHint: 'SELECT /*+ SCAN_FORWARD(TAG) */',
        },
        {
            label: 'sampled raw',
            query: {
                kind: 'sampled-raw',
                seriesList: [SERIES],
                range: { start: 0, end: seriesDataApi.rawRowLimit },
                sampleCount: 10,
                useOrderBy: false,
            },
            expectedInRangeHint:
                'SELECT /*+ SAMPLING(10) SCAN_FORWARD(TAG) */',
        },
    ])('keeps the earliest $label rows when the limit is exceeded', async ({
        query,
        expectedInRangeHint,
    }) => {
        const limit = seriesDataApi.rawRowLimit;
        const beforeRow = [-1, -1];
        const insideRows = Array.from(
            { length: limit + 1 },
            (_, timestamp) => [timestamp, timestamp],
        );
        const afterRow = [limit + 1, limit + 1];
        mockedRequest.mockResolvedValue({
            success: true,
            data: {
                rows: [beforeRow, ...insideRows, afterRow],
                columns: [],
            },
        });

        const result = await seriesDataApi.fetchSeriesRows(query);

        const requestUrl = mockedRequest.mock.calls[0][0].url as string;
        const sql = decodeURIComponent(requestUrl);
        expect(sql).toContain(expectedInRangeHint);
        expect(sql.match(/SCAN_FORWARD\(TAG\)/g)).toHaveLength(2);
        expect(result?.[0]).toMatchObject({
            metadata: { kind: 'raw', isLimitReached: true },
        });
        expect(result?.[0].data).toHaveLength(limit);
        expect(result?.[0].data[0]).toEqual(insideRows[0]);
        expect(result?.[0].data[limit - 1]).toEqual(insideRows[limit - 1]);
        expect(result?.[0].data).not.toContainEqual(insideRows[limit]);
        expect(result?.[0].data).not.toContainEqual(beforeRow);
        expect(result?.[0].data).not.toContainEqual(afterRow);
    });

    it('retains surrounding raw anchor rows when the limit is not reached', async () => {
        const rows = [[-1, 0], [50, 1], [101, 2]];
        mockedRequest.mockResolvedValue({
            success: true,
            data: { rows, columns: [] },
        });

        const result = await seriesDataApi.fetchSeriesRows({
            kind: 'raw',
            seriesList: [SERIES],
            range: RANGE,
            useOrderBy: true,
        });

        expect(result?.[0]).toMatchObject({
            data: rows,
            metadata: { kind: 'raw', isLimitReached: false },
        });
    });
});

describe('seriesDataApi.fetchSeriesFullRange', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
    });

    it('adds one second after a single datetime point', async () => {
        mockedRequest.mockResolvedValue({
            success: true,
            data: {
                rows: [[1_000_000_000, 1_000_000_000]],
                columns: [],
            },
        });

        await expect(seriesDataApi.fetchSeriesFullRange([SERIES])).resolves.toEqual({
            start: 1_000,
            end: 2_000,
        });
    });

    it('adds one unit after a single numeric point', async () => {
        mockedRequest.mockResolvedValue({
            success: true,
            data: {
                rows: [[0]],
                columns: [],
            },
        });

        await expect(
            seriesDataApi.fetchSeriesFullRange([NUMERIC_SERIES]),
        ).resolves.toEqual({
            start: 0,
            end: 1,
        });
    });
});
