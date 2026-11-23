import { CheckDataCompatibility } from './CheckDataCompatibility';
import { CheckDataCompatibility as readPublic } from '@/public-dashboard/utils/CheckDataCompatibility';
import { DefaultChartOption } from './eChartHelper';

globalThis.structuredClone ??= (value) => JSON.parse(JSON.stringify(value));

const unavailable = { id: 'unavailable', type: 'Unavailable custom panel', title: 'Keep settings', x: 0, y: 0, w: 6, h: 4,
    opaque: { serverId: 'keep-id', selected: ['chart'], optional: null, nested: [null, [], 'keep'] } };
const extension = { id: 'extension', type: 'Extension', x: 0, y: 0, w: 6, h: 4, extension: { packageId: 'example/panel', typeId: 'example', settingsVersion: 1, settings: { retained: 7 } } };
function document(panel: unknown) {
    return JSON.stringify({ dashboard: { variables: [], panels: [panel, { ...structuredClone(DefaultChartOption), id: 'chart', type: 'Line', blockList: [], transformBlockList: [] }] } });
}

it('preserves unsupported panel data without translating it or dropping its neighboring chart', () => {
    const source = document(unavailable);
    const parsed = CheckDataCompatibility(source, 'dsh');
    expect(parsed.dashboard.panels.find((panel: any) => panel.id === unavailable.id)).toEqual(unavailable);
    expect(parsed.dashboard.panels.some((panel: any) => panel.id === 'chart')).toBe(true);
    expect(JSON.parse(source).dashboard.panels[0]).toEqual(unavailable);
});

it.each([unavailable, extension])('keeps unsupported public panels without reading chart-only fields: $type', (panel) => {
    const parsed = readPublic(document(panel), 'dsh');
    expect(parsed.dashboard.panels[0]).toEqual(panel);
    expect(parsed.dashboard.panels.some((candidate: any) => candidate.id === 'chart')).toBe(true);
});

describe.each([
    ['dashboard', CheckDataCompatibility],
    ['public dashboard', readPublic],
] as const)('%s panel object validation', (_surface, read) => {
    it.each([null, [], 'unexpected panel', 17, false, true])('rejects a non-object panel while reading the file: %p', (panel) => {
        const source = document(panel);
        expect(() => read(source, 'dsh')).toThrow('Invalid dashboard panel at index 0: expected an object.');
        expect(JSON.parse(source).dashboard.panels[0]).toEqual(panel);
    });

    it('rejects a saved empty array slot before it becomes a renderable panel', () => {
        const panels = new Array(2);
        panels[1] = unavailable;
        const source = JSON.stringify({ dashboard: { variables: [], panels } });
        expect(JSON.parse(source).dashboard.panels).toEqual([null, unavailable]);
        expect(() => read(source, 'dsh')).toThrow('Invalid dashboard panel at index 0: expected an object.');
    });

    it.each([unavailable, extension])('preserves valid opaque panel objects and their neighboring chart: $type', (panel) => {
        const source = document(panel);
        const before = JSON.parse(source);
        const parsed = read(source, 'dsh');
        const chartOnly = read(JSON.stringify({ dashboard: { ...before.dashboard, panels: [before.dashboard.panels[1]] } }), 'dsh');
        expect(parsed.dashboard.panels[0]).toEqual(panel);
        expect(parsed.dashboard.panels[0]).toEqual(before.dashboard.panels[0]);
        expect(parsed.dashboard.panels[1]).toEqual(chartOnly.dashboard.panels[0]);
        expect(JSON.parse(source)).toEqual(before);
    });
});

const layoutKeys = ['x', 'y', 'w', 'h'] as const;
const missingLayouts = layoutKeys.map((key) => {
    const panel: Record<string, unknown> = { ...unavailable };
    delete panel[key];
    return [key, panel] as const;
});

describe.each([
    ['dashboard', CheckDataCompatibility],
    ['public dashboard', readPublic],
] as const)('%s unsupported panel layout validation', (_surface, read) => {
    it.each(missingLayouts)('rejects missing %s before rendering the grid', (_key, panel) => {
        expect(() => read(document(panel), 'dsh')).toThrow(/Invalid dashboard panel.*layout/);
    });

    it.each(layoutKeys)('rejects a string %s rather than coercing stored data', (key) => {
        const panel = { ...unavailable, [key]: String(unavailable[key]) };
        const source = document(panel);
        expect(() => read(source, 'dsh')).toThrow(/Invalid dashboard panel.*layout/);
        expect(JSON.parse(source).dashboard.panels[0]).toEqual(panel);
    });

    it.each(layoutKeys)('rejects a non-finite %s parsed from a numeric JSON literal', (key) => {
        const source = document({ ...unavailable, [key]: 'OVERFLOW_NUMBER' }).replace('"OVERFLOW_NUMBER"', '1e999');
        expect(JSON.parse(source).dashboard.panels[0][key]).toBe(Infinity);
        expect(() => read(source, 'dsh')).toThrow(/Invalid dashboard panel.*layout/);
    });

    it.each([['w', 0], ['h', 0], ['w', -1], ['h', -1]] as const)('rejects non-positive %s=%s', (key, value) => {
        expect(() => read(document({ ...unavailable, [key]: value }), 'dsh')).toThrow(/Invalid dashboard panel.*layout/);
    });

    it.each([
        { x: 0, y: 0, w: 1, h: 1 },
        { x: 0.5, y: 1.25, w: 6.5, h: 4.5 },
        { x: 0, y: 0, w: 36, h: 4 },
        { x: 35, y: 0, w: 6, h: 4 },
        { x: 0, y: 0, w: 40, h: 4 },
        { x: -1, y: -2, w: 6, h: 4 },
    ])('preserves finite layout supported by grid placement: %p', (layout) => {
        for (const original of [unavailable, extension]) {
            const panel = { ...original, ...layout };
            const source = document(panel);
            const before = JSON.parse(source);
            const parsed = read(source, 'dsh');
            const chartOnly = read(JSON.stringify({ dashboard: { ...before.dashboard, panels: [before.dashboard.panels[1]] } }), 'dsh');
            expect(parsed.dashboard.panels[0]).toEqual(panel);
            expect(parsed.dashboard.panels[1]).toEqual(chartOnly.dashboard.panels[0]);
            expect(JSON.parse(source)).toEqual(before);
        }
    });

    it('accepts an empty panel list', () => {
        const source = JSON.stringify({ dashboard: { variables: [], panels: [] } });
        expect(read(source, 'dsh').dashboard.panels).toEqual([]);
    });
});

it.each(['Line', 'Tql'])('keeps the legacy built-in %s layout repair path', (type) => {
    const panel: Record<string, unknown> = { ...structuredClone(DefaultChartOption), id: 'legacy', type, blockList: [], transformBlockList: [] };
    for (const key of layoutKeys) delete panel[key];
    const parsed = CheckDataCompatibility(JSON.stringify({ dashboard: { variables: [], panels: [panel] } }), 'dsh');
    expect(parsed.dashboard.panels[0]).toMatchObject({ id: 'legacy', type: type === 'Tql' ? 'Tql chart' : type, x: 0, y: 0, w: 7, h: 7 });
});
