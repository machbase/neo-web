import { fireEvent, render, screen } from '@testing-library/react';
import PanelHeader from './PanelHeader';
const mockSelect = jest.fn();
beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any; });
jest.mock('@/components/dashboard/extensions/HostReact', () => ({ useHostActions: () => [
    { ownerId: 'player', id: 'fullscreen', label: 'Fullscreen', onSelect: mockSelect },
] }));
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
