/**
 * Native chart previews intentionally keep their current dashboard connection.
 * These are preservation tests, not regressions that should fail before the latest fixes.
 */
import { act, render, waitFor } from '@testing-library/react';
import Panel from './Panel';
import { DashboardHostRuntime } from '../extensions/hostRuntime';

const mockGetTqlScripts = jest.fn();
let mockRuntime: DashboardHostRuntime;

jest.mock('@/api/repository/machiot', () => ({
    getTqlScripts: (...args: unknown[]) => mockGetTqlScripts(...args),
    getTqlChart: jest.fn(), fetchTimeMinMax: jest.fn(), fetchMountTimeMinMax: jest.fn(),
}));
jest.mock('recoil', () => ({ ...jest.requireActual('recoil'), useRecoilValue: () => [] }));
jest.mock('@/components/dashboard/extensions/HostReact', () => ({ useHostBoard: () => ({ runtime: mockRuntime }) }));
jest.mock('./PanelHeader', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('./video/VideoPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/tql/ShowVisualization', () => ({ ShowVisualization: () => <div data-testid="visual" /> }));
jest.mock('@/components/worksheet/Markdown', () => ({ Markdown: () => null }));
jest.mock('@/design-system/components', () => ({ CommonTable: () => null }));
jest.mock('@/utils/DashboardTqlChartParser', () => ({ TqlChartParser: (_info: unknown, range: unknown) => range }));
jest.mock('@/hooks/useVideoSync', () => ({
    subscribeTimeRangeChange: jest.fn(), unsubscribeTimeRangeChange: jest.fn(), getVideoPanelStateForChart: () => undefined,
}));

const PANEL = {
    id: 'chart-1', type: 'Tql chart', title: 'Connected chart', theme: 'dark', w: 6, h: 6,
    useCustomTime: false, timeRange: { start: 7000, end: 8000, refresh: 'Off' },
    tqlInfo: { path: 'chart.tql', params: [] }, blockList: [], chartOptions: {},
};
const BOARD_INFO = { id: 'board-1', dashboard: { panels: [PANEL], variables: [] } };
const visualResponse = { status: 200, headers: { 'x-chart-type': 'echarts' },
    data: { chartID: 'chart-1', jsCodeAssets: [], theme: 'dark' } };

function owner() {
    return mockRuntime.createHost({ panelId: 'source', packageId: 'example/package', typeId: 'example', surface: 'dashboard',
        getSettings: () => ({}), applySettings: () => {} });
}
function chart(preview: boolean, panel = PANEL) {
    return <Panel pExtensionMode={preview ? 'preview' : 'dashboard'} pType={preview ? 'edit' : undefined}
        pIsActiveTab={!preview} pLoopMode={false} pChartVariableId={preview ? 'preview-id' : 'live-id'}
        pPanelInfo={panel} pBoardInfo={BOARD_INFO} pBoardTimeMinMax={{ min: 1000, max: 2000 }}
        pModifyState={{ id: '', state: false }} pSetModifyState={jest.fn()} pParentWidth={1200} pIsHeader={!preview} />;
}

beforeEach(() => {
    mockGetTqlScripts.mockReset();
    mockGetTqlScripts.mockResolvedValue(visualResponse);
    mockRuntime = new DashboardHostRuntime({ id: 'board-1', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' },
        panels: [{ id: 'source', type: 'Extension', capabilities: ['refresh'] },
            { id: 'chart-1', type: 'Tql chart', capabilities: ['range:time', 'refresh'] }] });
});

afterEach(() => mockRuntime.dispose());

it('keeps the live target range connected to the native preview and restores the board range when cleared', async () => {
    const saved = JSON.stringify(PANEL);
    const session = owner();
    const view = render(chart(true));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 }));
    let handle: ReturnType<typeof session.host.panels.setRangeOverride>;
    act(() => { handle = session.host.panels.setRangeOverride('chart-1', {
        kind: 'time', source: 'fixed', range: { start: 3000, end: 4000 }, followBoardRefresh: false,
    }); });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 3000, end: 4000 }));
    act(() => { if (!handle.ok) throw new Error(handle.error.message); handle.value.dispose(); });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 1000, end: 2000 }));
    expect(JSON.stringify(PANEL)).toBe(saved);
    view.unmount();
    session.dispose();
});

it('uses the preview own range when no target override is registered', async () => {
    const panel = { ...PANEL, useCustomTime: true };
    const saved = JSON.stringify(panel);
    const view = render(chart(true, panel));
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenLastCalledWith({ start: 7000, end: 8000 }));
    expect(JSON.stringify(panel)).toBe(saved);
    view.unmount();
});

it('preserves target refresh delivery to both the live chart and its connected preview', async () => {
    const session = owner();
    const view = render(<>{chart(false)}{chart(true)}</>);
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(2));
    act(() => { expect(session.host.panels.refresh('chart-1').ok).toBe(true); });
    await waitFor(() => expect(mockGetTqlScripts).toHaveBeenCalledTimes(4));
    expect(mockGetTqlScripts.mock.calls.slice(-2)).toEqual([[{ start: 1000, end: 2000 }], [{ start: 1000, end: 2000 }]]);
    view.unmount();
    session.dispose();
});
