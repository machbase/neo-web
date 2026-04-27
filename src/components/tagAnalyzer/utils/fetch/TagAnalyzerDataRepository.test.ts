import request from '@/api/core';
import {
    getUserName,
    isCurUserEqualAdmin,
} from '@/utils';
import { fetchCalculationData, fetchRawData } from './TagAnalyzerDataRepository';
import {
    SortOrderEnum,
} from './FetchTypes';
import type { CalculationFetchRequest, RawFetchRequest } from './FetchTypes';

jest.mock('@/api/core', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));

jest.mock('@/utils', () => ({
    getUserName: jest.fn(),
    isCurUserEqualAdmin: jest.fn(),
}));

describe('TagAnalyzerDataRepository', () => {
    const requestMock = request as unknown as jest.Mock;
    const getUserNameMock = getUserName as unknown as jest.Mock;
    const isCurUserEqualAdminMock = isCurUserEqualAdmin as unknown as jest.Mock;

    const baseParams: CalculationFetchRequest = {
        Table: 'TAG_TABLE',
        TagNames: 'TAG_1',
        Start: 100,
        End: 200,
        CalculationMode: 'sum',
        IntervalType: 'min',
        IntervalValue: 5,
        columnMap: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
        Count: 25,
        isRollup: false,
        RollupList: [],
    };
    const baseRawParams: RawFetchRequest = {
        Table: 'TAG_TABLE',
        TagNames: 'TAG_1',
        Start: 100,
        End: 200,
        CalculationMode: 'raw',
        IntervalType: 'sec',
        IntervalValue: 1,
        columnMap: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
        Count: 25,
        isRollup: false,
        sampling: {
            kind: 'disabled',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        requestMock.mockResolvedValue({
            status: 200,
            data: {
                rows: [],
            },
        });
        getUserNameMock.mockReturnValue('tester');
        isCurUserEqualAdminMock.mockReturnValue(false);
    });

    it('builds sum queries with a user-qualified table and truncated buckets', async () => {
        await fetchCalculationData(baseParams);

        expect(requestMock).toHaveBeenCalledWith({
            method: 'POST',
            url: '/api/tql/taz',
            data: `SQL("SELECT to_timestamp(mTime) / 1000000.0 AS time, sum(mValue) AS value FROM (SELECT DATE_TRUNC('min', TIME, 5) AS mTime, sum(VALUE) AS mValue FROM tester.TAG_TABLE WHERE NAME IN ('TAG_1') AND TIME BETWEEN 100000000 AND 200000000 GROUP BY mTime) GROUP BY TIME ORDER BY TIME LIMIT 25")\nCSV()`,
        });
    });

    it('builds avg queries with scaled non-rollup buckets', async () => {
        await fetchCalculationData({
            ...baseParams,
            CalculationMode: 'avg',
            IntervalType: 'hour',
            IntervalValue: 2,
            Count: 10,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain(
            'SELECT TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000) AS mTime, sum(VALUE) AS SUMMVAL, count(VALUE) AS CNTMVAL',
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE',
        );
    });

    it('builds count queries with rollup bucket syntax when rollup is enabled', async () => {
        await fetchCalculationData({
            ...baseParams,
            CalculationMode: 'cnt',
            isRollup: true,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain(
            "SELECT ROLLUP('MIN', 5, TIME) AS mTime, count(VALUE) AS mValue",
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(mValue) AS VALUE',
        );
    });

    it('builds first queries with extended rollup buckets for multi-day rollups', async () => {
        await fetchCalculationData({
            ...baseParams,
            Table: 'APP.TAG_TABLE',
            CalculationMode: 'first',
            IntervalType: 'day',
            IntervalValue: 2,
            isRollup: true,
            RollupList: {
                APP: {
                    TAG_TABLE: {
                        VALUE: [172800000],
                        EXT_TYPE: [1],
                    },
                },
            } as unknown as string[],
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain(
            "SELECT ROLLUP('DAY', 2, TIME) AS mTime, first(TIME, VALUE) AS mValue",
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(to_char(mTime / 172800000000000  * 172800000000000)) / 1000000.0 AS time, first(mTime, mValue) AS value',
        );
    });

    it('builds last queries through the calculated fetch path', async () => {
        await fetchCalculationData({
            ...baseParams,
            CalculationMode: 'last',
            IntervalType: 'hour',
            IntervalValue: 1,
            Count: 5,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain(
            "SELECT DATE_TRUNC('hour', TIME, 1) AS mTime, last(TIME, VALUE) AS mValue",
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(mTime) / 1000000.0 AS time, last(mTime, mValue) AS value',
        );
    });

    it('builds raw queries with nanosecond boundaries and no order clause by default', async () => {
        await fetchRawData(baseRawParams);

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain(
            "SELECT to_timestamp(TIME) / 1000000.0 AS date, VALUE AS value FROM TAG_TABLE WHERE NAME = 'TAG_1' AND TIME BETWEEN 100000000 AND 200000000",
        );
        expect(sQuery).toContain('LIMIT 25');
        expect(sQuery).not.toContain('ORDER BY 1');
    });

    it('builds raw queries with an explicit descending sort order', async () => {
        await fetchRawData({
            ...baseRawParams,
            SortOrder: SortOrderEnum.Descending,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain('ORDER BY 1 DESC');
    });

    it('builds raw queries with an explicit ascending sort order', async () => {
        await fetchRawData({
            ...baseRawParams,
            SortOrder: SortOrderEnum.Ascending,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(sQuery).toContain('ORDER BY 1 ASC');
    });
});
