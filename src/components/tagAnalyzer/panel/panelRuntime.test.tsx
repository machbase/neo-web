import { act, renderHook, waitFor } from '@testing-library/react';
import { seriesDataApi } from '../api/seriesDataApi';
import type {
    AxisRange,
    ResolvedRangeState,
} from '../range/rangeModel';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../seriesModel';
import type { PanelInfo } from './panelModel';
import {
    resolvePanelRangeState,
    resolveSetGlobalRangeRequest,
    usePanelRangeRuntime,
    type PanelBroadcastRequests,
} from './panelRuntime';

const FULL_RANGE: AxisRange = { start: 0, end: 100 };
const SERIES: PanelSeriesDefinition = {
    key: 'series-a',
    table: 'DATA',
    sourceTagName: 'TAG',
    alias: 'TAG',
    calculationMode: PanelSeriesCalculationMode.Average,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
    },
};

function createPanelInfo(): PanelInfo {
    const valueRange = { min: undefined, max: undefined };
    const threshold = { enabled: false, value: undefined };
    const yAxis = {
        zeroBase: false,
        showTickline: true,
        valueRange,
        rawValueRange: valueRange,
        upperControlLimit: threshold,
        lowerControlLimit: threshold,
    };

    return {
        key: 'panel-a',
        title: 'Panel',
        isOverlapSelected: false,
        query: { tagSet: [SERIES], intervalType: undefined },
        mode: { isRaw: false, isOrderBy: false, useNormalize: false },
        time: {
            rangeInput: { start: '', end: '' },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: { showTickline: true },
            leftY: yAxis,
            rightY: { ...yAxis, enabled: false },
        },
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
                calculated: undefined,
                calculatedNavigator: undefined,
            },
            mainChartSampling: { enabled: false, sampleCount: undefined },
            rawNavigatorSampling: { enabled: true, sampleCount: 0.01 },
        },
        highlights: [],
        annotations: [],
    };
}

function createNumericPanelInfo(): PanelInfo {
    const panelInfo = createPanelInfo();
    return {
        ...panelInfo,
        query: {
            ...panelInfo.query,
            tagSet: panelInfo.query.tagSet.map((series) => ({
                ...series,
                sourceColumns: {
                    ...series.sourceColumns,
                    time: 'ODOMETER_M',
                    timeType: 20,
                    timeBaseTime: true,
                },
            })),
        },
    };
}

function createResolvedRangeState(
    mainRange: AxisRange = { start: 25, end: 50 },
    navigatorRange: AxisRange = FULL_RANGE,
): ResolvedRangeState {
    return {
        range: { mainRange, navigatorRange },
        fullRange: FULL_RANGE,
        navigatorRangeInput: { start: '', end: '' },
    };
}

function createBroadcastRequests(): PanelBroadcastRequests {
    return {
        rangeRequests: {
            boardRangeRequest: {
                input: { start: '', end: '' },
                applyVersion: 0,
            },
            globalRangeRequest: undefined,
        },
        commandVersions: {
            refreshDataVersion: 0,
            refreshRangeVersion: 0,
            expandFullRangeVersion: 0,
        },
    };
}

describe('panel range resolution policy', () => {
    it('uses the supplied reference time for relative configured ranges', () => {
        const panelInfo = createPanelInfo();
        const resolution = resolvePanelRangeState({
            axisKind: 'time',
            fullRange: FULL_RANGE,
            current: undefined,
            timeConfig: {
                ...panelInfo.time,
                rangeInput: { start: 'now-1s', end: 'now' },
            },
            selection: { kind: 'configured' },
            referenceTimeMs: 10_000,
        });

        expect(resolution).toMatchObject({
            kind: 'resolved',
            state: {
                range: { mainRange: { start: 9_000, end: 10_000 } },
            },
        });
    });

    it('restores a valid last view and skips invalid configured input on initialization', () => {
        const panelInfo = createPanelInfo();
        const lastViewedRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };
        const restored = resolvePanelRangeState({
            axisKind: 'time',
            fullRange: FULL_RANGE,
            current: undefined,
            timeConfig: {
                rangeInput: { start: 'invalid', end: 'also-invalid' },
                useLastViewedRange: true,
                lastViewedRange,
            },
            selection: { kind: 'initialize' },
            referenceTimeMs: 1,
        });
        const fallback = resolvePanelRangeState({
            axisKind: 'time',
            fullRange: FULL_RANGE,
            current: undefined,
            timeConfig: {
                ...panelInfo.time,
                rangeInput: { start: 'invalid', end: 'also-invalid' },
            },
            selection: { kind: 'initialize' },
            referenceTimeMs: 1,
        });

        expect(restored).toMatchObject({
            kind: 'resolved',
            state: { range: lastViewedRange },
        });
        expect(fallback).toMatchObject({
            kind: 'resolved',
            state: {
                range: {
                    mainRange: { start: 37.5, end: 62.5 },
                    navigatorRange: FULL_RANGE,
                },
            },
        });
    });

    it('keeps a requested navigator exact while fitting the main range', () => {
        const current = createResolvedRangeState(
            { start: 40, end: 60 },
            FULL_RANGE,
        );
        current.navigatorRangeInput = { start: 'first', end: 'last' };

        const resolution = resolvePanelRangeState({
            axisKind: 'numeric',
            fullRange: FULL_RANGE,
            current,
            timeConfig: createPanelInfo().time,
            selection: {
                kind: 'input',
                input: { start: '10', end: '30' },
            },
            referenceTimeMs: 1,
        });

        expect(resolution).toMatchObject({
            kind: 'resolved',
            state: {
                range: {
                    mainRange: { start: 10, end: 30 },
                    navigatorRange: { start: 10, end: 30 },
                },
                navigatorRangeInput: { start: 'first', end: 'last' },
            },
        });
    });

    it('only creates a global request for a ready, valid panel range', () => {
        const panelInfo = createPanelInfo();
        const range = createResolvedRangeState().range;

        expect(
            resolveSetGlobalRangeRequest(panelInfo, true, range),
        ).toEqual({ axisKind: 'time', range });
        expect(
            resolveSetGlobalRangeRequest(panelInfo, false, range),
        ).toBeUndefined();
        expect(
            resolveSetGlobalRangeRequest(
                { ...panelInfo, query: { ...panelInfo.query, tagSet: [] } },
                true,
                range,
            ),
        ).toBeUndefined();
        expect(
            resolveSetGlobalRangeRequest(
                { ...panelInfo, mode: { ...panelInfo.mode, isRaw: true } },
                true,
                range,
            ),
        ).toBeUndefined();

        const numericPanelInfo = createNumericPanelInfo();
        expect(
            resolveSetGlobalRangeRequest(
                {
                    ...numericPanelInfo,
                    mode: { ...numericPanelInfo.mode, isRaw: true },
                },
                true,
                range,
            ),
        ).toEqual({ axisKind: 'numeric', range });
    });

    it('clears retained navigator input for explicit global and full ranges', () => {
        const current = createResolvedRangeState();
        current.navigatorRangeInput = { start: 'first', end: 'last' };
        const params = {
            axisKind: 'numeric' as const,
            fullRange: FULL_RANGE,
            current,
            timeConfig: createPanelInfo().time,
            referenceTimeMs: 1,
        };

        const concrete = resolvePanelRangeState({
            ...params,
            selection: {
                kind: 'concrete',
                range: {
                    mainRange: { start: 10, end: 20 },
                    navigatorRange: { start: 0, end: 30 },
                },
            },
        });
        const full = resolvePanelRangeState({
            ...params,
            selection: { kind: 'full' },
        });

        expect(concrete).toMatchObject({
            kind: 'resolved',
            state: { navigatorRangeInput: { start: '', end: '' } },
        });
        expect(full).toMatchObject({
            kind: 'resolved',
            state: { navigatorRangeInput: { start: '', end: '' } },
        });
    });
});

describe('usePanelRangeRuntime', () => {
    afterEach(() => jest.restoreAllMocks());

    it('consumes each Board range version once and defers inactive versions', async () => {
        jest.spyOn(seriesDataApi, 'fetchSeriesFullRange').mockResolvedValue(
            FULL_RANGE,
        );
        const panelInfo = createPanelInfo();
        const onRangeStateChange = jest.fn();
        const onBroadcastError = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            panelInfo,
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError,
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(onRangeStateChange).toHaveBeenCalled());
        let currentState = onRangeStateChange.mock.lastCall?.[0] as
            | ResolvedRangeState
            | undefined;
        expect(currentState).toBeDefined();

        const appliedRequest = {
            ...createBroadcastRequests(),
            rangeRequests: {
                boardRangeRequest: {
                    input: { start: '10', end: '30' },
                    applyVersion: 1,
                },
                globalRangeRequest: undefined,
            },
        };
        rerender({ ...initialProps, ...appliedRequest, rangeState: currentState });
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: { navigatorRange: { start: 10, end: 30 } },
            }),
        );
        const callsAfterVersionOne = onRangeStateChange.mock.calls.length;
        currentState = onRangeStateChange.mock.lastCall?.[0];

        rerender({ ...initialProps, ...appliedRequest, rangeState: currentState });
        expect(onRangeStateChange).toHaveBeenCalledTimes(callsAfterVersionOne);

        const versionTwoRequest = {
            ...appliedRequest,
            rangeRequests: {
                boardRangeRequest: {
                    input: { start: '20', end: '40' },
                    applyVersion: 2,
                },
                globalRangeRequest: undefined,
            },
        };
        rerender({
            ...initialProps,
            ...versionTwoRequest,
            rangeState: currentState,
            isActive: false,
        });
        expect(onRangeStateChange).toHaveBeenCalledTimes(callsAfterVersionOne);

        rerender({
            ...initialProps,
            ...versionTwoRequest,
            rangeState: currentState,
            isActive: true,
        });
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: { navigatorRange: { start: 20, end: 40 } },
            }),
        );
        expect(onBroadcastError).not.toHaveBeenCalled();
    });

    it('keeps a configured initial range ahead of the persisted Board range', async () => {
        jest.spyOn(seriesDataApi, 'fetchSeriesFullRange').mockResolvedValue(
            FULL_RANGE,
        );
        const panelInfo = createPanelInfo();
        panelInfo.time.rangeInput = { start: '20', end: '40' };
        const broadcasts = createBroadcastRequests();
        if (broadcasts.rangeRequests) {
            broadcasts.rangeRequests.boardRangeRequest.input = {
                start: '60',
                end: '80',
            };
            broadcasts.rangeRequests.boardRangeRequest.applyVersion = 1;
        }
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...broadcasts,
                panelInfo,
                rangeState: undefined,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: {
                    mainRange: { start: 20, end: 40 },
                    navigatorRange: FULL_RANGE,
                },
            }),
        );
    });

    it('ignores an obsolete full-range result after a refresh', async () => {
        let resolveFirst: (range: AxisRange) => void = () => undefined;
        let resolveSecond: (range: AxisRange) => void = () => undefined;
        const firstRequest = new Promise<AxisRange>((resolve) => {
            resolveFirst = resolve;
        });
        const secondRequest = new Promise<AxisRange>((resolve) => {
            resolveSecond = resolve;
        });
        jest.spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockReturnValueOnce(firstRequest)
            .mockReturnValueOnce(secondRequest);

        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            panelInfo: createPanelInfo(),
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result } = renderHook(() =>
            usePanelRangeRuntime(initialProps),
        );

        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() =>
            expect(seriesDataApi.fetchSeriesFullRange).toHaveBeenCalledTimes(1),
        );
        act(() => result.current.actions.refreshRange());
        await waitFor(() =>
            expect(seriesDataApi.fetchSeriesFullRange).toHaveBeenCalledTimes(2),
        );

        await act(async () => resolveSecond({ start: 0, end: 200 }));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: { start: 0, end: 200 },
            }),
        );
        const callsAfterLatestResult = onRangeStateChange.mock.calls.length;

        await act(async () => resolveFirst(FULL_RANGE));
        expect(onRangeStateChange).toHaveBeenCalledTimes(
            callsAfterLatestResult,
        );
    });

    it('baselines command versions on mount and consumes inactive updates later', () => {
        const broadcasts = createBroadcastRequests();
        broadcasts.commandVersions.refreshDataVersion = 4;
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...broadcasts,
            panelInfo: createPanelInfo(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange: jest.fn(),
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        expect(result.current.dataRefreshVersion).toBe(0);
        rerender({
            ...initialProps,
            commandVersions: {
                ...initialProps.commandVersions,
                refreshDataVersion: 5,
            },
            isActive: false,
        });
        expect(result.current.dataRefreshVersion).toBe(0);

        rerender({
            ...initialProps,
            commandVersions: {
                ...initialProps.commandVersions,
                refreshDataVersion: 5,
            },
        });
        expect(result.current.dataRefreshVersion).toBe(1);
    });

    it('applies an axis-filtered numeric global range without refetching', async () => {
        const fetchFullRange = jest.spyOn(
            seriesDataApi,
            'fetchSeriesFullRange',
        );
        const onRangeStateChange = jest.fn();
        const panelInfo = createNumericPanelInfo();
        const currentState = createResolvedRangeState();
        currentState.navigatorRangeInput = { start: 'first', end: 'last' };
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            panelInfo,
            rangeState: currentState,
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );
        const globalRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };

        rerender({
            ...initialProps,
            rangeRequests: {
                ...initialProps.rangeRequests!,
                globalRangeRequest: { range: globalRange, applyVersion: 1 },
            },
        });

        await waitFor(() =>
            expect(onRangeStateChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    range: globalRange,
                    navigatorRangeInput: { start: '', end: '' },
                }),
            ),
        );
        expect(fetchFullRange).not.toHaveBeenCalled();
    });

    it('refreshes numeric bounds before resolving an anchored Board range', async () => {
        const refreshedFullRange = { start: 0, end: 200 };
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockResolvedValueOnce(FULL_RANGE)
            .mockResolvedValueOnce(refreshedFullRange);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            panelInfo: createNumericPanelInfo(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));

        rerender({
            ...initialProps,
            rangeRequests: {
                boardRangeRequest: {
                    input: { start: 'first', end: 'last-20' },
                    applyVersion: 1,
                },
                globalRangeRequest: undefined,
            },
        });

        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: refreshedFullRange,
                range: {
                    navigatorRange: { start: 0, end: 180 },
                },
            }),
        );
    });

    it('uses a concrete numeric configuration without fetching full range', async () => {
        const fetchFullRange = jest.spyOn(
            seriesDataApi,
            'fetchSeriesFullRange',
        );
        const panelInfo = createNumericPanelInfo();
        panelInfo.time.rangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                panelInfo,
                rangeState: undefined,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => result.current.actions.setChartAreaWidth(400));

        await waitFor(() =>
            expect(onRangeStateChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    fullRange: { start: 10, end: 30 },
                }),
            ),
        );
        expect(fetchFullRange).not.toHaveBeenCalled();
    });
});
