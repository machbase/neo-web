import { DashboardHostRuntime } from './hostRuntime';
import { createElement } from 'react';
import { mergePanelMenuItems } from './headerMenu';
import type { HostBoardInput, HostHeaderAction, HostOwner, HostResult } from './hostTypes';

const board = (): HostBoardInput => ({ id: 'board-1', active: true, timeRange: { start: 100, end: 200 }, distanceRange: { start: 1, end: 9 }, panels: ['a', 'b', 'chart', 'untouched'].map((id) => ({ id, type: id === 'chart' ? 'Line' : 'Extension', capabilities: id === 'chart' ? ['range:time', 'range:distance', 'overlay', 'refresh'] : ['refresh'] })) });
const value = <T,>(result: HostResult<T>): T => { if (!result.ok) throw new Error(result.error.message); return result.value; };
const owner = (panelId = 'a', extra: Partial<HostOwner> = {}): HostOwner => ({ panelId, packageId: 'example/package', typeId: 'example', surface: 'dashboard', getSettings: () => ({}), applySettings: () => {}, ...extra });

it.each([
    { name: 'entirely empty', make: () => new Array<HostHeaderAction>(1) },
    { name: 'partly filled', make: () => { const actions = new Array<HostHeaderAction>(2); actions[0] = { id: 'valid', label: 'Valid', onSelect: jest.fn() }; return actions; } },
])('rejects $name sparse header arrays without changing existing registrations or notifying observers', ({ make }) => {
    const input = board();
    const saved = JSON.stringify(input);
    const runtime = new DashboardHostRuntime(input);
    const first = runtime.createHost(owner('a'));
    const second = runtime.createHost(owner('b'));
    const existing = jest.fn();
    value(first.host.header.registerActions([{ id: 'existing', label: 'Existing', onSelect: existing }]));
    value(second.host.header.registerActions([{ id: 'other', label: 'Other panel', onSelect: jest.fn() }]));
    const before = runtime.getSnapshot();
    const changed = jest.fn();
    const unsubscribe = runtime.subscribe(changed);
    const actions = make();
    const indices = Object.keys(actions);
    expect(first.host.header.registerActions(actions)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getSnapshot()).toBe(before);
    expect(changed).not.toHaveBeenCalled();
    expect(runtime.getPanelState('a').actions.map((action) => action.id)).toEqual(['existing']);
    expect(runtime.getPanelState('b').actions.map((action) => action.id)).toEqual(['other']);
    runtime.getPanelState('a').actions[0].onSelect();
    expect(existing).toHaveBeenCalledTimes(1);
    expect(Object.keys(actions)).toEqual(indices);
    expect(JSON.stringify(input)).toBe(saved);
    unsubscribe(); runtime.dispose();
});

it('keeps dense header actions with React icons, callbacks and boolean states valid', () => {
    const runtime = new DashboardHostRuntime(board());
    const host = runtime.createHost(owner('a')).host;
    const icon = createElement('span', { 'aria-hidden': true }, 'play');
    const select = jest.fn();
    const handle = value(host.header.registerActions([{ id: 'play', label: 'Play', icon, checked: true, disabled: false, onSelect: select }]));
    const [action] = runtime.getPanelState('a').actions;
    expect(action.icon).toBe(icon);
    expect(action).toMatchObject({ id: 'play', label: 'Play', checked: true, disabled: false });
    action.onSelect();
    expect(select).toHaveBeenCalledTimes(1);
    expect(host.header.registerActions([{ id: 'duplicate', label: 'One', onSelect: select }, { id: 'duplicate', label: 'Two', onSelect: select }]).ok).toBe(false);
    value(handle.dispose());
    expect(runtime.getPanelState('a').actions).toEqual([]);
    runtime.dispose();
});

it.each([{}, { priority: undefined }, { priority: -0 }])('stores the default zero priority for %p without changing caller data', (optional) => {
    const input = board(), saved = JSON.stringify(input), runtime = new DashboardHostRuntime(input);
    const host = runtime.createHost(owner()).host, onSelect = jest.fn();
    const position = Object.freeze({ after: 'setting' as const, ...optional });
    const before = Object.getOwnPropertyDescriptors(position);
    const action = Object.freeze({ id: 'play', label: 'Play', position, onSelect });
    const handle = value(host.header.registerActions([action]));
    const registered = runtime.getPanelState('a').actions[0];
    expect(registered.position).toEqual({ after: 'setting', priority: 0 });
    expect(Object.is(registered.position?.priority, -0)).toBe(false);
    expect(Object.getOwnPropertyDescriptors(position)).toEqual(before);
    registered.onSelect(); expect(onSelect).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(input)).toBe(saved);
    value(handle.dispose()); expect(runtime.getPanelState('a').actions).toEqual([]);
    runtime.dispose();
});

it('keeps duplicate default priorities in registration order across owners and handles', () => {
    const runtime = new DashboardHostRuntime(board());
    const first = runtime.createHost(owner()).host, second = runtime.createHost(owner()).host;
    const firstHandle = value(first.header.registerActions([{ id: 'one', label: 'One', position: { after: 'setting' }, onSelect() {} }]));
    value(second.header.registerActions([{ id: 'two', label: 'Two', position: { after: 'setting', priority: undefined }, onSelect() {} }]));
    value(first.header.registerActions([{ id: 'three', label: 'Three', position: { after: 'setting', priority: 0 }, onSelect() {} }]));
    const menu = () => mergePanelMenuItems([{ id: 'setting', item: 'Setting' }, { id: 'delete', item: 'Delete' }], runtime.getPanelState('a').actions.map(action => ({ item: action.id, position: action.position })));
    expect(menu()).toEqual(['Setting', 'one', 'two', 'three', 'Delete']);
    value(firstHandle.dispose());
    expect(menu()).toEqual(['Setting', 'two', 'three', 'Delete']);
    runtime.dispose();
});

it('rejects accessor metadata without invoking getters or replacing registered actions', () => {
    const runtime = new DashboardHostRuntime(board()), host = runtime.createHost(owner()).host;
    value(host.header.registerActions([{ id: 'keep', label: 'Keep', onSelect() {} }]));
    const getPriority = jest.fn(() => undefined), position = Object.defineProperty({ after: 'setting' }, 'priority', { enumerable: true, get: getPriority });
    const before = runtime.getSnapshot();
    expect(host.header.registerActions([{ id: 'bad', label: 'Bad', position, onSelect() {} }] as HostHeaderAction[])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(getPriority).not.toHaveBeenCalled(); expect(runtime.getSnapshot()).toBe(before);
    runtime.dispose();
});

it.each([1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null])('rejects invalid header priority %p without replacing actions or saved data', (priority) => {
    const input = board(), saved = JSON.stringify(input), runtime = new DashboardHostRuntime(input);
    const host = runtime.createHost(owner()).host;
    value(host.header.registerActions([{ id: 'existing', label: 'Existing', onSelect: jest.fn() }]));
    const before = runtime.getSnapshot(), changed = jest.fn(), unsubscribe = runtime.subscribe(changed);
    expect(host.header.registerActions([{ id: 'invalid', label: 'Invalid', position: { after: 'setting', priority }, onSelect: jest.fn() } as unknown as HostHeaderAction])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getSnapshot()).toBe(before);
    expect(changed).not.toHaveBeenCalled();
    expect(runtime.getPanelState('a').actions.map(action => action.id)).toEqual(['existing']);
    expect(JSON.stringify(input)).toBe(saved);
    unsubscribe(); runtime.dispose();
});

it.each([
    null, 'start', 'end', {}, [], { before: 'setting', after: 'delete' },
    { before: 'missing' }, { after: '' }, { before: 'Setting' },
    { after: 'setting', extra: true }, { at: 'start' },
])('rejects invalid header position %p atomically', (position) => {
    const runtime = new DashboardHostRuntime(board()), host = runtime.createHost(owner()).host;
    value(host.header.registerActions([{ id: 'keep', label: 'Keep', onSelect: jest.fn() }]));
    const before = runtime.getSnapshot();
    expect(host.header.registerActions([{ id: 'bad', label: 'Bad', position, onSelect: jest.fn() } as unknown as HostHeaderAction])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getSnapshot()).toBe(before);
    expect(runtime.getPanelState('a').actions.map(action => action.id)).toEqual(['keep']);
    runtime.dispose();
});
it('rejects the replaced absolute index field instead of silently ignoring it', () => {
    const runtime = new DashboardHostRuntime(board()), host = runtime.createHost(owner()).host;
    expect(host.header.registerActions([{ id: 'old', label: 'Old', index: 0, onSelect: jest.fn() } as unknown as HostHeaderAction])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getPanelState('a').actions).toEqual([]); runtime.dispose();
});
it('rejects a top-level priority rather than silently using the old structure', () => {
    const runtime = new DashboardHostRuntime(board()), host = runtime.createHost(owner()).host;
    expect(host.header.registerActions([{ id: 'old', label: 'Old', position: { after: 'setting' }, priority: 10, onSelect: jest.fn() } as unknown as HostHeaderAction])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getPanelState('a').actions).toEqual([]); runtime.dispose();
});
it('retains signed priorities, positions, icons and callbacks without changing caller data', () => {
    const runtime = new DashboardHostRuntime(board()), host = runtime.createHost(owner()).host;
    const icon = createElement('span', {}, 'Icon'), onSelect = jest.fn();
    const position = { after: 'setting', priority: Number.MAX_SAFE_INTEGER };
    const actions = Object.freeze([
        Object.freeze({ id: 'last', label: 'Last', icon, position, onSelect }),
        Object.freeze({ id: 'first', label: 'First', icon, position: Object.freeze({ before: 'delete', priority: -10 }), onSelect }),
        Object.freeze({ id: 'legacy', label: 'Legacy', onSelect }),
    ]);
    const handle = value(host.header.registerActions(actions as unknown as HostHeaderAction[]));
    position.after = 'delete'; position.priority = -20;
    const registered = runtime.getPanelState('a').actions;
    expect(registered.map(action => (action as HostHeaderAction & { position?: { priority?: number } }).position?.priority)).toEqual([Number.MAX_SAFE_INTEGER, -10, undefined]);
    expect((registered[0] as HostHeaderAction & { position?: unknown }).position).toEqual({ after: 'setting', priority: Number.MAX_SAFE_INTEGER });
    expect(registered[0].icon).toBe(icon);
    registered[0].onSelect(); expect(onSelect).toHaveBeenCalledTimes(1);
    value(handle.dispose()); expect(runtime.getPanelState('a').actions).toEqual([]);
    expect(actions[0].id).toBe('last'); runtime.dispose();
});

it('patches a latest copy, preserves unrelated fields and uses top-level replacement and explicit removal', () => {
    const runtime = new DashboardHostRuntime(board());
    let settings: Record<string, unknown> = { source: { camera: 'old', keep: true }, unknown: [1], remove: 'x' };
    const original = settings;
    const { host } = runtime.createHost(owner('a', { getSettings: () => settings, applySettings: (next) => { settings = next; } }));
    expect(value(host.settings.patch({ source: { camera: 'new' } }, { removeKeys: ['remove'] }))).toEqual({ source: { camera: 'new' }, unknown: [1] });
    expect(original).toEqual({ source: { camera: 'old', keep: true }, unknown: [1], remove: 'x' });
});
it.each(['dashboard', 'editor', 'options'] as const)('rejects sparse removal keys atomically on %s without deleting saved settings', (surface) => {
    const runtime = new DashboardHostRuntime(board());
    const original = { undefined: 'saved unknown field', keep: { value: 'original' }, remove: 'retain on failure' };
    let settings = original;
    const apply = jest.fn((next) => { settings = next; });
    const { host } = runtime.createHost(owner('a', { surface, getSettings: () => settings, applySettings: apply }));
    const revision = runtime.getSnapshot();
    const removeKeys = new Array<string>(1);
    expect(host.settings.patch({ keep: 'changed' }, { removeKeys })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(apply).not.toHaveBeenCalled();
    expect(settings).toBe(original);
    expect(settings).toEqual({ undefined: 'saved unknown field', keep: { value: 'original' }, remove: 'retain on failure' });
    expect(runtime.getSnapshot()).toBe(revision);
    expect(removeKeys.length).toBe(1);
    expect(Object.keys(removeKeys)).toEqual([]);
    runtime.dispose();
});
it('keeps empty removals valid and deletes only explicitly named keys including the string undefined', () => {
    const runtime = new DashboardHostRuntime(board());
    const original = { undefined: 'legitimate name', remove: 'requested', keep: { value: 'original' } };
    let settings: Record<string, unknown> = original;
    const { host } = runtime.createHost(owner('a', { getSettings: () => settings, applySettings: (next) => { settings = next; } }));
    expect(value(host.settings.patch({}, { removeKeys: [] }))).toEqual(original);
    expect(value(host.settings.patch({}, { removeKeys: ['remove', 'remove'] }))).toEqual({ undefined: 'legitimate name', keep: { value: 'original' } });
    expect(value(host.settings.patch({}, { removeKeys: ['undefined'] }))).toEqual({ keep: { value: 'original' } });
    expect(original).toEqual({ undefined: 'legitimate name', remove: 'requested', keep: { value: 'original' } });
    runtime.dispose();
});
it('rejects invalid dashboard settings atomically using existing JSON and extension validators', () => {
    const runtime = new DashboardHostRuntime(board());
    const settings = { camera: 'old', untouched: true };
    const apply = jest.fn();
    const { host } = runtime.createHost(owner('a', { getSettings: () => settings, applySettings: apply, validateSettings: { camera: (camera) => camera === 'old' ? undefined : 'bad camera' } }));
    expect(host.settings.patch({ camera: 'bad' }).ok).toBe(false);
    expect(host.settings.patch({ date: new Date() }).ok).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(settings).toEqual({ camera: 'old', untouched: true });
});
it('allows incomplete editor drafts but preview cannot modify settings, targets, or messages', async () => {
    const runtime = new DashboardHostRuntime(board());
    const editor = runtime.createHost(owner('a', { surface: 'editor', validateSettings: { camera: () => 'required' } })).host;
    expect(editor.settings.patch({ camera: '' }).ok).toBe(true);
    const preview = runtime.createHost(owner('a', { surface: 'preview' })).host;
    expect(preview.settings.patch({ camera: 'bad' }).ok).toBe(false);
    expect(preview.panels.setOverlay('chart', { id: 'x', kind: 'line', axis: 'x', value: 100 }).ok).toBe(false);
    expect((await preview.messages.send({ targetPanelIds: ['b'], topic: 'example/play', payload: {} })).ok).toBe(false);
    expect(runtime.getPanelState('chart').overlays).toEqual([]);
});
it('isolates receiver copies/errors and reports delivery without waiting for async completion', async () => {
    const runtime = new DashboardHostRuntime(board());
    const a = runtime.createHost(owner('a')).host;
    const b = runtime.createHost(owner('b')).host;
    const received: any[] = [];
    value(b.messages.subscribe('example/play', (message) => { (message.payload as any).time = 999; throw new Error('receiver'); }));
    value(b.messages.subscribe('example/play', (message) => { received.push(message); return new Promise(() => {}); }));
    const input = { targetPanelIds: ['b', 'chart', 'missing'], topic: 'example/play', payload: { time: 123 } };
    expect(value(await a.messages.send(input))).toEqual([{ panelId: 'b', status: 'delivered' }, { panelId: 'chart', status: 'not-listening' }, { panelId: 'missing', status: 'not-found' }]);
    expect(received[0].payload).toEqual({ time: 123 });
    expect(received[0].sender).toEqual({ panelId: 'a', packageId: 'example/package', typeId: 'example' });
    expect(input.payload).toEqual({ time: 123 });
});
it('preserves same-sender order and independent idempotent unsubscribe', async () => {
    const runtime = new DashboardHostRuntime(board());
    const a = runtime.createHost(owner('a')).host;
    const b = runtime.createHost(owner('b')).host;
    const received: unknown[] = [];
    const handle = value(b.messages.subscribe('example/play', (message) => { received.push(message.payload); }));
    await Promise.all([1, 2, 3].map((payload) => a.messages.send({ targetPanelIds: ['b'], topic: 'example/play', payload })));
    expect(received).toEqual([1, 2, 3]);
    expect(handle.dispose().ok).toBe(true);
    expect(handle.dispose().ok).toBe(true);
    expect(value(await a.messages.send({ targetPanelIds: ['b'], topic: 'example/play', payload: 4 }))[0].status).toBe('not-listening');
});
it('restores previous range owners and keeps automatic board updates out of explicit priority', () => {
    const runtime = new DashboardHostRuntime(board());
    const first = runtime.createHost(owner('a'));
    const second = runtime.createHost(owner('b'));
    const a = value(first.host.panels.setRangeOverride('chart', { kind: 'time', source: 'board', followBoardRefresh: false }));
    const b = value(second.host.panels.setRangeOverride('chart', { kind: 'time', source: 'fixed', range: { start: 300, end: 400 } }));
    const revision = runtime.getPanelState('chart').rangeRevision;
    runtime.updateBoard({ ...board(), timeRange: { start: 500, end: 600 } });
    expect(runtime.getPanelState('chart').rangeRevision).toBe(revision);
    expect(runtime.getPanelState('chart').rangeOverrides.time).toEqual({ start: 300, end: 400 });
    value(second.host.panels.clearRangeOverride(b));
    expect(runtime.getPanelState('chart').rangeOverrides.time).toEqual({ start: 500, end: 600 });
    value(first.host.panels.clearRangeOverride(a));
    expect(runtime.getPanelState('chart').rangeOverrides.time).toBeUndefined();
});
it('isolates identical overlay IDs across owners and rejects foreign handles and stale hosts', () => {
    const runtime = new DashboardHostRuntime(board());
    const first = runtime.createHost(owner('a'));
    const second = runtime.createHost(owner('b'));
    const overlay = { id: 'position', kind: 'line' as const, axis: 'x' as const, value: 123 };
    const a = value(first.host.panels.setOverlay('chart', overlay));
    value(second.host.panels.setOverlay('chart', overlay));
    expect(runtime.getPanelState('chart').overlays).toHaveLength(2);
    expect(second.host.panels.clearOverlay(a).ok).toBe(false);
    first.dispose();
    expect(runtime.getPanelState('chart').overlays).toHaveLength(1);
    expect(first.host.panels.refresh('chart').ok).toBe(false);
    expect(a.dispose().ok).toBe(true);
});
it('disposes removed panel owners without changing another panel owner or an unrelated panel', () => {
    const runtime = new DashboardHostRuntime(board());
    const a = runtime.createHost(owner('a'));
    const b = runtime.createHost(owner('b'));
    value(a.host.panels.setOverlay('chart', { id: 'a', kind: 'line', axis: 'x', value: 100 }));
    value(b.host.panels.setOverlay('chart', { id: 'b', kind: 'line', axis: 'x', value: 200 }));
    runtime.updateBoard({ ...board(), panels: board().panels.filter((panel) => panel.id !== 'a') });
    expect(a.host.settings.patch({ test: true }).ok).toBe(false);
    expect(runtime.getPanelState('chart').overlays.map((overlay) => overlay.id)).toEqual(['b']);
    expect(runtime.getPanelState('untouched').overlays).toEqual([]);
});
it.each(['dashboard', 'preview', 'editor', 'options'] as const)('exposes contract information without an API availability list on %s', (surface) => {
    const runtime = new DashboardHostRuntime(board());
    const context = runtime.getContext('a', surface);
    expect(context.capabilities).toEqual({ contractVersion: 1 });
    expect(context.surface).toBe(surface);
    runtime.dispose();
});

it('rejects unsupported targets and preserves merged refresh reasons within one notification turn', () => {
    const runtime = new DashboardHostRuntime(board());
    const host = runtime.createHost(owner()).host;
    expect(host.panels.setRangeOverride('untouched', { kind: 'time', source: 'board' }).ok).toBe(false);
    expect(runtime.getPanelState('untouched').rangeRevision).toBe(0);
    runtime.updateBoard({ ...board(), refresh: { revision: 1, reasons: ['manual'] } });
    value(host.panels.refresh('chart'));
    expect(runtime.getPanelState('chart').refresh.reasons).toEqual(expect.arrayContaining(['manual', 'panel-request']));
    expect(runtime.getPanelState('untouched').rangeOverrides).toEqual({});
});
it('invokes gesture adapters synchronously and normalizes errors and selection cancellation', async () => {
    const runtime = new DashboardHostRuntime(board());
    const open = jest.fn();
    const host = runtime.createHost(owner('a', { adapters: { open, selectFile: async () => null, enterFullscreen: () => { throw new Error('blocked'); } } })).host;
    const pending = host.navigation.open({ path: 'folder/board.dsh', kind: 'dashboard', target: 'window' });
    expect(open).toHaveBeenCalledTimes(1);
    expect((await pending).ok).toBe(true);
    expect(value(await host.files.select())).toBeNull();
    expect((await host.viewport.enterFullscreen()).ok).toBe(false);
});

it('keeps separate executions of the same saved board isolated', async () => {
    const runtime = new DashboardHostRuntime(board());
    const other = new DashboardHostRuntime(board());
    const first = runtime.createHost(owner('a')).host;
    const received = jest.fn();
    value(other.createHost(owner('b')).host.messages.subscribe('example/play', received));
    expect(value(await first.messages.send({ targetPanelIds: ['b'], topic: 'example/play', payload: null }))[0].status).toBe('not-listening');
    expect(received).not.toHaveBeenCalled();
    value(first.panels.setOverlay('chart', { id: 'same', kind: 'line', axis: 'x', value: 100 }));
    expect(other.getPanelState('chart').overlays).toEqual([]);
});

it('captures message input at the call and rejects queued sends from disposed instances', async () => {
    const runtime = new DashboardHostRuntime(board());
    const sender = runtime.createHost(owner('a'));
    const received = jest.fn();
    value(runtime.createHost(owner('b')).host.messages.subscribe('example/play', received));
    const input = { targetPanelIds: ['b'], topic: 'example/play', payload: { time: 1 } };
    const sending = sender.host.messages.send(input);
    input.payload.time = 2;
    await sending;
    expect(received.mock.calls[0][0].payload).toEqual({ time: 1 });
    const stale = sender.host.messages.send(input);
    sender.dispose();
    expect((await stale).ok).toBe(false);
    expect(received).toHaveBeenCalledTimes(1);
});

it('updates an existing overlay/range registration and orders the last explicit update first', () => {
    const runtime = new DashboardHostRuntime(board());
    const a = runtime.createHost(owner('a')).host;
    const b = runtime.createHost(owner('b')).host;
    const first = value(a.panels.setRangeOverride('chart', { kind: 'time', source: 'fixed', range: { start: 1, end: 2 } }));
    value(b.panels.setRangeOverride('chart', { kind: 'time', source: 'fixed', range: { start: 3, end: 4 } }));
    const updated = value(a.panels.setRangeOverride('chart', { kind: 'time', source: 'fixed', range: { start: 5, end: 6 } }));
    expect(first).toBe(updated);
    expect(runtime.getPanelState('chart').rangeOverrides.time).toEqual({ start: 5, end: 6 });
    value(first.dispose());
    expect(runtime.getPanelState('chart').rangeOverrides.time).toEqual({ start: 3, end: 4 });
    const overlay = value(a.panels.setOverlay('chart', { id: 'position', kind: 'line', axis: 'x', value: 1 }));
    expect(value(a.panels.setOverlay('chart', { id: 'position', kind: 'line', axis: 'x', value: 2 }))).toBe(overlay);
    expect(runtime.getPanelState('chart').overlays.map((item) => item.value)).toEqual([2]);
});

it('separately disposes header actions and cannot invoke callbacks captured before disposal', () => {
    const runtime = new DashboardHostRuntime(board());
    const session = runtime.createHost(owner('a'));
    const first = jest.fn();
    const second = jest.fn();
    const handle = value(session.host.header.registerActions([{ id: 'one', label: 'One', onSelect: first }]));
    value(session.host.header.registerActions([{ id: 'two', label: 'Two', onSelect: second }]));
    const captured = runtime.getPanelState('a').actions[0];
    value(handle.dispose());
    captured.onSelect();
    expect(first).not.toHaveBeenCalled();
    runtime.getPanelState('a').actions[0].onSelect();
    expect(second).toHaveBeenCalledTimes(1);
    session.dispose();
    expect(runtime.getPanelState('a').actions).toEqual([]);
});

it('provides detached context values without a dynamic API list', () => {
    const runtime = new DashboardHostRuntime(board());
    const context = runtime.getContext('a', 'dashboard');
    context.panels[0].id = 'tampered';
    context.ranges.time!.start = 999;
    expect(runtime.getContext('a').panels[0].id).toBe('a');
    expect(runtime.getContext('a').ranges.time!.start).toBe(100);
});

it('aborts pending navigation and file adapters when their owner closes', async () => {
    const runtime = new DashboardHostRuntime(board());
    let navigationSignal: AbortSignal | undefined;
    let selectionSignal: AbortSignal | undefined;
    let finishNavigation!: () => void;
    let finishSelection!: (path: string | null) => void;
    const session = runtime.createHost(owner('a', { adapters: {
        open: (_request: unknown, signal?: AbortSignal) => { navigationSignal = signal; return new Promise<void>((resolve) => { finishNavigation = resolve; }); },
        selectFile: (_request: unknown, signal?: AbortSignal) => { selectionSignal = signal; return new Promise<string | null>((resolve) => { finishSelection = resolve; }); },
    } }));
    const navigation = session.host.navigation.open({ path: 'example.dsh', kind: 'dashboard' });
    const selection = session.host.files.select();
    session.dispose();
    expect(navigationSignal?.aborted).toBe(true);
    expect(selectionSignal?.aborted).toBe(true);
    finishNavigation(); finishSelection(null);
    expect((await navigation).ok).toBe(false);
    expect((await selection).ok).toBe(false);
});

it.each(['preview', 'editor', 'options'] as const)('does not accept header actions on the %s surface', (surface) => {
    const runtime = new DashboardHostRuntime(board());
    const session = runtime.createHost(owner('a', { surface }));
    const result = session.host.header.registerActions([{ id: 'action', label: 'Action', onSelect: jest.fn() }]);
    expect(result).toEqual({ ok: false, error: { code: 'UNSUPPORTED', message: expect.any(String) } });
    expect(runtime.getPanelState('a').actions).toEqual([]);
});

it.each(['editor', 'options'] as const)('rejects unavailable target/message operations on %s while preserving draft settings changes', async (surface) => {
    const runtime = new DashboardHostRuntime(board());
    const applied = jest.fn();
    const host = runtime.createHost(owner('a', { surface, applySettings: applied })).host;
    const dashboard = runtime.createHost(owner('b')).host;
    const existing = value(dashboard.panels.setOverlay('chart', { id: 'existing', kind: 'line', axis: 'x', value: 100 }));
    const before = runtime.getPanelState('chart');
    const results = [
        host.panels.setRangeOverride('chart', { kind: 'time', source: 'board' }),
        host.panels.setOverlay('chart', { id: 'invisible', kind: 'line', axis: 'x', value: 200 }),
        host.panels.clearOverlay(existing), host.panels.clearRangeOverride(existing), host.panels.refresh('chart'),
        host.messages.subscribe('example/play', jest.fn()),
        await host.messages.send({ targetPanelIds: ['b'], topic: 'example/play', payload: null }),
    ];
    for (const result of results) expect(result).toEqual({ ok: false, error: { code: 'UNSUPPORTED', message: expect.any(String) } });
    expect(runtime.getPanelState('chart')).toEqual(before);
    expect(host.settings.patch({ incomplete: '' }).ok).toBe(true);
    expect(applied).toHaveBeenCalledWith({ incomplete: '' });
});

function extensionRangeBoard(): HostBoardInput {
    const input = board();
    input.panels.find((panel) => panel.id === 'b')!.capabilities.push('range:time', 'range:distance');
    return input;
}

it.each(['time', 'distance'] as const)('delivers true and false %s policies to an extension target independently of refresh events', (kind) => {
    const input = extensionRangeBoard();
    const runtime = new DashboardHostRuntime(input);
    const stored = { source: { serverId: 'server-1', camera: 'camera-1' }, unknown: ['keep'] };
    const original = JSON.stringify(stored);
    const apply = jest.fn();
    runtime.createHost(owner('b', { getSettings: () => stored, applySettings: apply }));
    const sender = runtime.createHost(owner('a')).host;
    const range = kind === 'time' ? { start: 10, end: 20 } : { start: 'first', end: 'last' };
    const initialRefresh = runtime.getContext('b').refresh;
    value(sender.panels.setRangeOverride('b', { kind, source: 'fixed', range, followBoardRefresh: true, followPanelRefresh: true }));
    const follow = runtime.getContext('b');
    expect(follow.ranges.policies[kind]).toEqual({ source: 'fixed', followBoardRefresh: true, followPanelRefresh: true });
    expect(follow.refresh).toEqual(initialRefresh);
    value(sender.panels.setRangeOverride('b', { kind, source: 'fixed', range, followBoardRefresh: false, followPanelRefresh: false }));
    const ignore = runtime.getContext('b');
    expect(ignore.ranges.policies[kind]).toEqual({ source: 'fixed', followBoardRefresh: false, followPanelRefresh: false });
    expect(ignore.refresh).toEqual(initialRefresh);
    runtime.updateBoard({ ...input, refresh: { revision: 1, reasons: ['manual'] } });
    const manual = runtime.getContext('b');
    expect(manual.refresh).toEqual({ revision: 1, reasons: ['manual'] });
    expect(manual.ranges.policies[kind]).toEqual(ignore.ranges.policies[kind]);
    value(sender.panels.refresh('b'));
    expect(runtime.getContext('b').refresh.reasons).toContain('panel-request');
    // The extension receives both the policy and the event, then decides whether to query.
    expect(runtime.getContext('b').ranges.policies[kind]!.followPanelRefresh).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(JSON.stringify(stored)).toBe(original);
});

it.each(['time', 'distance'] as const)('exposes default %s policy values as a detached snapshot', (kind) => {
    const runtime = new DashboardHostRuntime(extensionRangeBoard());
    const sender = runtime.createHost(owner('a')).host;
    value(sender.panels.setRangeOverride('b', { kind, source: 'board' }));
    const context = runtime.getContext('b');
    expect(context.ranges.policies[kind]).toEqual({ source: 'board', followBoardRefresh: true, followPanelRefresh: true });
    context.ranges.policies[kind]!.followBoardRefresh = false;
    context.ranges.policies[kind]!.followPanelRefresh = false;
    expect(runtime.getContext('b').ranges.policies[kind]).toEqual({ source: 'board', followBoardRefresh: true, followPanelRefresh: true });
    expect(runtime.getPanelState('b').rangePolicies[kind]).toEqual({ source: 'board', followBoardRefresh: true, followPanelRefresh: true });
});

it.each(['time', 'distance'] as const)('restores the active %s policy when overlapping owners clear or close', (kind) => {
    const runtime = new DashboardHostRuntime(extensionRangeBoard());
    const first = runtime.createHost(owner('a'));
    const second = runtime.createHost(owner('untouched'));
    const original = runtime.getContext('b').ranges;
    const a = value(first.host.panels.setRangeOverride('b', { kind, source: 'board', followBoardRefresh: false, followPanelRefresh: true }));
    const b = value(second.host.panels.setRangeOverride('b', { kind, source: 'board', followBoardRefresh: true, followPanelRefresh: false }));
    expect(runtime.getContext('b').ranges.policies[kind]).toEqual({ source: 'board', followBoardRefresh: true, followPanelRefresh: false });
    value(second.host.panels.clearRangeOverride(b));
    expect(runtime.getContext('b').ranges.policies[kind]).toEqual({ source: 'board', followBoardRefresh: false, followPanelRefresh: true });
    value(second.host.panels.setRangeOverride('b', { kind, source: 'board' }));
    second.dispose();
    expect(runtime.getContext('b').ranges.policies[kind]).toEqual({ source: 'board', followBoardRefresh: false, followPanelRefresh: true });
    value(first.host.panels.clearRangeOverride(a));
    expect(runtime.getContext('b').ranges).toEqual(original);
    value(first.host.panels.setRangeOverride('b', { kind, source: 'board' }));
    first.dispose();
    expect(runtime.getContext('b').ranges).toEqual(original);
});
