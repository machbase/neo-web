import { act, renderHook, waitFor } from '@testing-library/react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
    type SeriesRowsQuery,
} from '../../api/seriesDataApi';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import { TimeUnit } from '../../range/intervalResolver';
import { getRangeWidth } from '../../range/rangeArithmetic';
import type { PanelInfo } from '../panelModel';
import { usePanelData } from './panelData';

const TIME_SERIES: PanelSeriesDefinition = {
    key: 'time-series',
    table: 'TAG',
    sourceTagName: 'TAG_A',
    alias: 'Tag A',
    calculationMode: PanelSeriesCalculationMode.Average,
    color: '#123456',
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};

type UsePanelDataParams = Parameters<typeof usePanelData>[0];

function createPanelInfo(
    isRaw = false,
): Pick<PanelInfo, 'query' | 'mode' | 'display'> {
    return {
        query: { tagSet: [TIME_SERIES], intervalType: undefined },
        mode: { isRaw, isOrderBy: true, useNormalize: false },
        display: {
            chartType: 'Line',
            showLegend: true,
            showPoint: false,
            pointRadius: undefined,
            fill: undefined,
            stroke: undefined,
            connectNulls: false,
            useZoom: true,
            pixelsPerTick: {
                calculated: 3,
                calculatedNavigator: 3,
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: undefined,
            },
            rawNavigatorSampling: {
                enabled: false,
                sampleCount: 0.01,
            },
        },
    };
}

function createParams(
    panelInfo = createPanelInfo(),
): UsePanelDataParams {
    return {
        panelInfo,
        isActive: true,
        rangeState: {
            range: {
                mainRange: { start: 0, end: 100 },
                navigatorRange: { start: 0, end: 1_000 },
            },
            fullRange: { start: 0, end: 1_000 },
            navigatorRangeInput: { start: '0', end: '1000' },
        },
        chartAreaWidth: 300,
        rollupTables: {},
        dataRefreshVersion: 0,
    };
}

function calculatedResult(
    query: SeriesRowsQuery,
    timestamp = query.range.end,
): PanelDataFetchResult {
    return [{
        seriesKey: TIME_SERIES.key,
        data: [[timestamp, 1]],
        metadata: {
            kind: 'calculated',
            isLimitReached: false,
            usesRollup: false,
        },
    }];
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('usePanelData', () => {
    it('rejects empty and mixed-axis panels without fetching', () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows');
        const emptyInfo = createPanelInfo();
        emptyInfo.query.tagSet = [];
        const empty = renderHook(() => usePanelData(createParams(emptyInfo)));

        expect(empty.result.current.main.status).toBe('idle');
        empty.unmount();

        const numericSeries: PanelSeriesDefinition = {
            ...TIME_SERIES,
            key: 'numeric-series',
            sourceColumns: {
                ...TIME_SERIES.sourceColumns,
                timeBaseTime: true,
                timeType: 4,
            },
        };
        const mixedInfo = createPanelInfo();
        mixedInfo.query.tagSet = [TIME_SERIES, numericSeries];
        const mixed = renderHook(() => usePanelData(createParams(mixedInfo)));

        expect(mixed.result.current.main.status).toBe('idle');
        expect(fetchSpy).not.toHaveBeenCalled();
        mixed.unmount();
    });

    it('surfaces invalid enabled sampling as a request error', () => {
        const panelInfo = createPanelInfo(true);
        panelInfo.display.mainChartSampling = {
            enabled: true,
            sampleCount: 0,
        };

        const { result } = renderHook(() =>
            usePanelData(createParams(panelInfo)),
        );

        expect(result.current).toMatchObject({
            main: { status: 'failed' },
            issue: {
                kind: 'error',
                message:
                    'Raw panel sampling requires a positive sample count.',
            },
        });
    });

    it('loads independent chart data and reports the main interval', async () => {
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockImplementation(
            async (request) =>
                calculatedResult(
                    request,
                    request.kind === 'calculated' &&
                        request.rowLimit === 10_000
                        ? 100
                        : request.range.end,
                ),
        );
        const { result } = renderHook(() => usePanelData(createParams()));

        await waitFor(() => {
            expect(result.current.main.status).toBe('ready');
            expect(result.current.navigator.status).toBe('ready');
        });

        expect(Object.keys(result.current).sort()).toEqual([
            'issue',
            'main',
            'navigator',
            'rawLimitRange',
        ]);
        expect(Object.keys(result.current.main).sort()).toEqual([
            'interval',
            'series',
            'status',
        ]);
        expect(Object.keys(result.current.navigator).sort()).toEqual([
            'series',
            'status',
        ]);
        expect(result.current.main.series[0]?.data).toEqual([[100, 1]]);
        expect(result.current.navigator.series[0]?.data).toEqual([
            [1_000, 1],
        ]);
        expect(result.current.rawLimitRange).toBeUndefined();
        expect(result.current.main.interval?.kind).toBe('time');
        expect(result.current.issue).toBeUndefined();
    });

    it.each([
        {
            errorKind: 'no-data' as const,
            expectedStatus: 'ready',
            expectedIssue: { kind: 'noData' as const },
        },
        {
            errorKind: 'request-failed' as const,
            expectedStatus: 'failed',
            expectedIssue: {
                kind: 'error' as const,
                message: 'Series unavailable.',
            },
        },
    ])(
        'classifies an all-$errorKind response',
        async ({ errorKind, expectedStatus, expectedIssue }) => {
            jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([{
                seriesKey: TIME_SERIES.key,
                data: [],
                error: { kind: errorKind, message: 'Series unavailable.' },
            }]);
            const { result } = renderHook(() =>
                usePanelData(createParams()),
            );

            await waitFor(() => {
                expect(result.current.main.status).toBe(expectedStatus);
                expect(result.current.navigator.status).toBe(expectedStatus);
            });

            expect(result.current.main.series).toEqual([]);
            expect(result.current.issue).toEqual(expectedIssue);
        },
    );

    it('narrows a limited raw render range and summarizes its navigator', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (request) =>
                request.kind === 'raw'
                    ? [{
                          seriesKey: TIME_SERIES.key,
                          data: [[0, 1], [40, 2]],
                          metadata: {
                              kind: 'raw',
                              isLimitReached: true,
                          },
                      }]
                    : calculatedResult(request),
            );
        const params = {
            ...createParams(createPanelInfo(true)),
            chartAreaWidth: 100,
        };
        const { result } = renderHook(() => usePanelData(params));

        await waitFor(() => {
            expect(result.current.rawLimitRange?.mainRange.end).toBe(40);
            expect(result.current.navigator.status).toBe('ready');
        });

        expect(result.current.rawLimitRange).toEqual({
            mainRange: { start: 0, end: 40 },
            navigatorRange: { start: 0, end: 44 },
        });
        expect(result.current.main.interval).toBeUndefined();
        expect(result.current.issue).toEqual({ kind: 'partialData' });
        expect(
            fetchSpy.mock.calls.some(([request]) => request.kind === 'raw'),
        ).toBe(true);
        expect(
            fetchSpy.mock.calls.some(
                ([request]) => request.kind === 'calculated',
            ),
        ).toBe(true);
    });

    it('prefetches calculated main data at the visible resolution and reuses it', async () => {
        const day = 24 * 60 * 60 * 1_000;
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (query) => calculatedResult(query));
        const initialParams: UsePanelDataParams = {
            ...createParams(),
            rangeState: {
                range: {
                    mainRange: { start: 9_950 * day, end: 10_050 * day },
                    navigatorRange: { start: 0, end: 20_000 * day },
                },
                fullRange: { start: 0, end: 20_000 * day },
                navigatorRangeInput: {
                    start: '0',
                    end: String(20_000 * day),
                },
            },
        };
        const { result, rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        const mainQuery = fetchSpy.mock.calls
            .map(([query]) => query)
            .find(
                (query) =>
                    query.kind === 'calculated' && query.rowLimit === 10_000,
            );
        expect(mainQuery?.kind).toBe('calculated');
        if (mainQuery?.kind !== 'calculated') return;
        expect(mainQuery.interval).toEqual({
            IntervalType: TimeUnit.Day,
            IntervalValue: 1,
        });
        expect(getRangeWidth(mainQuery.range)).toBe(9_999 * day);
        expect(mainQuery.range.start).toBeLessThanOrEqual(9_950 * day);
        expect(mainQuery.range.end).toBeGreaterThanOrEqual(10_050 * day);
        await waitFor(() =>
            expect(result.current.main.status).toBe('ready'),
        );
        expect(result.current.issue).toEqual({ kind: 'noData' });

        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: {
                            start: 9_960 * day,
                            end: 10_060 * day,
                        },
                        navigatorRange:
                            initialParams.rangeState!.range.navigatorRange,
                    },
                },
            },
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('keeps raw main requests on the exact visible range', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (query) => calculatedResult(query));
        const params = createParams(createPanelInfo(true));

        renderHook(() => usePanelData(params));
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

        const rawMain = fetchSpy.mock.calls
            .map(([query]) => query)
            .find((query) => query.kind === 'raw');
        expect(rawMain?.range).toEqual(params.rangeState?.range.mainRange);
    });

    it('reports partial data when an empty series succeeds and a sibling fails', async () => {
        const failedSeries = { ...TIME_SERIES, key: 'failed-series' };
        const panelInfo = createPanelInfo();
        panelInfo.query.tagSet = [TIME_SERIES, failedSeries];
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([
            { seriesKey: TIME_SERIES.key, data: [] },
            {
                seriesKey: failedSeries.key,
                data: [],
                error: {
                    kind: 'request-failed',
                    message: 'Series unavailable.',
                },
            },
        ]);
        const { result } = renderHook(() =>
            usePanelData(createParams(panelInfo)),
        );

        await waitFor(() =>
            expect(result.current.main.status).toBe('ready'),
        );
        expect(result.current.main.series[0]?.data).toEqual([]);
        expect(result.current.issue).toEqual({ kind: 'partialData' });
    });

    it('reuses a prefetched no-data main result for a contained range', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockResolvedValue([{
                seriesKey: TIME_SERIES.key,
                data: [],
                error: { kind: 'no-data', message: 'Data does not exist.' },
            }]);
        const initialParams = createParams();
        const { rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: { start: 10, end: 90 },
                        navigatorRange:
                            initialParams.rangeState!.range.navigatorRange,
                    },
                },
            },
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('aborts and ignores an obsolete main request without restarting the navigator', async () => {
        const pending: Array<{
            query: SeriesRowsQuery;
            signal: AbortSignal | undefined;
            resolve: (result: PanelDataFetchResult) => void;
        }> = [];
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockImplementation(
            (query, options) =>
                new Promise<PanelDataFetchResult>((resolve) => {
                    pending.push({ query, signal: options?.signal, resolve });
                }),
        );
        const initialParams: UsePanelDataParams = {
            ...createParams(),
            rangeState: {
                range: {
                    mainRange: { start: 0, end: 100_000 },
                    navigatorRange: { start: 0, end: 1_000_000 },
                },
                fullRange: { start: 0, end: 1_000_000 },
                navigatorRangeInput: { start: '0', end: '1000000' },
            },
        };
        const { result, rerender, unmount } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(pending).toHaveLength(2));
        const oldMain = pending.find(
            ({ query }) =>
                query.kind === 'calculated' && query.rowLimit === 10_000,
        )!;
        const navigator = pending.find(({ query }) => query !== oldMain.query)!;

        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: { start: 0, end: 500_000 },
                        navigatorRange: { start: 0, end: 1_000_000 },
                    },
                },
            },
        });
        await waitFor(() => expect(pending).toHaveLength(3));
        const currentMain = pending[2];

        expect(oldMain.signal?.aborted).toBe(true);
        expect(navigator.signal?.aborted).toBe(false);
        await act(async () => {
            oldMain.resolve(calculatedResult(oldMain.query));
            await Promise.resolve();
        });
        expect(result.current.main.series).toEqual([]);
        expect(result.current.main.status).toBe('loading');

        await act(async () => {
            currentMain.resolve(calculatedResult(currentMain.query));
            await Promise.resolve();
        });
        await waitFor(() => {
            expect(result.current.main.series[0]?.data).toEqual([
                [currentMain.query.range.end, 1],
            ]);
        });

        unmount();
        expect(navigator.signal?.aborted).toBe(true);
    });

    it('aborts pending data and ignores its result while inactive', async () => {
        const pending: Array<{
            query: SeriesRowsQuery;
            signal: AbortSignal | undefined;
            resolve: (result: PanelDataFetchResult) => void;
        }> = [];
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockImplementation(
            (query, options) =>
                new Promise<PanelDataFetchResult>((resolve) => {
                    pending.push({ query, signal: options?.signal, resolve });
                }),
        );
        const initialParams = createParams();
        const { result, rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(pending).toHaveLength(2));
        rerender({
            params: { ...initialParams, isActive: false },
        });
        await waitFor(() => {
            expect(pending.every(({ signal }) => signal?.aborted)).toBe(true);
        });
        expect(result.current.main.status).toBe('idle');
        expect(result.current.navigator.status).toBe('idle');

        await act(async () => {
            for (const request of pending) {
                request.resolve(calculatedResult(request.query));
            }
            await Promise.resolve();
        });
        expect(result.current.main.series).toEqual([]);
        expect(result.current.navigator.series).toEqual([]);
    });

    it('prefetches and reuses a covering navigator request before debounced misses', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (request) => calculatedResult(request));
        const initialParams: UsePanelDataParams = {
            ...createParams(),
            rangeState: {
                range: {
                    mainRange: { start: 900, end: 1_000 },
                    navigatorRange: { start: 500, end: 1_100 },
                },
                fullRange: { start: 0, end: 2_000 },
                navigatorRangeInput: { start: '500', end: '1100' },
            },
        };
        const { rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        expect(
            fetchSpy.mock.calls.map(([query]) => query.range),
        ).toContainEqual({ start: 200, end: 1_400 });

        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: { start: 900, end: 1_000 },
                        navigatorRange: { start: 550, end: 1_150 },
                    },
                },
            },
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);

        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: { start: 900, end: 1_000 },
                        navigatorRange: { start: 800, end: 1_450 },
                    },
                },
            },
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    });

    it('invalidates both request generations on data refresh', async () => {
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (request) => calculatedResult(request));
        const initialParams = createParams();
        const { rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        rerender({
            params: { ...initialParams, dataRefreshVersion: 1 },
        });
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
    });

    it('reuses prefetched navigator data only at the exact fixed resolution', async () => {
        const day = 24 * 60 * 60 * 1_000;
        const fetchSpy = jest.spyOn(seriesDataApi, 'fetchSeriesRows')
            .mockImplementation(async (request) => calculatedResult(request));
        const initialParams: UsePanelDataParams = {
            ...createParams(),
            rangeState: {
                range: {
                    mainRange: { start: 200 * day, end: 300 * day },
                    navigatorRange: {
                        start: 125 * day,
                        end: 375 * day,
                    },
                },
                fullRange: { start: -100 * day, end: 700 * day },
                navigatorRangeInput: {
                    start: String(125 * day),
                    end: String(375 * day),
                },
            },
        };
        const { rerender } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
        const navigatorRequest = fetchSpy.mock.calls
            .map(([query]) => query)
            .find(
                (query) => getRangeWidth(query.range) === 500 * day,
            );
        expect(navigatorRequest?.kind).toBe('calculated');
        if (navigatorRequest?.kind !== 'calculated') return;
        expect(navigatorRequest.interval).toEqual({
            IntervalType: TimeUnit.Day,
            IntervalValue: 5,
        });

        rerender({
            params: withNavigatorRange(
                initialParams,
                100 * day,
                400 * day,
            ),
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));

        const refreshedNavigator = fetchSpy.mock.calls
            .map(([query]) => query)
            .find(
                (query) => getRangeWidth(query.range) === 600 * day,
            );
        expect(refreshedNavigator?.kind).toBe('calculated');
        if (refreshedNavigator?.kind !== 'calculated') return;
        expect(refreshedNavigator.interval).toEqual({
            IntervalType: TimeUnit.Day,
            IntervalValue: 10,
        });

        rerender({
            params: withNavigatorRange(
                initialParams,
                85 * day,
                415 * day,
            ),
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        });
        expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
});

function withNavigatorRange(
    params: UsePanelDataParams,
    start: number,
    end: number,
): UsePanelDataParams {
    return {
        ...params,
        rangeState: {
            ...params.rangeState!,
            range: {
                mainRange: params.rangeState!.range.mainRange,
                navigatorRange: { start, end },
            },
        },
    };
}
