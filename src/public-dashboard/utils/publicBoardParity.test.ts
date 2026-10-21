import { CheckDataCompatibility as CheckEditor, getPanelLoadError as getEditorPanelLoadError } from '@/utils/CheckDataCompatibility';
import { CheckDataCompatibility as CheckPublic, getPanelLoadError as getPublicPanelLoadError } from './CheckDataCompatibility';
import { setUnitTime } from './dashboardUtil';
import { getAggregatorSqlFunction, getDiffSqlFunction } from './aggregatorConstants';

// #1558 (F-16): a shared link (/board) reads the same .dsh as the editor. These are the three
// differences measured on 2026-10-20 before the public copies were replaced by the editor's code.

beforeAll(() => {
    if (!(globalThis as any).structuredClone) (globalThis as any).structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v));
});

const linePanel = (overrides: Record<string, any> = {}) => ({
    id: 'p1', title: 'legacy', type: 'Line', x: 0, y: 0, w: 12, h: 6,
    timeRange: { start: '', end: '', refresh: 'Off' },
    blockList: [{ id: 'b1', table: 'TAG', type: 'tag', name: 'NAME', time: 'TIME', value: 'VALUE', tag: 'a', aggregator: 'avg', diff: 'none', useCustom: false, filter: [], values: [{ id: 'v1', value: 'VALUE', aggregator: 'avg', alias: '' }], tableInfo: [['NAME', 5], ['TIME', 6], ['VALUE', 20]], isVisible: true, color: '#000', alias: '', math: '' }],
    commonOptions: { title: 'legacy' }, chartOptions: {}, yAxisOptions: [{ type: 'value', label: {} }],
    ...overrides,
});
const board = (panel: any) => JSON.stringify({ type: 'dsh', dashboard: { timeRange: { start: 'now-1h', end: 'now', refresh: 'Off' }, variables: [], panels: [panel] } });

test('a panel saved without xAxisOptions loads on the shared link as in the editor', () => {
    const panel = linePanel();
    const editor = CheckEditor(board(panel), 'dsh').dashboard.panels[0];
    const pub = CheckPublic(board(panel), 'dsh').dashboard.panels[0];
    expect(getEditorPanelLoadError(editor)).toBeUndefined();
    expect(getPublicPanelLoadError(pub)).toBeUndefined();
    expect(pub.xAxisOptions).toEqual(editor.xAxisOptions);
});

test.each([null, undefined, ''])('setUnitTime(%p) on the shared link is now, not 0', (value) => {
    const before = Date.now();
    expect(setUnitTime(value)).toBeGreaterThanOrEqual(before);
});

test.each([
    ['DIFF (ABS)', 'ABSDIFF'],
    ['STDDEV (POP)', 'STDDEV_POP'],
])('aggregator %s keeps its SQL function on the shared link', (name, expected) => {
    expect((name.startsWith('DIFF') ? getDiffSqlFunction(name) : getAggregatorSqlFunction(name)).toUpperCase()).toBe(expected);
});
