import { mergePanelMenuItems } from './headerMenu';
import type { HostHeaderPosition } from './hostTypes';

const builtIns = Object.freeze([
    Object.freeze({ id: 'setting' as const, item: 'Setting' }),
    Object.freeze({ id: 'duplicate' as const, item: 'Duplicate' }),
    Object.freeze({ id: 'delete' as const, item: 'Delete' }),
]);
const afterSetting = Object.freeze({ after: 'setting' as const });
it('anchors actions and orders only their group by priority without changing caller data', () => {
    const actions = Object.freeze([
        Object.freeze({ item: 'Fullscreen', position: { ...afterSetting, priority: 30 } }),
        Object.freeze({ item: 'Sync', position: { ...afterSetting, priority: 10 } }),
        Object.freeze({ item: 'Child', position: { ...afterSetting, priority: 20 } }),
    ]);
    expect(mergePanelMenuItems(builtIns, actions)).toEqual(['Setting', 'Sync', 'Child', 'Fullscreen', 'Duplicate', 'Delete']);
    expect(actions.map(action => action.position.priority)).toEqual([30, 10, 20]);
    expect(builtIns.map(item => item.item)).toEqual(['Setting', 'Duplicate', 'Delete']);
});
it('retains legacy leading registration order when no position or priority is supplied', () => {
    expect(mergePanelMenuItems(builtIns, [{ item: 'Sync' }, { item: 'Fullscreen' }])).toEqual(['Sync', 'Fullscreen', 'Setting', 'Duplicate', 'Delete']);
    expect(mergePanelMenuItems(builtIns, [])).toEqual(['Setting', 'Duplicate', 'Delete']);
});
it('keeps anchor meanings when another built-in or extension item is inserted', () => {
    const actions = [
        { item: 'Fullscreen', position: { ...afterSetting, priority: 30 } },
        { item: 'Sync', position: { ...afterSetting, priority: 10 } },
    ];
    const newAction = { item: 'Extra', position: { ...afterSetting, priority: 20 } };
    expect(mergePanelMenuItems([builtIns[0], { id: 'zoom', item: 'Zoom' }, ...builtIns.slice(1)], [...actions, newAction])).toEqual(['Setting', 'Sync', 'Extra', 'Fullscreen', 'Zoom', 'Duplicate', 'Delete']);
    expect(actions.map(action => action.position.priority)).toEqual([30, 10]);
});
it('supports before the first and after the last anchor without start/end positions', () => {
    expect(mergePanelMenuItems(builtIns, [
        { item: 'First', position: { before: 'setting', priority: 100 } },
        { item: 'Last', position: { after: 'delete', priority: -100 } },
    ])).toEqual(['First', 'Setting', 'Duplicate', 'Delete', 'Last']);
});
it('keeps equal-priority registration order and treats omitted priority as zero', () => {
    expect(mergePanelMenuItems(builtIns, [
        { item: 'A', position: { ...afterSetting, priority: 10 } },
        { item: 'B', position: { ...afterSetting, priority: 10 } },
        { item: 'Default', position: afterSetting },
        { item: 'Negative', position: { ...afterSetting, priority: -10 } },
    ])).toEqual(['Setting', 'Negative', 'Default', 'A', 'B', 'Duplicate', 'Delete']);
});
it('does not move actions across different anchor groups because of priority', () => {
    expect(mergePanelMenuItems(builtIns, [
        { item: 'Before duplicate', position: { before: 'duplicate', priority: -100 } },
        { item: 'After setting', position: { ...afterSetting, priority: 100 } },
        { item: 'Before delete', position: { before: 'delete', priority: 0 } },
    ])).toEqual(['Setting', 'After setting', 'Before duplicate', 'Duplicate', 'Before delete', 'Delete']);
});
it('appends missing-anchor actions by priority without adding hidden editing items', () => {
    const actions: { item: string; position: HostHeaderPosition }[] = [
        { item: 'Fullscreen', position: { ...afterSetting, priority: 30 } },
        { item: 'Child', position: { before: 'delete', priority: 20 } },
        { item: 'Sync', position: { ...afterSetting, priority: 10 } },
    ];
    expect(mergePanelMenuItems([], actions)).toEqual(['Sync', 'Child', 'Fullscreen']);
    expect(mergePanelMenuItems([false, builtIns[1], builtIns[2]], actions)).toEqual(['Duplicate', 'Child', 'Delete', 'Sync', 'Fullscreen']);
    expect(mergePanelMenuItems([], [])).toEqual([]);
});
