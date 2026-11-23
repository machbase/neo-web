import * as echartsLib from 'echarts';
import { hostPanelInfo } from './HostReact';
import { DashboardHostRuntime } from './hostRuntime';

const polarPanel = {
    id: 'polar-chart', type: 'Bar', title: 'Polar bars', x: 1, y: 2, w: 6, h: 5,
    chartOptions: { isPolar: true, isStack: false }, timeRange: { start: 1000, end: 2000, refresh: 'Off' },
};
function runtimeFor(panel: any) {
    const runtime = new DashboardHostRuntime({ id: 'board', timeRange: { start: 1000, end: 2000 }, distanceRange: { start: '', end: '' },
        panels: [{ id: 'source', type: 'Extension', capabilities: [] }, hostPanelInfo(panel)] });
    const session = runtime.createHost({ panelId: 'source', packageId: 'example/package', typeId: 'example', surface: 'dashboard',
        getSettings: () => ({}), applySettings: () => {} });
    return { runtime, session };
}

it('excludes overlay from a native Polar Bar while retaining its range, refresh and saved settings', () => {
    const original = JSON.stringify(polarPanel);
    expect(hostPanelInfo(polarPanel).capabilities).toEqual(['border', 'refresh', 'range:time']);
    expect(JSON.stringify(polarPanel)).toBe(original);
});

it('returns UNSUPPORTED without changing state for an actual ECharts polar target', () => {
    const { runtime, session } = runtimeFor(polarPanel);
    const dom = document.createElement('div');
    document.body.append(dom);
    const chart: any = echartsLib.init(dom, undefined, { renderer: 'svg', width: 600, height: 400 });
    try {
        // Match the native Polar mode: angleAxis/radiusAxis and a polar series, without a Cartesian grid.
        chart.setOption({ animation: false, polar: {},
            angleAxis: { min: 0, max: 10, axisLabel: { show: false } },
            radiusAxis: { type: 'value', min: 0, max: 10, axisLabel: { show: false } },
            series: [{ type: 'bar', coordinateSystem: 'polar', data: [[2, 1], [5, 8]] }],
        });
        expect(chart.getModel().getComponent('polar')).toBeDefined();
        expect(chart.getModel().getComponent('grid')).toBeUndefined();
        expect(session.host.panels.setRangeOverride('polar-chart', { kind: 'time', source: 'fixed', range: { start: 3000, end: 4000 } }).ok).toBe(true);
        const before = runtime.getPanelState('polar-chart');
        const result = session.host.panels.setOverlay('polar-chart', { id: 'position', kind: 'line', axis: 'x', value: 5 });
        expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
        expect(runtime.getPanelState('polar-chart')).toEqual(before);
    } finally {
        chart.dispose(); dom.remove(); session.dispose(); runtime.dispose();
    }
});

it.each(['Line', 'Bar', 'Scatter'])('keeps overlay, refresh and time range support for an ordinary %s chart', (type) => {
    const panel = { ...polarPanel, id: 'cartesian', type, chartOptions: { isPolar: false } };
    const original = JSON.stringify(panel);
    const { runtime, session } = runtimeFor(panel);
    try {
        expect(hostPanelInfo(panel).capabilities).toEqual(['border', 'refresh', 'range:time', 'overlay']);
        const result = session.host.panels.setOverlay(panel.id, { id: 'position', kind: 'line', axis: 'x', value: 5 });
        expect(result.ok).toBe(true);
        expect(runtime.getPanelState(panel.id).overlays).toHaveLength(1);
        if (!result.ok) throw new Error(result.error.message);
        expect(result.value.dispose().ok).toBe(true);
        expect(runtime.getPanelState(panel.id).overlays).toEqual([]);
        expect(JSON.stringify(panel)).toBe(original);
    } finally { session.dispose(); runtime.dispose(); }
});

it('retains numeric-axis range support for a Polar Bar', () => {
    const panel = { ...polarPanel, blockList: [{ timeBaseTime: true, timeType: 10, time: 'ODOMETER' }] };
    const capabilities = hostPanelInfo(panel).capabilities;
    expect(capabilities).toContain('refresh');
    expect(capabilities).toContain('range:distance');
    const { runtime, session } = runtimeFor(panel);
    try {
        expect(session.host.panels.setRangeOverride(panel.id, { kind: 'distance', source: 'fixed', range: { start: 20, end: 80 } }).ok).toBe(true);
        expect(runtime.getPanelState(panel.id).rangeOverrides.distance).toEqual({ start: 20, end: 80 });
    } finally { session.dispose(); runtime.dispose(); }
});
