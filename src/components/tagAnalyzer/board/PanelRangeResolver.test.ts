jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));

jest.mock('../fetch/panelData/DataTimeRangeFetcher', () => {
    const actual = jest.requireActual('../fetch/panelData/DataTimeRangeFetcher');

    return {
        ...actual,
        fetchSeriesDataAvailability: jest.fn(),
    };
});

import { Toast } from '@/design-system/components';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { fetchSeriesDataAvailability } from '../fetch/panelData/DataTimeRangeFetcher';
import { resetDataAvailabilityToastDedupe } from './range/DataAvailabilityToastPresenter';
import { fetchFullRangeOrWarn } from './PanelRangeResolver';

const fetchSeriesDataAvailabilityMock = jest.mocked(fetchSeriesDataAvailability);

function createSeries(): PanelSeriesDefinition {
    return {
        key: 'series-1',
        table: 'TAG_TABLE',
        sourceTagName: 'tag_a',
        alias: 'Tag A',
        calculationMode: 'max',
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
        },
    };
}

describe('fetchFullRangeOrWarn', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetDataAvailabilityToastDedupe();
    });

    it('shows a table-specific toast instead of the generic range toast', async () => {
        fetchSeriesDataAvailabilityMock.mockResolvedValue({
            timeRange: undefined,
            issues: [
                {
                    kind: 'missing-table',
                    table: 'TAG_TABLE',
                    tagName: 'tag_a',
                    message: 'Table does not exist.',
                },
            ],
        });

        const result = await fetchFullRangeOrWarn([createSeries()]);

        expect(result).toBeUndefined();
        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('Table does not exist: TAG_TABLE.');
    });

    it('shows the same missing table toast only once across panels', async () => {
        fetchSeriesDataAvailabilityMock.mockResolvedValue({
            timeRange: undefined,
            issues: [
                {
                    kind: 'missing-table',
                    table: 'TAG_TABLE',
                    tagName: 'tag_a',
                    message: 'Table does not exist.',
                },
            ],
        });

        await fetchFullRangeOrWarn([createSeries()]);
        await fetchFullRangeOrWarn([createSeries()]);

        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('Table does not exist: TAG_TABLE.');
    });

    it('returns a valid partial range and still shows one availability toast', async () => {
        fetchSeriesDataAvailabilityMock.mockResolvedValue({
            timeRange: {
                startTime: 1000,
                endTime: 2000,
            },
            issues: [
                {
                    kind: 'missing-tag',
                    table: 'TAG_TABLE',
                    tagName: 'tag_b',
                    message: 'Tag does not exist.',
                },
            ],
        });

        const result = await fetchFullRangeOrWarn([createSeries()]);

        expect(result).toEqual({
            startTime: 1000,
            endTime: 2000,
        });
        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(Toast.error).toHaveBeenCalledWith('Tag does not exist: TAG_TABLE.tag_b.');
    });
});


