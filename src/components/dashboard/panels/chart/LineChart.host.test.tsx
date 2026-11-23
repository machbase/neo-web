import { act, render, waitFor } from '@testing-library/react';
import LineChart from './LineChart';
import { DashboardHostRuntime } from '../../extensions/hostRuntime';

const mockGetTqlScripts = jest.fn();
const mockMarkdownMount = jest.fn();

jest.mock('@/api/repository/machiot', () => ({
    getTqlScripts: (...args: any[]) => mockGetTqlScripts(...args),
    getTqlChart: jest.fn(),
    fetchTimeMinMax: jest.fn(),
    fetchMountTimeMinMax: jest.fn(),
}));

jest.mock('recoil', () => {
    const actual = jest.requireActual('recoil');
    return { ...actual, useRecoilValue: () => [], useRecoilState: () => [[], jest.fn()] };
});

jest.mock('@/components/worksheet/Markdown', () => {
    const { useEffect } = jest.requireActual('react');
    return {
        Markdown: ({ pContents }: any) => {
            useEffect(() => {
                mockMarkdownMount();
            }, []);
            return <div data-testid="mrk">{String(pContents)}</div>;
        },
    };
});

jest.mock('@/components/tql/ShowVisualization', () => ({
    ShowVisualization: ({ pPanelRef }: any) => {
        const { useEffect } = jest.requireActual('react');
        // Match the real renderer's processed marker so tab-return tests cannot
        // accidentally use the separate first-render fallback.
        useEffect(() => { pPanelRef.current.setAttribute('data-processed', 'true'); }, []);
        return <div data-testid="visual" />;
    },
}));

jest.mock('@/design-system/components', () => ({
    CommonTable: () => <div data-testid="table" />,
    Toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() },
}));


const VISUAL_RES = {
    status: 200,
    headers: { 'x-chart-type': 'echarts' },
    data: { chartID: 'chart-1', jsCodeAssets: [], theme: 'dark' },
};

const PANEL = {
    id: 'panel-1',
    type: 'Tql chart',
    theme: 'dark',
    w: 6,
    h: 6,
    useCustomTime: false,
    timeRange: { start: '', end: '', refresh: 'Off' },
    tqlInfo: { path: 'sink.tql', params: [] },
    blockList: [],
    chartOptions: {},
};

const BOARD_INFO = { id: 'board-1', dashboard: { variables: [] } };

const chart = (aChartVariableId: string, aBoardTimeMinMax: any, runtime: any, panel: any = PANEL, active = true) => (
    <LineChart
        pHostRuntime={runtime}
        pIsActiveTab={active}
        pLoopMode={false}
        pChartVariableId={aChartVariableId}
        pPanelInfo={panel}
        pType={undefined}
        pInsetDraging={false}
        pDragStat={false}
        pModifyState={{ id: '', state: false }}
        pSetModifyState={jest.fn()}
        pParentWidth={1200}
        pIsHeader
        pBoardTimeMinMax={aBoardTimeMinMax}
        pBoardInfo={BOARD_INFO}
        pOnResolveTheme={jest.fn()}
    />
);


jest.mock('@/utils/DashboardTqlChartParser', () => ({ TqlChartParser: (_info: unknown, range: unknown) => range }));

function makeRuntime() {
    let revision = 0;
    let state: any = { rangeOverrides: {}, rangePolicies: {}, overlays: [], actions: [], rangeRevision: 0, refresh: { revision: 0, reasons: [] } };
    const listeners = new Set<() => void>();
    return {
        subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
        getSnapshot: () => revision,
        getPanelState: () => state,
        change: (patch: any) => { state = { ...state, ...patch }; revision++; listeners.forEach((listener) => listener()); },
    };
}

beforeEach(() => { mockGetTqlScripts.mockReset(); mockGetTqlScripts.mockResolvedValue(VISUAL_RES); });

it('uses a fixed host range before the saved panel range and restores it when cleared', async () => {
    const runtime = makeRuntime();
    const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    act(() => runtime.change({ rangeOverrides: { time: { start: 3000, end: 4000 } }, rangeRevision: 1,
        rangePolicies: { time: { source: 'fixed', followBoardRefresh: false, followPanelRefresh: false } } }));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 3000, end: 4000 }));
    const beforeTick = mockGetTqlScripts.mock.calls.length;
    rerender(chart('id-1', { min: 5000, max: 6000, autoRefresh: true }, runtime));
    await act(async () => { await Promise.resolve(); });
    expect(mockGetTqlScripts.mock.calls.length).toBe(beforeTick);
    act(() => runtime.change({ rangeOverrides: {}, rangePolicies: {}, rangeRevision: 2 }));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 5000, end: 6000 }));
});

it('refreshes the fixed video window on manual refresh while ignoring automatic board ticks', async () => {
    const runtime = makeRuntime();
    runtime.change({ rangeOverrides: { time: { start: 3000, end: 4000 } }, rangeRevision: 1,
        rangePolicies: { time: { source: 'fixed', followBoardRefresh: false, followPanelRefresh: true, followManualRefresh: true } } });
    const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 3000, end: 4000 }));
    const before = mockGetTqlScripts.mock.calls.length;
    rerender(chart('id-1', { min: 5000, max: 6000, autoRefresh: true }, runtime));
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before);
    rerender(chart('id-2', { min: 5000, max: 6000, refresh: true }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(before + 1));
    expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 3000, end: 4000 });
});

it('re-queries on a target host refresh even when the range is unchanged', async () => {
    const runtime = makeRuntime();
    render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const previous = mockGetTqlScripts.mock.calls.length;
    act(() => runtime.change({ refresh: { revision: 1, reasons: ['panel-request'] } }));
    await waitFor(() => expect(mockGetTqlScripts.mock.calls.length).toBe(previous + 1));
});

it('follows the current board window without changing the saved custom range', async () => {
    const runtime = makeRuntime();
    runtime.change({ rangeOverrides: { time: { start: 1000, end: 2000 } }, rangeRevision: 1,
        rangePolicies: { time: { source: 'board', followBoardRefresh: true, followPanelRefresh: true } } });
    const saved = JSON.stringify(PANEL);
    const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 }));
    rerender(chart('id-1', { min: 7000, max: 8000, autoRefresh: true }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 7000, end: 8000 }));
    expect(JSON.stringify(PANEL)).toBe(saved);
});

it('ignores host state changes that only concern menus, messages or overlays', async () => {
    const runtime = makeRuntime();
    render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const previous = mockGetTqlScripts.mock.calls.length;
    act(() => runtime.change({ actions: [{ id: 'menu' }] }));
    await act(async () => { await Promise.resolve(); });
    expect(mockGetTqlScripts.mock.calls.length).toBe(previous);
});

it('applies a numeric-axis override using the existing distance range calculation', async () => {
    const runtime = makeRuntime();
    runtime.change({ rangeOverrides: { distance: { start: 20, end: 80 } }, rangeRevision: 1,
        rangePolicies: { distance: { source: 'fixed', followBoardRefresh: true, followPanelRefresh: true } } });
    const panel = { ...PANEL, blockList: [{ timeBaseTime: true, timeType: 10, time: 'ODOMETER' }] };
    render(chart('id-1', { min: 1000, max: 2000 }, runtime, panel));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 20, end: 80 }));
});

it('uses the linked Blackbox time range for a distance chart and restores its distance range when cleared', async () => {
    const runtime = new DashboardHostRuntime({ id: 'board-1', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: 20, end: 80 }, panels: [
        { id: 'video', type: 'Extension', capabilities: ['refresh'] },
        { id: 'panel-1', type: 'Tql chart', capabilities: ['range:distance'] },
    ] });
    const { host } = runtime.createHost({ panelId: 'video', packageId: 'neo-pkg-blackbox', typeId: 'video',
        surface: 'dashboard', getSettings: () => ({}), applySettings: () => {} });
    const panel = { ...PANEL, blockList: [{ timeBaseTime: true, timeType: 10, time: 'ODOMETER' }] };
    host.panels.setRangeOverride('panel-1', { kind: 'distance', source: 'fixed', range: { start: 20, end: 80 } });
    render(chart('id-1', { min: 1000, max: 2000 }, runtime, panel));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 20, end: 80 }));
    let dispose: (() => void) | undefined;
    act(() => {
        const result = host.panels.setRangeOverride('panel-1', { kind: 'time', source: 'fixed', range: { start: 3000, end: 4000 } });
        if (result.ok) dispose = result.value.dispose;
    });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 3000, end: 4000 }));
    act(() => { dispose?.(); });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 20, end: 80 }));
});

it('pauses the target own timer while its range policy disables it and restores it on clear', async () => {
    jest.useFakeTimers();
    try {
        const runtime = makeRuntime();
        runtime.change({ rangeOverrides: { time: { start: 3000, end: 4000 } }, rangeRevision: 1,
            rangePolicies: { time: { source: 'fixed', followBoardRefresh: false, followPanelRefresh: false } } });
        const panel = { ...PANEL, timeRange: { ...PANEL.timeRange, refresh: '1 seconds' } };
        render(chart('id-1', { min: 1000, max: 2000 }, runtime, panel));
        await act(async () => { await Promise.resolve(); });
        const initial = mockGetTqlScripts.mock.calls.length;
        await act(async () => { jest.advanceTimersByTime(3000); });
        expect(mockGetTqlScripts.mock.calls.length).toBe(initial);
        act(() => runtime.change({ rangeOverrides: {}, rangePolicies: {}, rangeRevision: 2 }));
        await act(async () => { await Promise.resolve(); });
        const restored = mockGetTqlScripts.mock.calls.length;
        await act(async () => { jest.advanceTimersByTime(1000); });
        expect(mockGetTqlScripts.mock.calls.length).toBe(restored + 1);
    } finally { jest.useRealTimers(); }
});

it('connects a real host session to the chart and restores its range when that session closes', async () => {
    const runtime = new DashboardHostRuntime({ id: 'board-1', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' }, panels: [
        { id: 'source', type: 'Extension', capabilities: ['refresh'] },
        { id: 'panel-1', type: 'Tql chart', capabilities: ['range:time', 'refresh'] },
    ] });
    const session = runtime.createHost({ panelId: 'source', packageId: 'example/package', typeId: 'example', surface: 'dashboard', getSettings: () => ({}), applySettings: () => {} });
    const { unmount } = render(chart('id-1', { min: 1000, max: 2000 }, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 }));
    act(() => {
        expect(session.host.panels.setRangeOverride('panel-1', { kind: 'time', source: 'fixed', range: { start: 9000, end: 10000 }, followBoardRefresh: false }).ok).toBe(true);
    });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 9000, end: 10000 }));
    act(() => session.dispose());
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 }));
    unmount();
    runtime.dispose();
});

function realHost() {
    const runtime = new DashboardHostRuntime({ id: 'board-1', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' }, panels: [
        { id: 'source', type: 'Extension', capabilities: ['refresh'] },
        { id: 'panel-1', type: 'Tql chart', capabilities: ['range:time', 'range:distance', 'refresh'] },
    ] });
    const session = runtime.createHost({ panelId: 'source', packageId: 'example/package', typeId: 'example', surface: 'dashboard', getSettings: () => ({}), applySettings: () => {} });
    return { runtime, session };
}

it.each(['time', 'distance'] as const)('replays only the latest hidden %s range once after returning to a rendered chart', async (kind) => {
    const { runtime, session } = realHost();
    const panel = kind === 'distance' ? { ...PANEL, blockList: [{ timeBaseTime: true, timeType: 10, time: 'ODOMETER' }] } : PANEL;
    const saved = JSON.stringify(panel);
    const window = { min: 1000, max: 2000 };
    const view = render(chart('id-1', window, runtime, panel));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const before = mockGetTqlScripts.mock.calls.length;
    view.rerender(chart('id-1', window, runtime, panel, false));
    act(() => {
        expect(session.host.panels.setRangeOverride('panel-1', { kind, source: 'fixed', range: { start: 3000, end: 4000 } }).ok).toBe(true);
        expect(session.host.panels.setRangeOverride('panel-1', { kind, source: 'fixed', range: { start: 9000, end: 10000 } }).ok).toBe(true);
    });
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before);
    view.rerender(chart('id-1', window, runtime, panel, true));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 9000, end: 10000 }));
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before + 1);
    expect(JSON.stringify(panel)).toBe(saved);
    view.rerender(chart('id-1', window, runtime, panel, false));
    view.rerender(chart('id-1', window, runtime, panel, true));
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before + 1);
    view.unmount(); session.dispose(); runtime.dispose();
});

it('retains a hidden target refresh even after later board refresh reasons replace it', async () => {
    const { runtime, session } = realHost();
    const window = { min: 1000, max: 2000 };
    const view = render(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const before = mockGetTqlScripts.mock.calls.length;
    view.rerender(chart('id-1', window, runtime, PANEL, false));
    act(() => { expect(session.host.panels.refresh('panel-1').ok).toBe(true); });
    await act(async () => { await Promise.resolve(); });
    act(() => { runtime.updateBoard({ id: 'board-1', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' }, panels: [
        { id: 'source', type: 'Extension', capabilities: ['refresh'] },
        { id: 'panel-1', type: 'Tql chart', capabilities: ['range:time', 'range:distance', 'refresh'] },
    ], refresh: { revision: 1, reasons: ['auto'] } }); });
    expect(runtime.getPanelState('panel-1').refresh.reasons).toEqual(['auto']);
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before);
    view.rerender(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(before + 1));
    view.unmount(); session.dispose(); runtime.dispose();
});

it('restores the saved range when a hidden range owner exits before the tab returns', async () => {
    const { runtime, session } = realHost();
    const window = { min: 1000, max: 2000 };
    const view = render(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const before = mockGetTqlScripts.mock.calls.length;
    view.rerender(chart('id-1', window, runtime, PANEL, false));
    act(() => { session.host.panels.setRangeOverride('panel-1', { kind: 'time', source: 'fixed', range: { start: 9000, end: 10000 } }); });
    act(() => { session.dispose(); });
    view.rerender(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(before + 1));
    expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 });
    view.unmount(); runtime.dispose();
});

it('keeps an already rendered chart unchanged on tab return when there is no pending host request', async () => {
    const { runtime, session } = realHost();
    const window = { min: 1000, max: 2000 };
    const view = render(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalled());
    const before = mockGetTqlScripts.mock.calls.length;
    view.rerender(chart('id-1', window, runtime, PANEL, false));
    view.rerender(chart('id-1', window, runtime));
    expect(mockGetTqlScripts).toHaveBeenCalledTimes(before);
    view.unmount(); session.dispose(); runtime.dispose();
});

it('queries a previously hidden unrendered chart only once when a pending range becomes visible', async () => {
    const { runtime, session } = realHost();
    const window = { min: 1000, max: 2000 };
    const view = render(chart('id-1', window, runtime, PANEL, false));
    act(() => { session.host.panels.setRangeOverride('panel-1', { kind: 'time', source: 'fixed', range: { start: 9000, end: 10000 } }); });
    expect(mockGetTqlScripts).not.toHaveBeenCalled();
    view.rerender(chart('id-1', window, runtime));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(1));
    expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 9000, end: 10000 });
    view.unmount(); session.dispose(); runtime.dispose();
});
