import { fireEvent, render, screen } from '@testing-library/react';
import PanelHeader from './PanelHeader';
const mockSelect = jest.fn();
let mockActions: any[];
beforeEach(() => {
    mockSelect.mockClear();
    mockActions = [{ ownerId: 'player', id: 'fullscreen', label: 'Fullscreen', onSelect: mockSelect }];
});
beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any; });
jest.mock('@/components/dashboard/extensions/HostReact', () => ({ useHostActions: () => mockActions }));
const panel = { id: 'video', theme: 'dark', title: 'Video title' };

test('keeps the native header hidden and exposes only registered viewer actions', () => {
    const { container } = render(<PanelHeader pPanelInfo={panel} pIsHeader={false} pShowActions />);
    expect(container.querySelector('.board-panel-header')).toHaveClass('display-none');
    fireEvent.click(screen.getByRole('button', { name: 'Panel actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Setting')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
});

test('does not add extension actions to an ordinary public chart', () => {
    render(<PanelHeader pPanelInfo={{ ...panel, type: 'Line' }} pIsHeader={false} />);
    expect(screen.queryByRole('button', { name: 'Panel actions' })).toBeNull();
});

test('uses priority-based viewer order and icons without exposing editing items', () => {
    mockActions = [
        { ownerId: 'player', id: 'fullscreen', label: 'Fullscreen', position: { after: 'setting', priority: 30 }, icon: <svg data-testid="viewer-icon" />, onSelect: mockSelect },
        { ownerId: 'player', id: 'sync', label: 'Synchronization', position: { after: 'setting', priority: 10 }, onSelect: mockSelect },
        { ownerId: 'player', id: 'child', label: 'Child board', position: { after: 'setting', priority: 20 }, onSelect: mockSelect },
    ];
    render(<PanelHeader pPanelInfo={panel} pIsHeader pShowActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Panel actions' }));
    expect(screen.getAllByRole('button').map(button => button.textContent).filter(Boolean)).toEqual(['Synchronization', 'Child board', 'Fullscreen']);
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toContainElement(screen.getByTestId('viewer-icon'));
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' })); expect(mockSelect).toHaveBeenCalledTimes(1);
    for (const label of ['Setting', 'Duplicate', 'Delete']) expect(screen.queryByText(label)).toBeNull();
});
