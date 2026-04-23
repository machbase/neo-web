import request from '@/api/core';
import {
    convertToNewRollupSyntax,
    getUserName,
    isCurUserEqualAdmin,
    isRollupExt,
} from '@/utils';
import { getInterval } from '@/utils/DashboardQueryParser';
import { fetchCalculationData } from './TagAnalyzerDataRepository';
import type { CalculationFetchRequest } from './FetchTypes';

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
    convertToNewRollupSyntax: jest.fn(),
    getUserName: jest.fn(),
    isCurUserEqualAdmin: jest.fn(),
    isRollupExt: jest.fn(),
}));

jest.mock('@/utils/DashboardQueryParser', () => ({
    getInterval: jest.fn(),
}));

describe('TagAnalyzerDataRepository', () => {
    const requestMock = request as unknown as jest.Mock;
    const convertToNewRollupSyntaxMock = convertToNewRollupSyntax as unknown as jest.Mock;
    const getUserNameMock = getUserName as unknown as jest.Mock;
    const isCurUserEqualAdminMock = isCurUserEqualAdmin as unknown as jest.Mock;
    const isRollupExtMock = isRollupExt as unknown as jest.Mock;
    const getIntervalMock = getInterval as unknown as jest.Mock;

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

    beforeEach(() => {
        jest.clearAllMocks();
        requestMock.mockResolvedValue({
            status: 200,
            data: {
                rows: [],
            },
        });
        getUserNameMock.mockReturnValue('tester');
        isCurUserEqualAdminMock.mockReturnValue(false);
        convertToNewRollupSyntaxMock.mockReturnValue("ROLLUP('MIN', 5, TIME)");
        isRollupExtMock.mockReturnValue(0);
        getIntervalMock.mockReturnValue(300000);
    });

    it('builds sum queries with a user-qualified table and truncated buckets', async () => {
        await fetchCalculationData(baseParams);

        expect(requestMock).toHaveBeenCalledWith({
            method: 'POST',
            url: '/api/tql/taz',
            data: `SQL("select to_timestamp(mTime) / 1000000.0 as time, sum(mvalue) as value from (select DATE_TRUNC('min', TIME, 5) as mTime, sum(VALUE) as mValue from tester.TAG_TABLE where NAME in ('TAG_1') and TIME between 100000000 and 200000000 group by mTime) Group by TIME order by TIME  LIMIT 25")\nCSV()`,
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
            'select TIME / (2 * 3600 * 1000000000) * (2 * 3600 * 1000000000) as mTime, sum(VALUE) as SUMMVAL, count(VALUE) as CNTMVAL',
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE',
        );
    });

    it('builds count queries with rollup bucket syntax when rollup is enabled', async () => {
        convertToNewRollupSyntaxMock.mockReturnValue("ROLLUP('MIN', 5, TIME)");

        await fetchCalculationData({
            ...baseParams,
            CalculationMode: 'cnt',
            isRollup: true,
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(convertToNewRollupSyntaxMock).toHaveBeenCalledWith('TIME', 'min', 5);
        expect(sQuery).toContain(
            "select ROLLUP('MIN', 5, TIME) as mTime, count(VALUE) as mValue",
        );
        expect(sQuery).toContain(
            'SELECT to_timestamp(mTime) / 1000000.0 AS TIME, SUM(MVALUE) AS VALUE',
        );
    });

    it('builds first queries with extended rollup buckets for multi-day rollups', async () => {
        convertToNewRollupSyntaxMock.mockReturnValue("ROLLUP('DAY', 2, TIME)");
        isRollupExtMock.mockReturnValue(1);
        getIntervalMock.mockReturnValue(172800000);

        await fetchCalculationData({
            ...baseParams,
            Table: 'APP.TAG_TABLE',
            CalculationMode: 'first',
            IntervalType: 'day',
            IntervalValue: 2,
            isRollup: true,
            RollupList: ['rollup-metadata'] as unknown as string[],
        });

        const sQuery = requestMock.mock.calls[0][0].data;

        expect(isRollupExtMock).toHaveBeenCalledWith(['rollup-metadata'], 'APP.TAG_TABLE', 172800000);
        expect(sQuery).toContain(
            "select ROLLUP('DAY', 2, TIME) as mTime,  first(time, VALUE) as mValue",
        );
        expect(sQuery).toContain(
            'select to_timestamp(to_char(mTime / 172800000000000  * 172800000000000)) / 1000000.0 as time, first(mTime, mvalue) as value',
        );
    });
});
