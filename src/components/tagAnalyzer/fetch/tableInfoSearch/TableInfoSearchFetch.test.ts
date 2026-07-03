import request from '@/api/core';
import { fetchTableInfoSearchTags } from './TableInfoSearchFetch';
import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';

jest.mock('@/api/core', () => jest.fn());
jest.mock('@/api/repository/machiot', () => ({
    fetchDashboardJsonColumnSamples: jest.fn(),
}));
jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));
jest.mock('@/utils', () => ({
    parseTables: jest.fn(() => []),
}));
jest.mock('@/utils/dashboardJsonValue', () => ({
    extractJsonPathsFromSamples: jest.fn(() => []),
}));

const mockedRequest = request as unknown as jest.Mock;

const COLUMNS: TagAnalyzerColumnInfo = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

function getRequestedSql(callIndex: number): string {
    const requestConfig = mockedRequest.mock.calls[callIndex][0];
    const url = String(requestConfig.url);
    return decodeURIComponent(url.slice('/api/query?q='.length));
}

describe('fetchTableInfoSearchTags', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
    });

    it('caches tag count while fetching each requested page', async () => {
        mockedRequest
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [['TAG_01']],
                },
            })
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[42]],
                },
            })
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [['TAG_11']],
                },
            });

        const firstPage = await fetchTableInfoSearchTags({
            table: 'SYS.COUNT_CACHE_TAG',
            searchText: '',
            columns: COLUMNS,
            page: 1,
            pageSize: 10,
        });
        const secondPage = await fetchTableInfoSearchTags({
            table: 'SYS.COUNT_CACHE_TAG',
            searchText: '',
            columns: COLUMNS,
            page: 2,
            pageSize: 10,
        });

        expect(mockedRequest).toHaveBeenCalledTimes(3);
        expect(getRequestedSql(0)).toBe(
            [
                'SELECT NAME',
                'FROM SYS._COUNT_CACHE_TAG_META',
                'ORDER BY NAME',
                'LIMIT 0, 10',
            ].join('\n'),
        );
        expect(getRequestedSql(1)).toBe(
            [
                'SELECT count(*)',
                'FROM SYS._COUNT_CACHE_TAG_META',
            ].join('\n'),
        );
        expect(getRequestedSql(2)).toBe(
            [
                'SELECT NAME',
                'FROM SYS._COUNT_CACHE_TAG_META',
                'ORDER BY NAME',
                'LIMIT 10, 10',
            ].join('\n'),
        );
        expect(firstPage.total).toBe(42);
        expect(secondPage.total).toBe(42);
    });
});
