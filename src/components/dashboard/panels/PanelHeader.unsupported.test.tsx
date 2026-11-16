import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import PanelHeader from './PanelHeader';

let mockActions: any[] = [];
beforeEach(() => { mockActions = []; });
jest.mock('../extensions/HostReact', () => ({ useHostActions: () => mockActions }));
jest.mock('react-tooltip', () => ({ Tooltip: () => null }));
jest.mock('@/components/dashboard/AutoRefreshControl', () => ({ __esModule: true, default: () => <button data-testid="refresh">Refresh</button> }));
jest.mock('@/components/modal/SaveDashboardModal', () => ({ SaveDashboardModal: () => null }));
jest.mock('@/components/modal/ConfirmModal', () => ({ ConfirmModal: ({ pCallback }: any) => <button onClick={pCallback}>Confirm delete</button> }));
jest.mock('@/design-system/components', () => {
    const Block = ({ children }: any) => <div>{children}</div>;
    return {
        Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
        Menu: { Root: Block, Trigger: Block, Content: Block, Item: ({ children, onClick, disabled, icon }: any) => <button onClick={onClick} disabled={disabled}>{icon}{children}</button> },
        Page: { Switch: () => null }, Toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() },
    };
});

const retired = { id: 'retired', type: 'Unavailable panel', title: 'Keep settings', x: 1, y: 2, w: 4, h: 3, opaque: { endpointId: 'keep-id', selected: ['chart'] } };
const neighbor = { id: 'chart', type: 'Line', title: 'Other chart', theme: 'dark', chartOptions: {}, blockList: [], timeRange: { start: '', end: '', refresh: 'Off' } };
function Inspector() { return <pre data-testid="boards">{JSON.stringify(useRecoilValue(gBoardList))}</pre>; }
function setup(panel: any, showEdit = jest.fn()) {
    const board = { id: 'board', dashboard: { variables: [], panels: [panel, neighbor] } };
    return {
        showEdit,
        ...render(<RecoilRoot initializeState={({ set }) => { set(gBoardList, [board] as any); set(gSelectedTab, board.id); }}>
            <PanelHeader pPanelInfo={panel} pBoardInfo={board} pIsHeader pShowEditPanel={showEdit} />
            <Inspector />
        </RecoilRoot>),
    };
}

test('renders an unsupported panel without accessing missing chart fields and keeps only safe management actions', () => {
    const before = JSON.stringify(retired); setup(retired);
    expect(screen.getByText('Keep settings')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
    for (const label of ['Setting', 'Show Taganalyzer', 'Download data', 'Save to tql']) expect(screen.queryByRole('button', { name: label })).toBeNull();
    expect(screen.queryByTestId('refresh')).toBeNull();
    expect(JSON.stringify(retired)).toBe(before);
});

test('does not expose a refresh operation for an unsupported panel even if it retains an old interval', () => {
    setup({ ...retired, timeRange: { start: 1, end: 2, refresh: '1s' } });
    expect(screen.queryByTestId('refresh')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Setting' })).toBeNull();
});

test('duplicates and deletes unsupported panels without changing their opaque settings or neighboring chart', () => {
    const before = JSON.stringify(retired); setup(retired);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    let panels = JSON.parse(screen.getByTestId('boards').textContent!)[0].dashboard.panels;
    expect(panels).toHaveLength(3);
    expect(panels[0]).toEqual(retired); expect(panels[1]).toEqual(neighbor);
    expect(panels[2]).toMatchObject({ type: retired.type, title: retired.title, opaque: retired.opaque });
    expect(panels[2].id).not.toBe(retired.id);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    panels = JSON.parse(screen.getByTestId('boards').textContent!)[0].dashboard.panels;
    expect(panels).toHaveLength(2); expect(panels[0]).toEqual(neighbor); expect(panels[1].opaque).toEqual(retired.opaque);
    expect(JSON.stringify(retired)).toBe(before);
});

test('retains built-in chart settings, exports and refresh operations', () => {
    const { showEdit } = setup({ ...neighbor, id: 'configured', timeRange: { start: '', end: '', refresh: '1s' } });
    for (const label of ['Setting', 'Show Taganalyzer', 'Download data', 'Save to tql']) expect(screen.getByRole('button', { name: label })).toBeVisible();
    expect(screen.getByTestId('refresh')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Setting' })); expect(showEdit).toHaveBeenCalledWith('edit', 'configured');
});

test('retains extension settings and safe management actions without exposing native chart exports', () => {
    const extension = { id: 'extension', type: 'Extension', title: 'Note', extension: { packageId: 'example/note', typeId: 'note', settingsVersion: 1, settings: { text: 'keep' } } };
    const { showEdit } = setup(extension);
    fireEvent.click(screen.getByRole('button', { name: 'Setting' })); expect(showEdit).toHaveBeenCalledWith('edit', extension.id);
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
    for (const label of ['Show Taganalyzer', 'Download data', 'Save to tql']) expect(screen.queryByRole('button', { name: label })).toBeNull();
});

test('places anchored extension actions among built-in items while retaining icons, callbacks and saved settings', () => {
    const select = jest.fn();
    mockActions = [
        { ownerId: 'owner', id: 'full', label: 'Fullscreen', icon: <svg data-testid="full-icon" />, position: { after: 'setting', priority: 30 }, onSelect: select },
        { ownerId: 'owner', id: 'sync', label: 'Synchronization', position: { after: 'setting', priority: 10 }, onSelect: select },
        { ownerId: 'owner', id: 'child', label: 'Child board', position: { after: 'setting', priority: 20 }, onSelect: select },
    ];
    const extension = { id: 'extension', type: 'Extension', title: 'Video', extension: { packageId: 'example/video', typeId: 'video', settingsVersion: 1, settings: { keep: [1, null, 3] } } };
    const saved = JSON.stringify(extension);
    const { showEdit } = setup(extension);
    const labels = ['Setting', 'Synchronization', 'Child board', 'Fullscreen', 'Duplicate', 'Delete'];
    expect(screen.getAllByRole('button').map(button => button.textContent).filter(text => labels.includes(text!))).toEqual(labels);
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toContainElement(screen.getByTestId('full-icon'));
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' })); expect(select).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Setting' })); expect(showEdit).toHaveBeenCalledWith('edit', 'extension');
    expect(JSON.stringify(extension)).toBe(saved);
});
