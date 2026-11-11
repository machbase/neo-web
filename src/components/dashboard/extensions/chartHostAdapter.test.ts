import { attachChartOverlays } from './chartHostAdapter';
import type { RegisteredHostOverlay } from './hostTypes';

const overlay = (ownerId: string): RegisteredHostOverlay => ({ ownerId, id: 'position', kind: 'line', axis: 'x', value: 5 });

it('recalculates data coordinates and removes only host layers on dispose', () => {
    const root = document.createElement('div');
    const chartDom = document.createElement('div');
    const native = document.createElement('div');
    native.dataset.nativeGraphic = 'keep';
    chartDom.append(native);
    root.append(chartDom);
    document.body.append(root);
    let factor = 10;
    const handlers = new Map<string, () => void>();
    const chart = {
        getModel: () => ({ getComponent: () => ({ coordinateSystem: { getRect: () => ({ x: 0, y: 0, width: 100, height: 80 }) } }) }),
        convertToPixel: (_axis: unknown, value: number) => value * factor,
        getWidth: () => 100, getHeight: () => 80,
        on: (event: string, handler: () => void) => handlers.set(event, handler),
        off: jest.fn((event: string) => handlers.delete(event)),
        setOption: jest.fn(),
    };
    (globalThis as any).echarts = { getInstanceByDom: (dom: Element) => dom === chartDom ? chart : undefined };
    let overlays = [overlay('a'), overlay('b')];
    const dispose = attachChartOverlays(root, () => overlays);
    expect(root.querySelectorAll('svg line')).toHaveLength(2);
    expect(root.querySelector('svg line')?.getAttribute('x1')).toBe('50');
    factor = 15;
    handlers.get('datazoom')?.();
    expect(root.querySelector('svg line')?.getAttribute('x1')).toBe('75');
    overlays = [overlay('b')];
    handlers.get('rendered')?.();
    expect(root.querySelectorAll('svg line')).toHaveLength(1);
    expect((root.querySelector('svg line') as SVGElement).dataset.owner).toBe('b');
    expect(chart.setOption).not.toHaveBeenCalled();
    dispose();
    dispose();
    expect(root.querySelector('svg')).toBeNull();
    expect(root.querySelector('[data-native-graphic]')).toBe(native);
    expect(handlers.size).toBe(0);
    root.remove();
    delete (globalThis as any).echarts;
});

it('reattaches an overlay after a chart DOM is recreated', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const charts = new Map<Element, any>();
    const makeChart = () => ({ getModel: () => ({ getComponent: () => ({ coordinateSystem: { getRect: () => ({ x: 0, y: 0, width: 100, height: 80 }) } }) }),
        convertToPixel: () => 25, getWidth: () => 100, getHeight: () => 80, on: jest.fn(), off: jest.fn() });
    (globalThis as any).echarts = { getInstanceByDom: (dom: Element) => charts.get(dom) };
    const dispose = attachChartOverlays(root, () => [overlay('a')]);
    const first = document.createElement('div');
    charts.set(first, makeChart());
    root.append(first);
    await Promise.resolve();
    expect(first.querySelector('svg line')).not.toBeNull();
    const second = document.createElement('div');
    charts.set(second, makeChart());
    first.replaceWith(second);
    await Promise.resolve();
    expect(second.querySelector('svg line')?.getAttribute('x1')).toBe('25');
    dispose();
    root.remove();
    delete (globalThis as any).echarts;
});
