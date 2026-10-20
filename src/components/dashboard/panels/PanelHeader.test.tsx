import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import PanelHeader from './PanelHeader';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { createTagAnalyzerBoardFromDashboard } from '@/components/tagAnalyzer/application/adapters';

// The hand-off is stubbed at its own boundary: asserting on this mock is the difference between
// "the entry did nothing" and "the entry was not there", and only the second is the guarantee here.
jest.mock('@/components/tagAnalyzer/application/adapters', () => ({
    createTagAnalyzerBoardFromDashboard: jest.fn(() => ({ id: 'taz-board-1', name: 'panel.taz' })),
}));

// The header only imports this; nothing in these tests reaches the network.
jest.mock('@/api/repository/machiot', () => ({ fetchBlockTimeMinMax: jest.fn(async () => []) }));

// The panel's time-range tooltip positions itself after mount, which is state this test never reads
// and jsdom cannot measure — it only turns the run's output into act() warnings.
jest.mock('react-tooltip', () => ({ Tooltip: () => null }));

const openTagAnalyzerBoard = createTagAnalyzerBoardFromDashboard as jest.Mock;

// Menu.Content observes itself to reposition, and jsdom has no ResizeObserver.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

const BOARD_ID = 'board-1';

const createBlock = (overrides: Record<string, any> = {}) => ({
    id: 'block-1',
    type: 'tag',
    useCustom: false,
    isVisible: true,
    customFullTyping: { use: false, text: '' },
    userName: 'SYS',
    table: 'EXAMPLE',
    tag: 'sensor-1',
    alias: '',
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['TIME', 6, 0, 1, 0],
        ['VALUE', 20, 0, 2, 0],
    ],
    ...overrides,
});

const createPanel = (blockList: any[], overrides: Record<string, any> = {}) => ({
    id: 'panel-1',
    title: 'panel',
    type: 'Line',
    theme: 'dark',
    useCustomTime: false,
    useCustomDistance: false,
    timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' },
    chartOptions: {},
    blockList,
    ...overrides,
});

const createBoard = () => ({
    id: BOARD_ID,
    dashboard: { timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' }, variables: [], panels: [] },
});

const renderHeader = (panel: any) => {
    const board = createBoard();
    return render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gBoardList, [board] as any);
                set(gSelectedTab, BOARD_ID);
            }}
        >
            <PanelHeader pShowEditPanel={jest.fn()} pPanelInfo={panel} pBoardInfo={board} pIsView={false} pIsHeader={false} pType={undefined} />
        </RecoilRoot>
    );
};

const openPanelMenu = (container: HTMLElement) => {
    const trigger = container.querySelector('.menu__trigger');
    if (!trigger) throw new Error('panel menu trigger not found');
    fireEvent.click(trigger);
};

beforeAll(() => {
    (global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;
});

beforeEach(() => {
    jest.clearAllMocks();
});

// The Tag Analyzer charts one series per tag name. Until now the entry was drawn for every chart
// panel, so a panel built on v8.7's tagless types offered a door that only ever answered with an
// error toast — the type has no tag column for a series to name.
describe('PanelHeader Tag Analyzer entry', () => {
    test('a tag panel offers it, and it opens a board', () => {
        const { container } = renderHeader(createPanel([createBlock()]));
        openPanelMenu(container);

        const entry = screen.getByRole('button', { name: 'Show Taganalyzer' });
        fireEvent.click(entry);

        expect(openTagAnalyzerBoard).toHaveBeenCalledTimes(1);
    });

    test.each(['view', 'transaction'])('a %s panel does not offer it at all', (type) => {
        // The shape a real tagless block carries: repairDashboardBlockForTableColumns forces
        // useCustom on, because there is no tag column to collapse onto.
        const { container } = renderHeader(createPanel([createBlock({ type, useCustom: true })]));
        openPanelMenu(container);

        expect(screen.queryByRole('button', { name: 'Show Taganalyzer' })).toBeNull();
        // The rest of the menu is untouched.
        expect(screen.getByRole('button', { name: 'Download data' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Setting' })).toBeInTheDocument();
    });

    test('a panel mixing a tagless block with a tag one keeps it', () => {
        const { container } = renderHeader(createPanel([createBlock({ id: 'block-2', type: 'view', useCustom: true }), createBlock()]));
        openPanelMenu(container);

        expect(screen.getByRole('button', { name: 'Show Taganalyzer' })).toBeInTheDocument();
    });
});

// issue-1544 r13: the child board link goes through the one share-link rule (toDshPath), like ShareModal —
// split('.')[0] cut `v1.2.dsh` to `v1` and rebuilt `X.DSH` as `X.dsh` in the view.
describe('PanelHeader child board link (share-link rule)', () => {
    test.each([
        ['d/X.DSH', '/web/ui/board/d/X.DSH'],
        ['v1.2.dsh', '/web/ui/board/v1.2.dsh'],
        ['d/old', '/web/ui/board/d/old.dsh'],
    ])('childBoard %s → %s', (childBoard, expected) => {
        const sOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
        const { container } = renderHeader(createPanel([createBlock()], { type: 'Video', chartOptions: { childBoard, source: {} } }));
        openPanelMenu(container);
        fireEvent.click(screen.getByRole('button', { name: 'Child board' }));
        expect(sOpen).toHaveBeenCalledWith(window.location.origin + expected);
        sOpen.mockRestore();
    });

    // r15: an empty child board made '.../board/undefined' (before) / '.../board/.dsh' (toDshPath) — no link at all now
    test.each([[''], ['  '], [undefined]])('childBoard %p → no window opened', (childBoard) => {
        const sOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
        const { container } = renderHeader(createPanel([createBlock()], { type: 'Video', chartOptions: { childBoard, source: {} } }));
        openPanelMenu(container);
        fireEvent.click(screen.getByRole('button', { name: 'Child board' }));
        expect(sOpen).not.toHaveBeenCalled();
        sOpen.mockRestore();
    });
});
