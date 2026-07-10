import request from '@/api/core';
import { fetchSeriesDataAvailability } from './DataTimeRangeFetcher';
import type { DataRangeSeries } from './PanelDataFetchTypes';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

function createDatetimeSeries(
    table: string,
    sourceTagName: string,
): DataRangeSeries {
    return {
        table,
        sourceTagName,
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
            timeBaseTime: true,
            timeType: 6,
        },
    };
}

const DATETIME_SERIES = createDatetimeSeries('SYS.MYTAG2', 'vib3');
const MISSING_TABLE_SERIES = createDatetimeSeries('SYS.MY_MISSING', 'vib3');
const CACHED_TABLE_SERIES = createDatetimeSeries('SYS.CACHED_TAG', 'vib3');

function getRequestedSql(callIndex: number): string {
    const requestConfig = mockedRequest.mock.calls[callIndex][0];
    const url = String(requestConfig.url);
    return decodeURIComponent(url.slice('/api/query?q='.length));
}

describe('fetchSeriesDataAvailability', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
    });

    it('runs duplicate virtual stat range checks only once', async () => {
        mockedRequest
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[1]],
                },
            })
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[1000000, 3000000]],
                },
            });

        const result = await fetchSeriesDataAvailability([
            DATETIME_SERIES,
            { ...DATETIME_SERIES },
        ]);

        expect(mockedRequest).toHaveBeenCalledTimes(2);
        expect(getRequestedSql(0)).toContain('FROM v$tables');
        expect(getRequestedSql(0)).toContain("NAME = 'V$MYTAG2_STAT'");
        expect(getRequestedSql(1)).toBe(
            [
                'SELECT min_time AS min_tm,',
                '    max_time AS max_tm',
                'FROM SYS.V$MYTAG2_STAT',
                "WHERE NAME IN ('vib3')",
            ].join('\n'),
        );
        expect(result.timeRange).toEqual({
            startTime: 1,
            endTime: 3,
        });
        expect(result.issues).toEqual([]);
    });

    it('reports a missing virtual stat table before running the range query', async () => {
        mockedRequest.mockResolvedValueOnce({
            success: true,
            data: {
                rows: [],
            },
        });

        const result = await fetchSeriesDataAvailability([MISSING_TABLE_SERIES]);

        expect(mockedRequest).toHaveBeenCalledTimes(1);
        expect(getRequestedSql(0)).toContain('FROM v$tables');
        expect(result.timeRange).toBeUndefined();
        expect(result.issues).toEqual([
            {
                kind: 'missing-table',
                table: 'SYS.V$MY_MISSING_STAT',
                message: 'Table does not exist.',
            },
        ]);
    });

    it('caches a virtual stat table check across availability fetches', async () => {
        mockedRequest
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[1]],
                },
            })
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[1000000, 3000000]],
                },
            })
            .mockResolvedValueOnce({
                success: true,
                data: {
                    rows: [[2000000, 4000000]],
                },
            });

        await fetchSeriesDataAvailability([CACHED_TABLE_SERIES]);
        const result = await fetchSeriesDataAvailability([CACHED_TABLE_SERIES]);

        expect(mockedRequest).toHaveBeenCalledTimes(3);
        expect(getRequestedSql(0)).toContain('FROM v$tables');
        expect(getRequestedSql(1)).toBe(
            [
                'SELECT min_time AS min_tm,',
                '    max_time AS max_tm',
                'FROM SYS.V$CACHED_TAG_STAT',
                "WHERE NAME IN ('vib3')",
            ].join('\n'),
        );
        expect(getRequestedSql(2)).toBe(
            [
                'SELECT min_time AS min_tm,',
                '    max_time AS max_tm',
                'FROM SYS.V$CACHED_TAG_STAT',
                "WHERE NAME IN ('vib3')",
            ].join('\n'),
        );
        expect(result.timeRange).toEqual({
            startTime: 2,
            endTime: 4,
        });
    });
});
