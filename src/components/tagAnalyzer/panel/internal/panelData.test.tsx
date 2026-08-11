import { act, renderHook, waitFor } from '@testing-library/react';
import {
    seriesDataApi,
    type PanelDataFetchResult,
    type PanelSeriesRowsRequest,
} from '../../api/seriesDataApi';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
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

function getSignal(
    request: PanelSeriesRowsRequest,
): AbortSignal | undefined {
    if (request.kind === 'raw') return request.args[3];
    if (request.kind === 'sampled-raw') return request.args[4];
    return request.args[5]?.signal;
}

function calculatedResult(
    request: PanelSeriesRowsRequest,
    usesRollup = false,
): PanelDataFetchResult {
    return [{
        seriesKey: TIME_SERIES.key,
        data: [[request.args[1].end, 1]],
        metadata: {
            kind: 'calculated',
            isLimitReached: false,
            usesRollup,
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

        expect(empty.result.current).toEqual({
            kind: 'invalid',
            reason: 'emptySeries',
        });
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

        expect(mixed.result.current).toEqual({
            kind: 'invalid',
            reason: 'mixedAxisKinds',
        });
        expect(fetchSpy).not.toHaveBeenCalled();
        mixed.unmount();
    });

    it('loads independent chart data and derives metrics and rollup status', async () => {
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockImplementation(
            async (request) => calculatedResult(request, true),
        );
        const { result } = renderHook(() => usePanelData(createParams()));

        await waitFor(() => {
            if (result.current.kind !== 'queryable') return;
            expect(result.current.load.requests).toMatchObject({
                main: { status: 'ready' },
                navigator: { status: 'ready' },
            });
        });

        expect(result.current.kind).toBe('queryable');
        if (result.current.kind !== 'queryable') return;
        expect(result.current.series.main[0]?.data).toEqual([[100, 1]]);
        expect(result.current.series.navigator[0]?.data).toEqual([
            [1_000, 1],
        ]);
        expect(result.current.query.resolution.kind).toBe('time');
        expect(result.current.query.seriesRollupStatuses).toEqual([
            { seriesName: 'Tag A', usesRollup: true },
        ]);
        expect(result.current.query.metrics).toEqual({
            main: {
                queriedEntries: 1,
                pointCount: 1,
                pixelWidth: 300,
            },
            navigator: {
                queriedEntries: 1,
                pointCount: 1,
                pixelWidth: 300,
            },
        });
        expect(result.current.load.notice).toBeUndefined();
    });

    it.each([
        {
            errorKind: 'no-data' as const,
            expectedStatus: 'ready',
            expectedNotice: 'noData',
        },
        {
            errorKind: 'request-failed' as const,
            expectedStatus: 'failed',
            expectedNotice: undefined,
        },
    ])(
        'classifies an all-$errorKind response',
        async ({ errorKind, expectedStatus, expectedNotice }) => {
            jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockResolvedValue([{
                seriesKey: TIME_SERIES.key,
                data: [],
                error: { kind: errorKind, message: 'Series unavailable.' },
            }]);
            const { result } = renderHook(() =>
                usePanelData(createParams()),
            );

            await waitFor(() => {
                if (result.current.kind !== 'queryable') return;
                expect(result.current.load.requests.main.status).toBe(
                    expectedStatus,
                );
                expect(result.current.load.requests.navigator.status).toBe(
                    expectedStatus,
                );
            });

            expect(result.current.kind).toBe('queryable');
            if (result.current.kind !== 'queryable') return;
            expect(result.current.series.main).toEqual([]);
            expect(result.current.load.notice).toBe(expectedNotice);
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
            if (result.current.kind !== 'queryable') return;
            expect(result.current.range.render?.mainRange.end).toBe(40);
            expect(result.current.load.requests.navigator.status).toBe(
                'ready',
            );
        });

        expect(result.current.kind).toBe('queryable');
        if (result.current.kind !== 'queryable') return;
        expect(result.current.range.render).toEqual({
            mainRange: { start: 0, end: 40 },
            navigatorRange: { start: 0, end: 44 },
        });
        expect(result.current.query.resolution).toEqual({ kind: 'raw' });
        expect(result.current.load.notice).toBe('partialData');
        expect(
            fetchSpy.mock.calls.some(([request]) => request.kind === 'raw'),
        ).toBe(true);
        expect(
            fetchSpy.mock.calls.some(
                ([request]) => request.kind === 'calculated',
            ),
        ).toBe(true);
    });

    it('aborts and ignores an obsolete main request without restarting the navigator', async () => {
        const pending: Array<{
            request: PanelSeriesRowsRequest;
            resolve: (result: PanelDataFetchResult) => void;
        }> = [];
        jest.spyOn(seriesDataApi, 'fetchSeriesRows').mockImplementation(
            (request) =>
                new Promise<PanelDataFetchResult>((resolve) => {
                    pending.push({ request, resolve });
                }),
        );
        const initialParams = createParams();
        const { result, rerender, unmount } = renderHook(
            ({ params }: { params: UsePanelDataParams }) =>
                usePanelData(params),
            { initialProps: { params: initialParams } },
        );

        await waitFor(() => expect(pending).toHaveLength(2));
        const oldMain = pending.find(
            ({ request }) => request.args[1].end === 100,
        )!;
        const navigator = pending.find(
            ({ request }) => request.args[1].end === 1_000,
        )!;

        rerender({
            params: {
                ...initialParams,
                rangeState: {
                    ...initialParams.rangeState!,
                    range: {
                        mainRange: { start: 10, end: 90 },
                        navigatorRange: { start: 0, end: 1_000 },
                    },
                },
            },
        });
        await waitFor(() => expect(pending).toHaveLength(3));
        const currentMain = pending.find(
            ({ request }) => request.args[1].end === 90,
        )!;

        expect(getSignal(oldMain.request)?.aborted).toBe(true);
        expect(getSignal(navigator.request)?.aborted).toBe(false);
        await act(async () => {
            oldMain.resolve(calculatedResult(oldMain.request));
            await Promise.resolve();
        });
        if (result.current.kind === 'queryable') {
            expect(result.current.series.main).toEqual([]);
            expect(result.current.load.requests.main.status).toBe('loading');
        }

        await act(async () => {
            currentMain.resolve(calculatedResult(currentMain.request));
            await Promise.resolve();
        });
        await waitFor(() => {
            if (result.current.kind !== 'queryable') return;
            expect(result.current.series.main[0]?.data).toEqual([[90, 1]]);
        });

        unmount();
        expect(getSignal(navigator.request)?.aborted).toBe(true);
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
            fetchSpy.mock.calls.map(([request]) => request.args[1]),
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

    it('applies resolution hysteresis to covering navigator data', async () => {
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
            .map(([request]) => request)
            .find(
                (request) =>
                    getRangeWidth(request.args[1]) === 500 * day,
            );
        expect(navigatorRequest?.kind).toBe('calculated');
        if (navigatorRequest?.kind !== 'calculated') return;
        expect(navigatorRequest.args[2].IntervalValue).toBe(5);

        rerender({
            params: withNavigatorRange(
                initialParams,
                100 * day,
                400 * day,
            ),
        });
        await act(async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);

        rerender({
            params: withNavigatorRange(
                initialParams,
                85 * day,
                415 * day,
            ),
        });
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
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
