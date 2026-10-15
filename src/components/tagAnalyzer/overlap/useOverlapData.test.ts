import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../seriesModel';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Toast } from '@/design-system/components';
import { seriesDataApi, type SeriesRowsQuery } from '../api/seriesDataApi';
import { TimeUnit } from '../rangeExpression/intervalResolver';
import { createPanelSeriesDefinition, PanelSeriesCalculationMode } from '../seriesModel';
import type { OverlapPanelInput } from './overlapModel';
import { useOverlapData } from './useOverlapData';

jest.mock('@/design-system/components', () => ({
    Toast: { error: jest.fn() },
}));

const SERIES = createPanelSeriesDefinition({
    key: 'series-a',
    table: 'DATA',
    tagName: 'TAG',
    calculationMode: PanelSeriesCalculationMode.Average,
    columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    alias: 'Temperature',
});
const RANGE = { start: 10, end: 20 };

function createInput(query: SeriesRowsQuery): OverlapPanelInput[] {
    return [{ key: 'panel-a', title: 'Comparison', query, visibleRange: RANGE }];
}

function createRawQuery(): Extract<SeriesRowsQuery, { kind: 'raw' }> {
    return { kind: 'raw', seriesList: [SERIES], range: RANGE, useOrderBy: true };
}

afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('overlap data requests', () => {
    it.each([false, true])('filters sampled=%s raw data to the requested range before alignment', async (sampled) => {
        const query: SeriesRowsQuery = sampled
            ? { ...createRawQuery(), kind: 'sampled-raw', sampleCount: 30, useOrderBy: true }
            : createRawQuery();
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([{
            seriesKey: SERIES.key,
            data: [[5, 0], [10, 1], [20, 2], [25, 3]],
        }]);
        const input = createInput(query);
        const { result } = renderHook(() => useOverlapData(input));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(fetchSpy).toHaveBeenCalledWith(query, { signal: expect.any(AbortSignal) });
        expect(result.current.seriesGroups[0]).toMatchObject({
            panelKey: 'panel-a',
            name: 'Comparison',
            sourceRange: RANGE,
            alignedRange: { start: 0, end: 10 },
            seriesData: [{ name: 'Temperature', data: [[0, 1], [10, 2]] }],
        });
    });

    it('keeps calculated boundary points outside the visible range', async () => {
        const query: SeriesRowsQuery = {
            kind: 'calculated',
            seriesList: [SERIES],
            range: RANGE,
            interval: { IntervalType: TimeUnit.Millisecond, IntervalValue: 1 },
            rowLimit: 333,
            rollupTables: {},
        };
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([{
            seriesKey: SERIES.key,
            data: [[5, 0], [10, 1], [20, 2], [25, 3]],
        }]);
        const input = createInput(query);
        const { result } = renderHook(() => useOverlapData(input));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.seriesGroups[0].alignedRange).toEqual({ start: 5, end: 15 });
        expect(result.current.seriesGroups[0].seriesData[0].data).toEqual([
            [0, 0], [5, 1], [15, 2], [20, 3],
        ]);
    });

    it('shows preparation failures through the existing load error state', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows');
        const input: OverlapPanelInput[] = [{
            key: 'panel-a', title: 'Invalid request', visibleRange: RANGE,
            error: 'Raw panel sampling requires a positive sample count.',
        }];
        const { result } = renderHook(() => useOverlapData(input));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.loadError).toBe('Raw panel sampling requires a positive sample count.');
        expect(Toast.error).toHaveBeenCalledWith(result.current.loadError, undefined);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.current.seriesGroups[0].name).toBe('Invalid request');
    });

    it('retains user shifts across refresh errors and successful retries', async () => {
        const query = createRawQuery();
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockResolvedValueOnce([{ seriesKey: SERIES.key, data: [[10, 1], [20, 2]] }])
            .mockRejectedValueOnce(new Error('Connection lost'))
            .mockResolvedValueOnce([{ seriesKey: SERIES.key, data: [[10, 8], [20, 9]] }]);
        const input = createInput(query);
        const { result } = renderHook(() => useOverlapData(input));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.shiftPanelRange('panel-a', 7));
        act(() => result.current.refreshOverlapData());
        await waitFor(() => expect(result.current.loadError).toBe('Connection lost'));
        expect(result.current.seriesGroups[0].shiftValue).toBe(7);
        expect(Toast.error).toHaveBeenCalledWith('Connection lost', undefined);

        act(() => result.current.refreshOverlapData());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(result.current.loadError).toBeUndefined();
        expect(result.current.seriesGroups[0]).toMatchObject({
            shiftValue: 7,
            seriesData: [{ data: [[0, 8], [10, 9]] }],
        });
    });

    it('keeps successful series while reporting per-series failures', async () => {
        const query = createRawQuery();
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([
            { seriesKey: SERIES.key, data: [[10, 1]] },
            {
                seriesKey: 'failed-series',
                data: [],
                error: { kind: 'request-failed', message: 'Series unavailable' },
            },
        ]);
        const input = createInput(query);
        const { result } = renderHook(() => useOverlapData(input));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.loadError).toBeUndefined();
        expect(result.current.seriesGroups[0].seriesData).toHaveLength(1);
        expect(Toast.error).toHaveBeenCalledWith('Series unavailable', undefined);
    });
});
