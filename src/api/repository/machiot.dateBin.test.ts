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
});
