/**
 * Refresh policy regression tests for TQL panels whose sink is markdown/text/csv — i.e. whose response
 * content-type is not a visualization.
 *
 * - A manual refresh (the dashboard Refresh button, which changes chartVariableId) must re-render the
 *   sink even when the response is byte-identical to the previous one. Sink results are strings, so
 *   without a render key React bails out of the state update and the panel stays as it was.
 * - Dashboard auto-refresh ticks (boardTimeMinMax.autoRefresh) must NOT re-query these panels, while
 *   visualization TQL panels keep auto-refreshing as before.
 */
import { render, screen, waitFor } from '@testing-library/react';
import LineChart from './LineChart';

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
    ShowVisualization: () => <div data-testid="visual" />,
}));

jest.mock('@/design-system/components', () => ({
    CommonTable: () => <div data-testid="table" />,
    Toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() },
}));

jest.mock('@/hooks/useVideoSync', () => ({
    subscribeTimeRangeChange: jest.fn(),
    unsubscribeTimeRangeChange: jest.fn(),
    getVideoPanelStateForChart: () => undefined,
}));

const MARKDOWN_RES = { status: 200, headers: { 'content-type': 'text/markdown' }, data: '## same content every time' };
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

const chart = (aChartVariableId: string, aBoardTimeMinMax: any) => (
    <LineChart
        pIsActiveTab
        pLoopMode={false}
        pChartVariableId={aChartVariableId}
        pPanelInfo={PANEL}
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

describe('TQL sink panel refresh policy', () => {
    beforeEach(() => {
        mockGetTqlScripts.mockReset();
        mockMarkdownMount.mockReset();
    });

    it('re-renders the markdown sink on a manual refresh even when the response is unchanged', async () => {
        mockGetTqlScripts.mockResolvedValue(MARKDOWN_RES);

        const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }));
        await waitFor(() => expect(screen.getByTestId('mrk')).toBeInTheDocument());
        const sMountsBefore = mockMarkdownMount.mock.calls.length;
        const sFetchesBefore = mockGetTqlScripts.mock.calls.length;

        // Refresh button: new chartVariableId + refresh flag (never autoRefresh)
        rerender(chart('id-2', { min: 1000, max: 2000, refresh: true }));

        await waitFor(() => expect(mockGetTqlScripts.mock.calls.length).toBeGreaterThan(sFetchesBefore));
        await waitFor(() => expect(mockMarkdownMount.mock.calls.length).toBeGreaterThan(sMountsBefore));
    });

    it('does not re-query a markdown sink panel on an auto refresh tick', async () => {
        mockGetTqlScripts.mockResolvedValue(MARKDOWN_RES);

        const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }));
        await waitFor(() => expect(screen.getByTestId('mrk')).toBeInTheDocument());
        const sFetchesBefore = mockGetTqlScripts.mock.calls.length;

        // Auto refresh tick: same chartVariableId, a new time object carrying only the autoRefresh flag
        rerender(chart('id-1', { min: 1000, max: 2000, autoRefresh: true }));

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(mockGetTqlScripts.mock.calls.length).toBe(sFetchesBefore);
    });

    it('keeps re-querying a visualization TQL panel on an auto refresh tick', async () => {
        mockGetTqlScripts.mockResolvedValue(VISUAL_RES);

        const { rerender } = render(chart('id-1', { min: 1000, max: 2000 }));
        await waitFor(() => expect(screen.getByTestId('visual')).toBeInTheDocument());
        const sFetchesBefore = mockGetTqlScripts.mock.calls.length;

        rerender(chart('id-1', { min: 1000, max: 2000, autoRefresh: true }));

        await waitFor(() => expect(mockGetTqlScripts.mock.calls.length).toBeGreaterThan(sFetchesBefore));
    });
});
