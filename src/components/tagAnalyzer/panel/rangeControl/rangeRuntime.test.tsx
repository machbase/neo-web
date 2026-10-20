import type { RangeControlConfig, ResolvedRangeState } from './rangeControlModel';
import { act, renderHook, waitFor } from '@testing-library/react';
import type {
    AxisRange,
} from '../../rangeExpression/rangeModel';
import {
    createFullRangeState,
    resolveConfiguredRangeState,
    resolveNavigatorRangeState,
    resolveSetGlobalRangeRequest,
    usePanelRangeRuntime,
    type PanelBroadcastRequests,
} from './rangeRuntime';

const FULL_RANGE: AxisRange = { start: 0, end: 100 };
const mockLoadFullRange = jest.fn<Promise<AxisRange>, []>();

beforeEach(() => mockLoadFullRange.mockReset().mockResolvedValue(FULL_RANGE));

function createRangeConfig(): RangeControlConfig {
    return {
        key: 'panel-a',
        axisKind: 'time',
        rangeInput: { start: '', end: '' },
        loadFullRange: mockLoadFullRange,
    };
}

function createNumericRangeConfig(): RangeControlConfig {
    return { ...createRangeConfig(), axisKind: 'numeric' };
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

type RuntimeInputs = Parameters<typeof usePanelRangeRuntime>[0];

function renderPanelRangeRuntime(
    overrides: Partial<
        Omit<RuntimeInputs, 'onRangeStateChange' | 'onBroadcastError'>
    > = {},
) {
    const onRangeStateChange = jest.fn();
    const onBroadcastError = jest.fn();
    const props: RuntimeInputs = {
        ...createBroadcastRequests(),
        config: createRangeConfig(),
        rangeState: createResolvedRangeState(),
        isActive: true,
        ...overrides,
        onRangeStateChange,
        onBroadcastError,
    };
    return {
        ...renderHook(
            (inputs: RuntimeInputs) => usePanelRangeRuntime(inputs),
            { initialProps: props },
        ),
        props,
        onRangeStateChange,
        onBroadcastError,
    };
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

    it('restores a board numeric range written with a first offset', () => {
        const resolution = resolveConfiguredRangeState(
            'numeric',
            FULL_RANGE,
            undefined,
            { start: 'first', end: 'first+25' },
            1,
        );

        expect(resolution).toMatchObject({
            range: {
                mainRange: { start: 0, end: 25 },
                navigatorRange: FULL_RANGE,
            },
        });
    });

    it('restores a valid last view and skips invalid configured input on initialization', async () => {
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const lastViewedRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };
        const config = createRangeConfig();
        config.rangeInput = { start: 'invalid', end: 'also-invalid' };
        config.restoredRange = lastViewedRange;
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() => usePanelRangeRuntime({
            ...createBroadcastRequests(),
            config,
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        }));
        act(() => result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(onRangeStateChange).toHaveBeenCalled());

        expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            range: lastViewedRange,
        });
    });

    it.each([
        ['time', createRangeConfig(), { start: 1_000, end: 2_000 }],
        ['numeric', createNumericRangeConfig(), { start: 42, end: 43 }],
    ] as const)(
        'keeps a minimal %s range fully visible on initialization',
        async (_axisKind, config, fullRange) => {
            mockLoadFullRange
                .mockResolvedValue(fullRange);
            const onRangeStateChange = jest.fn();
            const { result } = renderHook(() => usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config,
                rangeState: undefined,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }));

            act(() => result.current.actions.setChartWidths(400, 344));
            await waitFor(() => expect(result.current.rangeState).toMatchObject({
                range: {
                    mainRange: fullRange,
                    navigatorRange: fullRange,
                },
                fullRange,
            }));
        },
    );

    it.each(['time', 'numeric'] as const)('keeps a requested %s navigator exact while fitting the main range', (axisKind) => {
        const current = createResolvedRangeState(
            { start: 40, end: 60 },
            FULL_RANGE,
        );
        current.navigatorRangeInput = { start: 'first', end: 'last' };

        const resolution = resolveNavigatorRangeState(
            axisKind,
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

    it.each(['time', 'numeric'] as const)('expands a requested %s navigator while preserving a fixed main range', (axisKind) => {
        const current = createResolvedRangeState({ start: 40, end: 60 });
        current.navigatorRangeInput = { start: 'first', end: 'last' };
        const original = JSON.parse(JSON.stringify(current));

        const resolution = resolveNavigatorRangeState(
            axisKind,
            FULL_RANGE,
            current,
            { start: '10', end: '30' },
            1,
            'main',
        );

        expect(resolution).toEqual({
            range: {
                mainRange: { start: 40, end: 60 },
                navigatorRange: { start: 10, end: 60 },
            },
            fullRange: FULL_RANGE,
            navigatorRangeInput: { start: 'first', end: 'last' },
        });
        expect(current).toEqual(original);
    });

    it('restores a navigator numeric range written with a last offset', () => {
        const current = createResolvedRangeState(
            { start: 0, end: 100 },
            FULL_RANGE,
        );

        const resolution = resolveNavigatorRangeState(
            'numeric',
            FULL_RANGE,
            current,
            { start: 'last-25', end: 'last' },
            1,
        );

        expect(resolution).toMatchObject({
            range: {
                mainRange: { start: 75, end: 100 },
                navigatorRange: { start: 75, end: 100 },
            },
        });
    });

    it('only creates a global request for a ready, valid panel range', () => {
        const range = createResolvedRangeState().range;

        expect(resolveSetGlobalRangeRequest('time', false, true, range))
            .toEqual({ axisKind: 'time', range });
        expect(resolveSetGlobalRangeRequest('time', false, false, range))
            .toBeUndefined();
        expect(resolveSetGlobalRangeRequest(undefined, false, true, range))
            .toBeUndefined();
        expect(resolveSetGlobalRangeRequest('time', true, true, range))
            .toBeUndefined();
        expect(resolveSetGlobalRangeRequest('numeric', true, true, range))
            .toEqual({ axisKind: 'numeric', range });
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

    it('does not load or invent a range when the configuration has no axis kind', () => {
        const runtime = renderPanelRangeRuntime({
            config: { ...createRangeConfig(), axisKind: undefined },
            rangeState: undefined,
        });

        act(() => {
            runtime.result.current.actions.setChartWidths(400, 344);
            runtime.result.current.actions.refreshRange();
            runtime.result.current.actions.expandFullRange();
        });

        expect(mockLoadFullRange).not.toHaveBeenCalled();
        expect(runtime.result.current.rangeState).toBeUndefined();
        expect(runtime.onRangeStateChange).not.toHaveBeenCalled();
    });

    it('uses each saved configuration loader and ignores the earlier pending result', async () => {
        const initialRequest = createDeferred<AxisRange>();
        const savedRequest = createDeferred<AxisRange>();
        mockLoadFullRange.mockReturnValue(initialRequest.promise);
        const savedLoader = jest.fn(() => savedRequest.promise);
        const runtime = renderPanelRangeRuntime({ rangeState: undefined });
        act(() => runtime.result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(mockLoadFullRange).toHaveBeenCalledTimes(1));

        const nextConfig: RangeControlConfig = {
            ...createNumericRangeConfig(),
            rangeInput: { start: '10', end: '20' },
            loadFullRange: savedLoader,
        };
        act(() => runtime.result.current.actions.reloadAfterEditorSave(nextConfig));
        runtime.rerender({ ...runtime.props, config: nextConfig });
        await waitFor(() => expect(savedLoader).toHaveBeenCalledTimes(1));
        await act(async () => savedRequest.resolve(FULL_RANGE));
        await waitFor(() => expect(runtime.result.current.rangeState?.range.mainRange)
            .toEqual({ start: 10, end: 20 }));
        const appliedCount = runtime.onRangeStateChange.mock.calls.length;

        await act(async () => initialRequest.resolve({ start: 1_000, end: 2_000 }));

        expect(runtime.result.current.rangeState?.range.mainRange).toEqual({ start: 10, end: 20 });
        expect(runtime.result.current.rangeState?.fullRange).toEqual(FULL_RANGE);
        expect(runtime.onRangeStateChange).toHaveBeenCalledTimes(appliedCount);
    });

    it('distinguishes chart interactions from asynchronous editor range updates', async () => {
        mockLoadFullRange.mockResolvedValue(FULL_RANGE);
        const config = createNumericRangeConfig();
        const runtime = renderPanelRangeRuntime({ config });
        act(() => runtime.result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(mockLoadFullRange).toHaveBeenCalled());
        expect(runtime.result.current.rangeOrigin).toBe('configured');

        act(() => runtime.result.current.actions.setMainRange({ start: 25, end: 50 }));
        expect(runtime.result.current.rangeOrigin).toBe('configured');
        act(() => runtime.result.current.actions.setMainRange({ start: 40, end: 60 }));
        expect(runtime.result.current.rangeOrigin).toBe('chart');

        const nextConfig = {
            ...config,
            rangeInput: { start: 'first+10', end: 'first+30' },
        };
        act(() => runtime.result.current.actions.reloadAfterEditorSave(nextConfig));
        runtime.rerender({ ...runtime.props, config: nextConfig });
        expect(runtime.result.current.rangeOrigin).toBe('configured');
        await waitFor(() => expect(runtime.result.current.rangeState?.range.mainRange).toEqual({ start: 10, end: 30 }));
        expect(runtime.result.current.rangeOrigin).toBe('configured');

        act(() => runtime.result.current.actions.setNavigatorRange({ start: 20, end: 80 }));
        expect(runtime.result.current.rangeOrigin).toBe('chart');
        expect(runtime.result.current.rangeState?.range).toEqual({
            mainRange: { start: 20, end: 40 },
            navigatorRange: { start: 20, end: 80 },
        });
    });

    it('loads, edits, refreshes, and clears a saved navigator range independently of main', async () => {
        mockLoadFullRange.mockResolvedValue(FULL_RANGE);
        const config = createNumericRangeConfig();
        config.rangeInput = { start: '40', end: '60' };
        config.navigatorRangeInput = { start: '10', end: '90' };
        const runtime = renderPanelRangeRuntime({ config, rangeState: undefined });
        act(() => runtime.result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(runtime.result.current.rangeState).toMatchObject({
            range: { mainRange: { start: 40, end: 60 }, navigatorRange: { start: 10, end: 90 } },
            navigatorRangeInput: { start: '10', end: '90' },
        }));
        const nextConfig = {
            ...config,
            navigatorRangeInput: { start: '20', end: '80' },
        };
        act(() => runtime.result.current.actions.reloadAfterEditorSave(nextConfig));
        runtime.rerender({ ...runtime.props, config: nextConfig });
        await waitFor(() => expect(runtime.result.current.rangeState?.range).toEqual({
            mainRange: { start: 40, end: 60 }, navigatorRange: { start: 20, end: 80 },
        }));
        act(() => runtime.result.current.actions.refreshRange());
        await waitFor(() => expect(runtime.result.current.rangeState?.navigatorRangeInput).toEqual({ start: '20', end: '80' }));
        const clearedConfig = { ...nextConfig, navigatorRangeInput: { start: '', end: '' } };
        act(() => runtime.result.current.actions.reloadAfterEditorSave(clearedConfig));
        runtime.rerender({ ...runtime.props, config: clearedConfig });
        await waitFor(() => expect(runtime.result.current.rangeState).toMatchObject({
            range: { mainRange: { start: 40, end: 60 }, navigatorRange: FULL_RANGE },
            navigatorRangeInput: { start: '', end: '' },
        }));
    });

    it('reloads the configured range only when the editor changes its exact input', async () => {
        const fetchFullRange = mockLoadFullRange
            .mockResolvedValue(FULL_RANGE);
        const config = createRangeConfig();
        config.rangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config,
                rangeState: createResolvedRangeState(),
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );
        act(() => result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalled());
        fetchFullRange.mockClear();
        onRangeStateChange.mockClear();

        act(() =>
            result.current.actions.reloadAfterEditorSave({
                ...config,
            }),
        );
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));
        expect(onRangeStateChange).not.toHaveBeenCalled();

        act(() =>
            result.current.actions.reloadAfterEditorSave({
                ...config,
                rangeInput: { start: ' 10', end: '30' },
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
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const config = createRangeConfig();
        const onRangeStateChange = jest.fn();
        const onBroadcastError = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config,
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError,
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartWidths(400, 344));
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

    it('keeps configured main authoritative over the persisted Board range', async () => {
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const config = createRangeConfig();
        config.rangeInput = { start: '20', end: '40' };
        const broadcasts = createBroadcastRequests();
        broadcasts.rangeRequests.board.time = {
            input: { start: '60', end: '80' },
            applyVersion: 1,
        };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...broadcasts,
                config,
                rangeState: undefined,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => result.current.actions.setChartWidths(400, 344));
        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: {
                    mainRange: { start: 20, end: 40 },
                    navigatorRange: { start: 20, end: 80 },
                },
            }),
        );
    });

    it('prioritizes configured main, configured navigator, then Board on refresh', async () => {
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const config = createNumericRangeConfig();
        config.rangeInput = { start: '40', end: '60' };
        const currentState = createResolvedRangeState();
        currentState.navigatorRangeInput = { start: '10', end: '30' };
        const broadcasts = createBroadcastRequests();
        broadcasts.rangeRequests.board.numeric = {
            input: { start: '70', end: '90' },
            applyVersion: 1,
        };
        const runtime = renderPanelRangeRuntime({
            ...broadcasts,
            config,
            rangeState: currentState,
        });

        act(() => {
            runtime.result.current.actions.setChartWidths(400, 344);
            runtime.result.current.actions.refreshRange();
        });

        await waitFor(() =>
            expect(runtime.onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: FULL_RANGE,
                range: {
                    mainRange: { start: 40, end: 60 },
                    navigatorRange: { start: 10, end: 60 },
                },
                navigatorRangeInput: { start: '10', end: '30' },
            }),
        );
    });

    it('uses a Board range when the configured initial range is invalid', async () => {
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const config = createRangeConfig();
        config.rangeInput = { start: 'invalid', end: 'invalid' };
        const broadcasts = createBroadcastRequests();
        broadcasts.rangeRequests.board.time = {
            input: { start: '60', end: '80' },
            applyVersion: 1,
        };
        const { result, onRangeStateChange, onBroadcastError } =
            renderPanelRangeRuntime({
                ...broadcasts,
                config,
                rangeState: undefined,
            });

        act(() => result.current.actions.setChartWidths(400, 344));

        await waitFor(() =>
            expect(onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: { navigatorRange: { start: 60, end: 80 } },
            }),
        );
        expect(onBroadcastError).not.toHaveBeenCalled();
    });

    it('reports an invalid initial Board range once and keeps the default', async () => {
        mockLoadFullRange.mockResolvedValue(
            FULL_RANGE,
        );
        const config = createRangeConfig();
        config.rangeInput = { start: 'invalid', end: 'invalid' };
        const broadcasts = createBroadcastRequests();
        broadcasts.rangeRequests.board.time = {
            input: { start: 'invalid', end: 'invalid' },
            applyVersion: 1,
        };
        const runtime = renderPanelRangeRuntime({
            ...broadcasts,
            config,
            rangeState: undefined,
        });

        act(() => runtime.result.current.actions.setChartWidths(400, 344));

        await waitFor(() =>
            expect(runtime.onBroadcastError).toHaveBeenCalledWith(
                'board-range:time:1',
                'The board range is invalid for this panel.',
            ),
        );
        expect(runtime.onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            fullRange: FULL_RANGE,
        });

        runtime.rerender(runtime.props);
        expect(runtime.onBroadcastError).toHaveBeenCalledTimes(1);
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
        mockLoadFullRange
            .mockReturnValueOnce(firstRequest)
            .mockReturnValueOnce(secondRequest);

        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config: createRangeConfig(),
            rangeState: undefined,
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result } = renderHook(() =>
            usePanelRangeRuntime(initialProps),
        );

        act(() => result.current.actions.setChartWidths(400, 344));
        await waitFor(() =>
            expect(mockLoadFullRange).toHaveBeenCalledTimes(1),
        );
        act(() => result.current.actions.refreshRange());
        await waitFor(() =>
            expect(mockLoadFullRange).toHaveBeenCalledTimes(2),
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
            config: createRangeConfig(),
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
        const fetchFullRange = mockLoadFullRange
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(commandRequest.promise);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config: createRangeConfig(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartWidths(400, 344));
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
            config: createRangeConfig(),
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
        const fetchFullRange = mockLoadFullRange
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(staleBoardRequest.promise)
            .mockReturnValueOnce(currentBoardRequest.promise);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config: createNumericRangeConfig(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartWidths(400, 344));
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
        const fetchFullRange = mockLoadFullRange
            .mockReturnValueOnce(initialRequest.promise)
            .mockReturnValueOnce(boardRequest.promise);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config: createNumericRangeConfig(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartWidths(400, 344));
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

    it('keeps a global range when an older range refresh completes', async () => {
        const refreshRequest = createDeferred<AxisRange>();
        mockLoadFullRange.mockReturnValue(
            refreshRequest.promise,
        );
        const runtime = renderPanelRangeRuntime();

        act(() => {
            runtime.result.current.actions.setChartWidths(400, 344);
            runtime.result.current.actions.refreshRange();
        });
        const globalRange = {
            mainRange: { start: 10, end: 20 },
            navigatorRange: { start: 0, end: 30 },
        };
        runtime.rerender({
            ...runtime.props,
            rangeRequests: {
                ...runtime.props.rangeRequests,
                global: {
                    axisKind: 'time',
                    range: globalRange,
                    applyVersion: 1,
                },
            },
        });
        await waitFor(() =>
            expect(runtime.onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                range: globalRange,
            }),
        );
        const callsAfterGlobal = runtime.onRangeStateChange.mock.calls.length;

        await act(async () => refreshRequest.resolve({ start: 0, end: 200 }));

        expect(runtime.onRangeStateChange).toHaveBeenCalledTimes(callsAfterGlobal);
        expect(runtime.onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
            range: globalRange,
        });
    });

    it('does not invalidate a refresh for another-axis global range', async () => {
        const refreshRequest = createDeferred<AxisRange>();
        mockLoadFullRange.mockReturnValue(
            refreshRequest.promise,
        );
        const runtime = renderPanelRangeRuntime();

        act(() => {
            runtime.result.current.actions.setChartWidths(400, 344);
            runtime.result.current.actions.refreshRange();
        });
        runtime.rerender({
            ...runtime.props,
            rangeRequests: {
                ...runtime.props.rangeRequests,
                global: {
                    axisKind: 'numeric',
                    range: {
                        mainRange: { start: 10, end: 20 },
                        navigatorRange: { start: 0, end: 30 },
                    },
                    applyVersion: 1,
                },
            },
        });

        await act(async () => refreshRequest.resolve({ start: 0, end: 200 }));

        expect(runtime.onRangeStateChange).toHaveBeenCalledWith(
            expect.objectContaining({ fullRange: { start: 0, end: 200 } }),
        );
    });

    it('clears navigator input and queues a range refresh', async () => {
        const pendingRequest = createDeferred<AxisRange>();
        const fetchFullRange = mockLoadFullRange
            .mockReturnValue(pendingRequest.promise);
        const currentState = createResolvedRangeState();
        currentState.navigatorRangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config: createRangeConfig(),
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

        act(() => result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));
    });

    it('expands a configured navigator around the configured main range', () => {
        const config = createNumericRangeConfig();
        config.rangeInput = { start: '40', end: '60' };
        const runtime = renderPanelRangeRuntime({ config });

        act(() =>
            runtime.result.current.actions.setNavigatorRange(
                { start: 10, end: 30 },
                { start: '10', end: '30' },
            ),
        );

        expect(runtime.onRangeStateChange).toHaveBeenLastCalledWith({
            fullRange: FULL_RANGE,
            range: {
                mainRange: { start: 40, end: 60 },
                navigatorRange: { start: 10, end: 60 },
            },
            navigatorRangeInput: { start: '10', end: '30' },
        });
    });

    it.each(['time', 'numeric'] as const)('expands Nav when %s Main zoom-out exceeds its bounds', (axisKind) => {
        const runtime = renderPanelRangeRuntime({
            config: { ...createRangeConfig(), axisKind },
            rangeState: createResolvedRangeState({ start: 0, end: 100 }, { start: -100, end: 300 }),
        });
        act(() => {
            runtime.result.current.actions.applyRangeAction('zoom-out-large');
            runtime.result.current.actions.applyRangeAction('zoom-out-large');
        });
        expect(runtime.result.current.rangeState?.range).toEqual({
            mainRange: { start: -750, end: 850 },
            navigatorRange: { start: -750, end: 850 },
        });
    });

    it.each([
        { action: 'shift-main-left' as const, mainRange: { start: 0, end: 25 }, expectedMain: { start: -7.5, end: 17.5 }, expectedNav: { start: -7.5, end: 92.5 } },
        { action: 'shift-main-right' as const, mainRange: { start: 75, end: 100 }, expectedMain: { start: 82.5, end: 107.5 }, expectedNav: { start: 7.5, end: 107.5 } },
    ])('moves Nav with $action when Main reaches its edge', ({ action, mainRange, expectedMain, expectedNav }) => {
        const runtime = renderPanelRangeRuntime({ rangeState: createResolvedRangeState(mainRange) });
        act(() => runtime.result.current.actions.applyRangeAction(action));
        expect(runtime.result.current.rangeState?.range).toEqual({ mainRange: expectedMain, navigatorRange: expectedNav });
    });

    it('narrows Nav during deep Main zoom and resize to keep the selection draggable', async () => {
        const runtime = renderPanelRangeRuntime({ config: createNumericRangeConfig() });
        act(() => runtime.result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(mockLoadFullRange).toHaveBeenCalled());
        act(() => {
            for (let i = 0; i < 12; i++) runtime.result.current.actions.applyRangeAction('zoom-in-small');
        });
        const zoomed = runtime.result.current.rangeState!.range;
        expect(zoomed.mainRange.end - zoomed.mainRange.start).toBeLessThan(0.1);
        expect(zoomed.navigatorRange.end - zoomed.navigatorRange.start).toBeLessThan(FULL_RANGE.end - FULL_RANGE.start);
        act(() => runtime.result.current.actions.setChartWidths(200, 144));
        const resized = runtime.result.current.rangeState!.range;
        expect(resized.mainRange).toEqual(zoomed.mainRange);
        expect(resized.navigatorRange.end - resized.navigatorRange.start).toBeLessThan(zoomed.navigatorRange.end - zoomed.navigatorRange.start);
        for (const [range, width] of [[zoomed, 344], [resized, 144]] as const) {
            expect(range.navigatorRange.start).toBeLessThanOrEqual(range.mainRange.start);
            expect(range.navigatorRange.end).toBeGreaterThanOrEqual(range.mainRange.end);
            const selectionPixels = width * (range.mainRange.end - range.mainRange.start) / (range.navigatorRange.end - range.navigatorRange.start);
            expect(selectionPixels).toBeGreaterThanOrEqual(36);
        }
    });

    it('accumulates local range actions before the parent echoes the range', () => {
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config: createRangeConfig(),
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

    it('commits a complete raw-limit range without replacing range metadata', () => {
        const initialRangeState = createResolvedRangeState();
        const runtime = renderPanelRangeRuntime({
            rangeState: initialRangeState,
        });
        const constrainedRange = {
            mainRange: { start: 0, end: 40 },
            navigatorRange: { start: 0, end: 44 },
        };

        act(() =>
            runtime.result.current.actions.applyRawLimitRange(
                initialRangeState.range,
                constrainedRange,
            ),
        );

        expect(runtime.onRangeStateChange).toHaveBeenLastCalledWith({
            ...initialRangeState,
            range: constrainedRange,
        });
    });

    it('does not apply a stale raw-limit range over a newer range', () => {
        const initialRangeState = createResolvedRangeState();
        const runtime = renderPanelRangeRuntime({
            rangeState: initialRangeState,
        });

        act(() => {
            runtime.result.current.actions.setMainRange({
                start: 60,
                end: 80,
            });
            runtime.result.current.actions.applyRawLimitRange(
                initialRangeState.range,
                {
                    mainRange: { start: 0, end: 40 },
                    navigatorRange: { start: 0, end: 44 },
                },
            );
        });

        expect(runtime.result.current.rangeState?.range.mainRange).toEqual({
            start: 60,
            end: 80,
        });
    });

    it('rejects non-finite and non-increasing local ranges', () => {
        const initialRangeState = createResolvedRangeState();
        const runtime = renderPanelRangeRuntime({
            rangeState: initialRangeState,
        });

        act(() => {
            runtime.result.current.actions.setMainRange({ start: 60, end: 20 });
            runtime.result.current.actions.setMainRange({ start: 20, end: 20 });
            runtime.result.current.actions.setNavigatorRange({
                start: Number.NaN,
                end: 80,
            });
        });

        expect(runtime.result.current.rangeState).toEqual(initialRangeState);
        expect(runtime.onRangeStateChange).not.toHaveBeenCalled();
    });

    it('makes local range and refresh actions no-ops while inactive', () => {
        const fetchFullRange = mockLoadFullRange;
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config: createRangeConfig(),
                rangeState: createResolvedRangeState(),
                isActive: false,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => {
            result.current.actions.setChartWidths(400, 344);
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
        const fetchFullRange = mockLoadFullRange;
        const onRangeStateChange = jest.fn();
        const config = createNumericRangeConfig();
        const currentState = createResolvedRangeState();
        currentState.navigatorRangeInput = { start: 'first', end: 'last' };
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config,
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
        const fetchFullRange = mockLoadFullRange
            .mockResolvedValueOnce(FULL_RANGE)
            .mockResolvedValueOnce(refreshedFullRange);
        const onRangeStateChange = jest.fn();
        const initialProps: Parameters<typeof usePanelRangeRuntime>[0] = {
            ...createBroadcastRequests(),
            config: createNumericRangeConfig(),
            rangeState: createResolvedRangeState(),
            isActive: true,
            onRangeStateChange,
            onBroadcastError: jest.fn(),
        };
        const { result, rerender } = renderHook(
            (props: typeof initialProps) => usePanelRangeRuntime(props),
            { initialProps },
        );

        act(() => result.current.actions.setChartWidths(400, 344));
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

    it('keeps configured main authoritative over a new numeric Board range', async () => {
        const fetchFullRange = mockLoadFullRange
            .mockResolvedValue(FULL_RANGE);
        const config = createNumericRangeConfig();
        config.rangeInput = { start: '40', end: '60' };
        const runtime = renderPanelRangeRuntime({ config });

        act(() => runtime.result.current.actions.setChartWidths(400, 344));
        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(1));

        const broadcasts = createBroadcastRequests();
        broadcasts.rangeRequests.board.numeric = {
            input: { start: '70', end: '90' },
            applyVersion: 1,
        };
        runtime.rerender({ ...runtime.props, ...broadcasts });

        await waitFor(() => expect(fetchFullRange).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(runtime.onRangeStateChange.mock.lastCall?.[0]).toMatchObject({
                fullRange: FULL_RANGE,
                range: {
                    mainRange: { start: 40, end: 60 },
                    navigatorRange: { start: 40, end: 90 },
                },
            }),
        );
    });

    it('keeps the fetched full range with a concrete numeric main range', async () => {
        const fetchFullRange = mockLoadFullRange
            .mockResolvedValue(FULL_RANGE);
        const config = createNumericRangeConfig();
        config.rangeInput = { start: '10', end: '30' };
        const onRangeStateChange = jest.fn();
        const { result } = renderHook(() =>
            usePanelRangeRuntime({
                ...createBroadcastRequests(),
                config,
                rangeState: undefined,
                isActive: true,
                onRangeStateChange,
                onBroadcastError: jest.fn(),
            }),
        );

        act(() => result.current.actions.setChartWidths(400, 344));

        await waitFor(() =>
            expect(onRangeStateChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    fullRange: FULL_RANGE,
                    range: {
                        mainRange: { start: 10, end: 30 },
                        navigatorRange: FULL_RANGE,
                    },
                }),
            ),
        );
        expect(fetchFullRange).toHaveBeenCalledTimes(1);
    });
});
