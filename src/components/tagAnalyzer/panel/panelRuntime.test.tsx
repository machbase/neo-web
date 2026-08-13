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
    createFullRangeState,
    resolveConfiguredRangeState,
    resolveNavigatorRangeState,
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
            board: {
                time: {
                    input: { start: '', end: '' },
                    applyVersion: 0,
                },
                numeric: {
                    input: { start: '', end: '' },
                    applyVersion: 0,
                },
            },
            global: undefined,
        },
        commandVersions: {
            refreshDataVersion: 0,
            refreshRangeVersion: 0,
            expandFullRangeVersion: 0,
        },
    };
}

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    const promise = new Promise<T>((promiseResolve) => {
        resolve = promiseResolve;
    });
    return { promise, resolve };
}

describe('panel range resolution policy', () => {
    it('uses the supplied reference time for relative configured ranges', () => {
        const resolution = resolveConfiguredRangeState(
            'time',
            FULL_RANGE,
            undefined,
            { start: 'now-1s', end: 'now' },
            10_000,
        );

        expect(resolution).toMatchObject({
            range: { mainRange: { start: 9_000, end: 10_000 } },
        });
    });

    it('restores a valid last view and skips invalid configured input on initialization', async () => {
        jest.spyOn(seriesDataApi, 'fetchSeriesFullRange').mockResolvedValue(
            FULL_RANGE,
        );
        const lastViewedRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };
        const panelInfo = createPanelInfo();
        panelInfo.time = {
                rangeInput: { start: 'invalid', end: 'also-invalid' },
                useLastViewedRange: true,
                lastViewedRange,
        };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() => usePanelRangeRuntime({
            ...createBroadcastRequests(),
            panelInfo,
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        }));
        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(onRangeStateChange).toHaveBeenCalled());

        expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            range: lastViewedRange,
        });
    });

    it('keeps a requested navigator exact while fitting the main range', () => {
        const current = createResolvedRangeState(
            { start: 40, end: 60 },
            FULL_RANGE,
        );
        current.navigatorRangeInput = { start: 'first', end: 'last' };

        const resolution = resolveNavigatorRangeState(
            'numeric',
            FULL_RANGE,
            current,
            { start: '10', end: '30' },
            1,
        );

        expect(resolution).toMatchObject({
            range: {
                mainRange: { start: 10, end: 30 },
                navigatorRange: { start: 10, end: 30 },
            },
            navigatorRangeInput: { start: 'first', end: 'last' },
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

    it('clears retained navigator input for a full range', () => {
        const full = createFullRangeState(FULL_RANGE);
        expect(full).toMatchObject({
            navigatorRangeInput: { start: '', end: '' },
        });
    });
});

describe('usePanelRangeRuntime', () => {
    afterEach(() => jest.restoreAllMocks());

    it('reloads the configured range only when the editor changes its exact input', async () => {
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockResolvedValue(FULL_RANGE);
        const panelInfo = createPanelInfo();
        panelInfo.time.rangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                panelInfo,
                rangeState: createResolvedRangeState(),
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );
        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalled());
        fetchFullRange.mockClear();
        onRangeStateChange.mockClear();

        act(() =>
            result.current.actions.reloadAfterEditorSave({
                ...panelInfo,
                title: 'Renamed panel',
            }),
        );
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));
        expect(onRangeStateChange).not.toHaveBeenCalled();

        act(() =>
            result.current.actions.reloadAfterEditorSave({
                ...panelInfo,
                time: {
                    ...panelInfo.time,
                    rangeInput: { start: ' 10', end: '30' },
                },
            }),
        );
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(onRangeStateChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    range: expect.objectContaining({
                        mainRange: { start: 10, end: 30 },
                    }),
                }),
            ),
        );
    });

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

        const appliedRequest = createBroadcastRequests();
        appliedRequest.rangeRequests.board.time = {
            input: { start: '10', end: '30' },
            applyVersion: 1,
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
                ...appliedRequest.rangeRequests,
                board: {
                    ...appliedRequest.rangeRequests.board,
                    time: {
                        input: { start: '20', end: '40' },
                        applyVersion: 2,
                    },
                },
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
        broadcasts.rangeRequests.board.time = {
            input: { start: '60', end: '80' },
            applyVersion: 1,
        };
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

    it('lets expand-full win over a simultaneous range refresh', async () => {
        const initialRequest = createDeferred<AxisRange>();
        const commandRequest = createDeferred<AxisRange>();
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(commandRequest.promise);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            panelInfo: createPanelInfo(),
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
        await act(async () => initialRequest.resolve(FULL_RANGE));
        onRangeStateChange.mockClear();

        rerender({
            ...initialProps,
            commandVersions: {
                ...initialProps.commandVersions,
                refreshRangeVersion: 1,
                expandFullRangeVersion: 1,
            },
        });

        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));
        expect(result.current.dataRefreshVersion).toBe(1);

        const expandedFullRange = { start: 0, end: 200 };
        await act(async () => commandRequest.resolve(expandedFullRange));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: expandedFullRange,
                range: {
                    mainRange: expandedFullRange,
                    navigatorRange: expandedFullRange,
                },
            }),
        );
    });

    it('counts command version jumps instead of treating them as booleans', async () => {
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
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

        rerender({
            ...initialProps,
            commandVersions: {
                refreshDataVersion: 3,
                refreshRangeVersion: 2,
                expandFullRangeVersion: 4,
            },
        });

        await waitFor(() => expect(result.current.dataRefreshVersion).toBe(5));
    });

    it('ignores a numeric Board result superseded by a newer Board version', async () => {
        const initialRequest = createDeferred<AxisRange>();
        const staleBoardRequest = createDeferred<AxisRange>();
        const currentBoardRequest = createDeferred<AxisRange>();
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(staleBoardRequest.promise)
            .mockReturnValueOnce(currentBoardRequest.promise);
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
        await act(async () => initialRequest.resolve(FULL_RANGE));
        onRangeStateChange.mockClear();

        const versionOne = createBroadcastRequests();
        versionOne.rangeRequests.board.numeric = {
            input: { start: '10', end: '30' },
            applyVersion: 1,
        };
        rerender({ ...initialProps, ...versionOne });
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));

        const versionTwo = createBroadcastRequests();
        versionTwo.rangeRequests.board.numeric = {
            input: { start: '60', end: '80' },
            applyVersion: 2,
        };
        rerender({ ...initialProps, ...versionTwo });
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(3));

        await act(async () =>
            staleBoardRequest.resolve({ start: 0, end: 200 }),
        );
        expect(onRangeStateChange).not.toHaveBeenCalled();

        const currentFullRange = { start: 0, end: 300 };
        await act(async () => currentBoardRequest.resolve(currentFullRange));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: currentFullRange,
                range: { navigatorRange: { start: 60, end: 80 } },
            }),
        );
    });

    it('ignores a numeric Board result superseded by a matching global range', async () => {
        const initialRequest = createDeferred<AxisRange>();
        const boardRequest = createDeferred<AxisRange>();
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(boardRequest.promise);
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
        await act(async () => initialRequest.resolve(FULL_RANGE));

        const boardBroadcast = createBroadcastRequests();
        boardBroadcast.rangeRequests.board.numeric = {
            input: { start: '10', end: '30' },
            applyVersion: 1,
        };
        rerender({ ...initialProps, ...boardBroadcast });
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));

        const globalRange = {
            mainRange: { start: 60, end: 70 },
            navigatorRange: { start: 50, end: 80 },
        };
        rerender({
            ...initialProps,
            ...boardBroadcast,
            rangeRequests: {
                ...boardBroadcast.rangeRequests,
                global: {
                    axisKind: 'numeric',
                    range: globalRange,
                    applyVersion: 1,
                },
            },
        });
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: globalRange,
            }),
        );
        const callsAfterGlobal = onRangeStateChange.mock.calls.length;

        await act(async () => boardRequest.resolve({ start: 0, end: 200 }));
        expect(onRangeStateChange).toHaveBeenCalledTimes(callsAfterGlobal);
        expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            range: globalRange,
        });
    });

    it('clears navigator input and queues a range refresh', async () => {
        const pendingRequest = createDeferred<AxisRange>();
        const fetchFullRange = jest
            .spyOn(seriesDataApi, 'fetchSeriesFullRange')
            .mockReturnValue(pendingRequest.promise);
        const currentState = createResolvedRangeState();
        currentState.navigatorRangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                panelInfo: createPanelInfo(),
                rangeState: currentState,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() =>
            result.current.actions.setNavigatorRange(
                currentState.range.navigatorRange,
                { start: '', end: '' },
            ),
        );

        expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            navigatorRangeInput: { start: '', end: '' },
        });
        expect(result.current.dataRefreshVersion).toBe(1);
        expect(fetchFullRange).not.toHaveBeenCalled();

        act(() => result.current.actions.setChartAreaWidth(400));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));
    });

    it('accumulates local range actions before the parent echoes the range', () => {
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                panelInfo: createPanelInfo(),
                rangeState: createResolvedRangeState(),
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => {
            result.current.actions.applyRangeAction('shift-main-right');
            result.current.actions.applyRangeAction('shift-main-right');
        });

        expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            range: { mainRange: { start: 40, end: 65 } },
        });
    });

    it('makes local range and refresh actions no-ops while inactive', () => {
        const fetchFullRange = jest.spyOn(
            seriesDataApi,
            'fetchSeriesFullRange',
        );
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                panelInfo: createPanelInfo(),
                rangeState: createResolvedRangeState(),
                isActive: false,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => {
            result.current.actions.setChartAreaWidth(400);
            result.current.actions.applyRangeAction('shift-main-right');
            result.current.actions.setMainRange({ start: 30, end: 60 });
            result.current.actions.setNavigatorRange(
                { start: 10, end: 80 },
                { start: '10', end: '80' },
            );
            result.current.actions.setNavigatorRange(
                { start: 10, end: 80 },
                { start: '', end: '' },
            );
            result.current.actions.refreshData();
            result.current.actions.refreshRange();
            result.current.actions.expandFullRange();
        });

        expect(onRangeStateChange).not.toHaveBeenCalled();
        expect(result.current.dataRefreshVersion).toBe(0);
        expect(fetchFullRange).not.toHaveBeenCalled();
    });

    it('selects its matching global range axis without refetching', async () => {
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
                ...initialProps.rangeRequests,
                global: {
                    axisKind: 'time',
                    range: globalRange,
                    applyVersion: 1,
                },
            },
        });
        expect(onRangeStateChange).not.toHaveBeenCalled();

        rerender({
            ...initialProps,
            rangeRequests: {
                ...initialProps.rangeRequests,
                global: {
                    axisKind: 'numeric',
                    range: globalRange,
                    applyVersion: 1,
                },
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
                ...initialProps.rangeRequests,
                board: {
                    ...initialProps.rangeRequests.board,
                    numeric: {
                        input: { start: 'first', end: 'last-20' },
                        applyVersion: 1,
                    },
                },
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
