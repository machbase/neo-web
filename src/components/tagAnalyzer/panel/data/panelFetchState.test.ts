import { act, renderHook, waitFor } from '@testing-library/react';
import { TimeUnit } from '../../domain/time/TimeTypes';
import type { FetchPanelSeriesRowsResult } from '../../fetch/panelData/PanelDataFetchTypes';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import { PanelChartLoadStatus, usePanelSeriesFetch } from './panelFetchState';

type FetchKey = 'first' | 'second';

const SERIES_CONFIG: PanelSeriesDefinition = {
    key: 'series-1',
    table: 'example',
    sourceTagName: 'SENSOR_02',
    alias: '',
    calculationMode: 'raw',
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
    },
};

function createFetchResult(value: number): FetchPanelSeriesRowsResult {
    return {
        seriesFetchResults: [
            {
                seriesConfig: SERIES_CONFIG,
                fetchResult: {
                    data: {
                        column: ['TIME', 'VALUE'],
                        rows: [[value, value]],
                    },
                },
                usesRollup: false,
            },
        ],
        interval: {
            IntervalType: TimeUnit.Second,
            IntervalValue: 1,
        },
        count: 1,
        isRaw: true,
    };
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolver) => {
        resolve = resolver;
    });

    return { promise, resolve };
}

describe('usePanelSeriesFetch', () => {
    it('keeps the previous result while a new cache key is loading', async () => {
        const sFirstResult = createFetchResult(1);
        const sSecondResult = createFetchResult(2);
        const sSecondFetch = createDeferred<FetchPanelSeriesRowsResult | undefined>();
        const sFetchByKey: Record<FetchKey, jest.Mock<Promise<FetchPanelSeriesRowsResult | undefined>, []>> = {
            first: jest.fn(() => Promise.resolve(sFirstResult)),
            second: jest.fn(() => sSecondFetch.promise),
        };

        const { result, rerender } = renderHook(
            ({ cacheKey }: { cacheKey: FetchKey }) =>
                usePanelSeriesFetch({
                    canFetch: true,
                    cacheKey,
                    fetchFn: sFetchByKey[cacheKey],
                }),
            { initialProps: { cacheKey: 'first' } },
        );

        await waitFor(() =>
            expect(result.current.status).toBe(PanelChartLoadStatus.Ready),
        );
        expect(result.current.result).toBe(sFirstResult);

        rerender({ cacheKey: 'second' });

        await waitFor(() =>
            expect(result.current.status).toBe(PanelChartLoadStatus.Loading),
        );
        expect(result.current.result).toBe(sFirstResult);

        await act(async () => {
            sSecondFetch.resolve(sSecondResult);
            await sSecondFetch.promise;
        });

        await waitFor(() =>
            expect(result.current.status).toBe(PanelChartLoadStatus.Ready),
        );
        expect(result.current.result).toBe(sSecondResult);
    });
});
