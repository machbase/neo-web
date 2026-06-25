jest.mock('@/api/core', () => jest.fn());

import request from '@/api/core';
import {
    fetchSeriesDataAvailability,
    getDataAvailabilityToastMessage,
} from './panelData/DataTimeRangeFetcher';
import type {
    DataAvailabilityIssue,
    DataRangeSeries,
} from './panelData/PanelDataFetchTypes';

const requestMock = jest.mocked(request);

function createSeries(
    overrides: Partial<DataRangeSeries> = {},
): DataRangeSeries {
    return {
        table: 'TAG_TABLE',
        sourceTagName: 'tag_a',
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
        ...overrides,
    };
}

function createRowsResponse(rows: unknown[]) {
    return {
        success: true,
        data: {
            rows,
        },
    };
}

function createIssue(kind: DataAvailabilityIssue['kind']): DataAvailabilityIssue {
    return {
        kind,
        table: 'TAG_TABLE',
        tagName: 'tag_a',
        message: `${kind} message`,
    };
}

describe('fetchSeriesDataAvailability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('classifies a missing table', async () => {
        requestMock.mockResolvedValueOnce(createRowsResponse([]));

        const result = await fetchSeriesDataAvailability([createSeries()]);

        expect(result.timeRange).toBeUndefined();
        expect(result.issues).toEqual([
            {
                kind: 'missing-table',
                table: 'TAG_TABLE',
                tagName: 'tag_a',
                message: 'Table does not exist.',
            },
        ]);
        expect(requestMock).toHaveBeenCalledTimes(1);
    });

    it('classifies a missing tag after the table exists', async () => {
        requestMock
            .mockResolvedValueOnce(createRowsResponse([['NAME']]))
            .mockResolvedValueOnce(createRowsResponse([]))
            .mockResolvedValueOnce(createRowsResponse([]));

        const result = await fetchSeriesDataAvailability([createSeries()]);

        expect(result.timeRange).toBeUndefined();
        expect(result.issues).toEqual([
            {
                kind: 'missing-tag',
                table: 'TAG_TABLE',
                tagName: 'tag_a',
                message: 'Tag does not exist.',
            },
        ]);
        expect(requestMock).toHaveBeenCalledTimes(3);
    });

    it('classifies existing table and tag with no range rows as no data', async () => {
        requestMock
            .mockResolvedValueOnce(createRowsResponse([['NAME']]))
            .mockResolvedValueOnce(createRowsResponse([['tag_a']]))
            .mockResolvedValueOnce(createRowsResponse([[null, null]]));

        const result = await fetchSeriesDataAvailability([createSeries()]);

        expect(result.timeRange).toBeUndefined();
        expect(result.issues).toEqual([
            {
                kind: 'no-data',
                table: 'TAG_TABLE',
                tagName: 'tag_a',
                message: 'Data does not exist.',
            },
        ]);
    });

    it('keeps a valid partial range when another series is unavailable', async () => {
        requestMock
            .mockResolvedValueOnce(createRowsResponse([['NAME']]))
            .mockResolvedValueOnce(createRowsResponse([['tag_a']]))
            .mockResolvedValueOnce(createRowsResponse([[1000000000, 2000000000]]))
            .mockResolvedValueOnce(createRowsResponse([]))
            .mockResolvedValueOnce(createRowsResponse([]));

        const result = await fetchSeriesDataAvailability([
            createSeries(),
            createSeries({ sourceTagName: 'tag_b' }),
        ]);

        expect(result.timeRange).toEqual({
            startTime: 1000,
            endTime: 2000,
        });
        expect(result.issues).toEqual([
            {
                kind: 'missing-tag',
                table: 'TAG_TABLE',
                tagName: 'tag_b',
                message: 'Tag does not exist.',
            },
        ]);
    });

    it('classifies unknown request errors and preserves the server message', async () => {
        requestMock.mockResolvedValueOnce({
            status: 500,
            statusText: 'Internal Server Error',
            data: {
                message: 'database offline',
            },
        });

        const result = await fetchSeriesDataAvailability([createSeries()]);

        expect(result.timeRange).toBeUndefined();
        expect(result.issues).toEqual([
            {
                kind: 'request-failed',
                table: 'TAG_TABLE',
                tagName: 'tag_a',
                message: 'database offline',
            },
        ]);
    });

    it('returns a valid range without issues for available series', async () => {
        requestMock
            .mockResolvedValueOnce(createRowsResponse([['NAME']]))
            .mockResolvedValueOnce(createRowsResponse([['tag_a']]))
            .mockResolvedValueOnce(createRowsResponse([[1000000000, 2000000000]]));

        const result = await fetchSeriesDataAvailability([createSeries()]);

        expect(result).toEqual({
            timeRange: {
                startTime: 1000,
                endTime: 2000,
            },
            issues: [],
        });
    });
});

describe('getDataAvailabilityToastMessage', () => {
    it('returns a table-specific message when every issue is a missing table', () => {
        expect(getDataAvailabilityToastMessage([createIssue('missing-table')])).toBe(
            'Table does not exist: TAG_TABLE.',
        );
    });

    it('lists every missing table when multiple tables are unavailable', () => {
        expect(
            getDataAvailabilityToastMessage([
                createIssue('missing-table'),
                {
                    ...createIssue('missing-table'),
                    table: 'SECOND_TABLE',
                },
            ]),
        ).toBe('Tables do not exist: TAG_TABLE, SECOND_TABLE.');
    });
    it('returns a tag-specific message when every issue is a missing tag', () => {
        expect(getDataAvailabilityToastMessage([createIssue('missing-tag')])).toBe(
            'Tag does not exist: TAG_TABLE.tag_a.',
        );
    });

    it('returns a no-data message when every existing series lacks data', () => {
        expect(getDataAvailabilityToastMessage([createIssue('no-data')])).toBe(
            'Data does not exist: TAG_TABLE.tag_a.',
        );
    });

    it('keeps request failure text for request failures', () => {
        expect(
            getDataAvailabilityToastMessage([
                {
                    ...createIssue('request-failed'),
                    message: 'database offline',
                },
            ]),
        ).toBe('database offline');
    });

    it('returns a mixed message for mixed availability issues', () => {
        expect(
            getDataAvailabilityToastMessage([
                createIssue('missing-tag'),
                createIssue('no-data'),
            ]),
        ).toBe('Some series could not be loaded: missing tag TAG_TABLE.tag_a; no data TAG_TABLE.tag_a.');
    });
});



