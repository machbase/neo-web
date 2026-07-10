import request from '@/api/core';
import { TimeUnit } from '../../domain/time/TimeTypes';
import { fetchCalculationData } from './ChartSeriesDataFetcher';
import type { CalculationFetchRequest } from './PanelDataFetchTypes';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const NUMERIC_CALCULATION_REQUEST: CalculationFetchRequest = {
    Table: 'SYS.DISTANCE_SENSOR',
    TagNames: 'SENSOR_02',
    Start: 0,
    End: 1000,
    CalculationMode: 'avg',
    IntervalType: TimeUnit.Second,
    IntervalValue: 1,
    columnMap: {
        name: 'NAME',
        time: 'ODOMETER_M',
        value: 'VALUE',
        timeBaseTime: true,
        timeType: 20,
    },
    Count: 100,
    isRollup: false,
};

describe('fetchCalculationData', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
    });

    it('normalizes aggregate numeric strings before validating chart rows', async () => {
        mockedRequest.mockResolvedValue({
            status: 200,
            data: {
                rows: [
                    ['0', '12.5'],
                    ['10', 'NULL'],
                ],
            },
        });

        const result = await fetchCalculationData(NUMERIC_CALCULATION_REQUEST);

        expect(result.data.rows).toEqual([
            [0, 12.5],
            [10, null],
        ]);
    });

    it('shares simultaneous identical chart SQL requests without caching later reloads', async () => {
        const firstRequest = createDeferred<unknown>();
        mockedRequest.mockReturnValueOnce(firstRequest.promise);

        const firstFetch = fetchCalculationData(NUMERIC_CALCULATION_REQUEST);
        const secondFetch = fetchCalculationData({ ...NUMERIC_CALCULATION_REQUEST });

        expect(mockedRequest).toHaveBeenCalledTimes(1);

        firstRequest.resolve({
            status: 200,
            data: {
                rows: [[0, 1]],
            },
        });

        const [firstResult, secondResult] = await Promise.all([
            firstFetch,
            secondFetch,
        ]);

        expect(firstResult).toEqual(secondResult);
        expect(firstResult).not.toBe(secondResult);
        expect(firstResult.data.rows).not.toBe(secondResult.data.rows);

        mockedRequest.mockResolvedValueOnce({
            status: 200,
            data: {
                rows: [[100, 2]],
            },
        });

        await expect(fetchCalculationData(NUMERIC_CALCULATION_REQUEST))
            .resolves.toEqual({
                data: {
                    column: ['TIME', 'VALUE'],
                    rows: [[100, 2]],
                },
            });
        expect(mockedRequest).toHaveBeenCalledTimes(2);
    });

    it('executes base JSON rollup averages with outer JSON extraction', async () => {
        mockedRequest.mockResolvedValue({
            status: 200,
            data: {
                rows: [],
            },
        });

        await fetchCalculationData({
            Table: 'SYS.TAG_JSON_DELTA',
            TagNames: 'DEVICE_01',
            Start: 1777561200000,
            End: 1777647599500,
            CalculationMode: 'avg',
            IntervalType: TimeUnit.Second,
            IntervalValue: 6,
            columnMap: {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
                jsonKey: 'metrics.temperature',
                timeBaseTime: true,
                timeType: 6,
            },
            Count: 10000,
            isRollup: true,
            rollupColumnName: 'VALUE',
        });

        const sql = getExecutedQuerySql();
        expect(sql).toContain('to_timestamp(mTime) / 1000000.0 AS TIME');
        expect(sql).toContain("ROLLUP('SEC', 6, TIME) AS mTime");
        expect(sql).toContain('sum(VALUE) AS SUMMVAL');
        expect(sql).toContain('count(VALUE) AS CNTMVAL');
        expect(sql).toContain(
            "TO_NUMBER_SAFE(SUMMVAL->'$[metrics][temperature]') / CNTMVAL AS VALUE",
        );
        expect(sql).toContain('LIMIT 10000');
        expect(sql).not.toContain(
            "sum(TO_NUMBER_SAFE(VALUE->'$[metrics][temperature]'))",
        );
    });
});

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolver) => {
        resolve = resolver;
    });

    return { promise, resolve };
}

function getExecutedQuerySql(): string {
    const url = mockedRequest.mock.calls[0][0].url as string;
    return decodeURIComponent(url.slice('/api/query?q='.length));
}
