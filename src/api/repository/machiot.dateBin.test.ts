import request from '@/api/core';
import { fetchCalculationData } from './machiot';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const expectNoLegacyBucketSql = (sql: string) => {
    expect(sql).not.toContain('DATE_TRUNC(');
    expect(sql).not.toContain('FROM_TIMESTAMP(-32400000000000)');
    expect(sql).not.toContain('FROM_TIMESTAMP(0)');
    expect(sql).not.toMatch(/DATE_BIN\([^)]*DATE_BIN\('day', 1,/);
};

describe('fetchCalculationData DATE_BIN SQL', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({
            status: 200,
            data: '',
        });
    });

    test('non-rollup avg calculation uses 3-argument DATE_BIN', async () => {
        await fetchCalculationData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1745910581000,
            End: 1745914181000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: false,
            RollupList: {},
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("DATE_BIN('minute', 7, TIME)");
        expectNoLegacyBucketSql(data);
    });

    test('non-rollup avg calculation converts JSON value before aggregation', async () => {
        await fetchCalculationData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1745910581000,
            End: 1745914181000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: false,
            RollupList: {},
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(data).not.toContain('sum(PAYLOAD)');
        expect(data).not.toContain("sum(PAYLOAD->'$[metrics][temperature]')");
    });

    test('rollup calculation does not append raw tail with UNION ALL', async () => {
        await fetchCalculationData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1745910581000,
            End: 1745914181000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: true,
            RollupList: {
                SYS: {
                    EXAMPLE: {
                        VALUE: [420000],
                        EXT_TYPE: [0],
                    },
                },
            },
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("ROLLUP('MIN', 7, TIME)");
        expect(data).not.toContain('UNION ALL');
        expectNoLegacyBucketSql(data);
    });

    test('JSON value rollup extracts JSON key outside a base JSON rollup', async () => {
        await fetchCalculationData({
            Table: 'sys.SENSOR_JSON_RAW',
            TagNames: 'sensor-1',
            Start: 1745910581000,
            End: 1745914181000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: true,
            RollupList: {
                SYS: {
                    SENSOR_JSON_RAW: {
                        PAYLOAD: [420000],
                        EXT_TYPE: [0],
                    },
                },
            },
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("ROLLUP('MIN', 7, TIME)");
        expect(data).toContain('avg(PAYLOAD) as JSONVAL_VALUE');
        expect(data).toContain("MAX(TO_NUMBER_SAFE(JSONVAL_VALUE->'$[metrics][temperature]')) AS VALUE");
        expect(data).not.toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]'))");
        expect(data).not.toContain('UNION ALL');
    });

    test('numeric basetime calculation keeps range and output time in the original unit', async () => {
        await fetchCalculationData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1000,
            End: 2000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: false,
            RollupList: {},
            colName: {
                name: 'NAME',
                time: 'ODOMETER_M',
                timeType: 20,
                timeBaseTime: true,
                value: 'VALUE',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain('ODOMETER_M BETWEEN 1000 AND 2000');
        expect(data).not.toContain('ODOMETER_M BETWEEN 1000000000 AND 2000000000');
        expect(data).not.toContain('to_timestamp(ODOMETER_M)');
        expect(data).not.toContain('mTime / 1000000.0 as time');
    });
});
