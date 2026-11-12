import { fireEvent, render, screen } from '@testing-library/react';
import { CheckDataCompatibility } from '../../utils/CheckDataCompatibility';
import { DefaultChartOption } from '@/utils/eChartHelper';
import Panel from './Panel';

jest.mock('./chart/LineChart', () => ({ __esModule: true, default: () => <div data-testid="native-chart" /> }));

function board(type: string, refresh = '3 seconds', useAutoRefresh = false) {
    const native = type === 'Line' || type === 'Geomap';
    const panel = {
        ...(native ? JSON.parse(JSON.stringify(DefaultChartOption)) : {}),
        id: 'panel', type, title: 'Preserved title', theme: 'dark', x: 0, y: 0, w: 6, h: 4,
        blockList: [], transformBlockList: [], timeRange: { start: 1000, end: 2000, refresh },
        chartOptions: { useAutoRefresh },
        extension: { packageId: 'example/panel', typeId: 'example', settingsVersion: 1, settings: { nested: [1, null, { keep: true }] } },
        opaque: { keep: 7 },
    };
    const neighbor = { ...JSON.parse(JSON.stringify(DefaultChartOption)), id: 'neighbor', type: 'Line', blockList: [], transformBlockList: [] };
    const source = JSON.stringify({ dashboard: { variables: [], panels: [panel, neighbor] } });
    const parsed = CheckDataCompatibility(source, 'dsh');
    return { panel, source, parsed };
}

test.each(['Unavailable panel', 'Extension'])('hides public refresh controls for %s while preserving stored settings and the neighboring chart', (type) => {
    const input = board(type);
    const before = JSON.stringify(input.parsed);
    const onChange = jest.fn();
    const { container } = render(<Panel pPanelInfo={input.parsed.dashboard.panels[0]} pIsHeader={false} pOnChangePanelRefresh={onChange} />);
    expect(screen.getByText('This panel type is not supported.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Auto refresh' })).toBeNull();
    expect(screen.queryByTestId('native-chart')).toBeNull();
    expect(container.querySelector('.board-panel-header')).toHaveClass('display-none');
    expect(onChange).not.toHaveBeenCalled();
    expect(input.parsed.dashboard.panels[0]).toEqual(input.panel);
    expect(JSON.stringify(input.parsed)).toBe(before);
    expect(JSON.parse(input.source).dashboard.panels[0]).toEqual(input.panel);
});

test.each(['Line', 'Geomap'])('keeps the public %s refresh menu and selection callback', (type) => {
    const input = board(type, '3 seconds', true);
    const before = JSON.stringify(input.parsed);
    const onChange = jest.fn();
    render(<Panel pPanelInfo={input.parsed.dashboard.panels[0]} pIsHeader={false} pOnChangePanelRefresh={onChange} />);
    expect(screen.getByTestId('native-chart')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Auto refresh' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '5 seconds' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('panel', '5 seconds');
    expect(JSON.stringify(input.parsed)).toBe(before);
});

test.each(['Line', 'Geomap'])('keeps the refresh control hidden when %s refresh is Off', (type) => {
    const input = board(type, 'Off', true);
    render(<Panel pPanelInfo={input.parsed.dashboard.panels[0]} pIsHeader={false} />);
    expect(screen.getByTestId('native-chart')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Auto refresh' })).toBeNull();
});

test('keeps the Geomap refresh control hidden when its own auto refresh is disabled', () => {
    const input = board('Geomap');
    render(<Panel pPanelInfo={input.parsed.dashboard.panels[0]} pIsHeader={false} />);
    expect(screen.getByTestId('native-chart')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Auto refresh' })).toBeNull();
});

test('removes a native refresh control when the same public panel becomes unsupported', () => {
    const native = board('Line').parsed.dashboard.panels[0];
    const unsupported = board('Extension').parsed.dashboard.panels[0];
    const { rerender } = render(<Panel pPanelInfo={native} pIsHeader={false} />);
    expect(screen.getByRole('button', { name: 'Auto refresh' })).toBeVisible();
    rerender(<Panel pPanelInfo={unsupported} pIsHeader={false} />);
    expect(screen.getByText('This panel type is not supported.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Auto refresh' })).toBeNull();
    expect(unsupported.timeRange.refresh).toBe('3 seconds');
});
