import { DashboardHostRuntime } from './hostRuntime';
import type { HostBoardInput, HostOwner, HostResult } from './hostTypes';

const board = (): HostBoardInput => ({
    id: 'board', timeRange: { start: 10, end: 20 }, distanceRange: { start: '', end: '' }, active: true,
    panels: ['source', 'second', 'chart', 'untouched'].map((id) => ({ id, type: id === 'chart' ? 'Line' : 'Extension', capabilities: ['border', 'refresh'] })),
});
const owner = (panelId: string, extra: Partial<HostOwner> = {}): HostOwner => ({
    panelId, packageId: 'example/note', typeId: 'note', surface: 'dashboard', getSettings: () => ({ retained: true }), applySettings: jest.fn(), ...extra,
});
const value = <T,>(result: HostResult<T>): T => { if (!result.ok) throw new Error(result.error.message); return result.value; };

it('exposes editing independently from tab activity without altering saved board data or stopping the host', () => {
    const input = board(); const saved = JSON.stringify(input); const runtime = new DashboardHostRuntime(input);
    const session = runtime.createHost(owner('source'));
    expect(runtime.getContext('source').board.editing).toBe(false);
    runtime.updateBoard({ ...input, editing: true });
    expect(runtime.getContext('source')).toMatchObject({ board: { editing: true }, active: true });
    expect(runtime.getContext('source', 'preview').board.editing).toBe(true);
    expect(session.host.settings.patch({ next: 1 }).ok).toBe(true);
    runtime.updateBoard({ ...input, active: false, editing: false });
    expect(runtime.getContext('source')).toMatchObject({ board: { editing: false }, active: false });
    expect(JSON.stringify(input)).toBe(saved);
    session.dispose(); runtime.dispose();
});

it('updates the same registration, restores earlier border owners and leaves unrelated panels and saved input unchanged', () => {
    const input = board(); const saved = JSON.stringify(input); const runtime = new DashboardHostRuntime(input);
    const first = runtime.createHost(owner('source')); const second = runtime.createHost(owner('second'));
    const firstHandle = value(first.host.panels.setBorder('chart', { color: '#123456' }));
    const secondHandle = value(second.host.panels.setBorder('chart', { color: '#abcdef' }));
    expect(runtime.getPanelState('chart').border).toEqual({ color: '#abcdef' });
    runtime.updateBoard({ ...input, timeRange: { start: 20, end: 30 } });
    expect(runtime.getPanelState('chart').border).toEqual({ color: '#abcdef' });
    const updated = value(first.host.panels.setBorder('chart', { color: 'orange' }));
    expect(updated).toBe(firstHandle);
    expect(runtime.getPanelState('chart').border).toEqual({ color: 'orange' });
    value(first.host.panels.clearBorder(firstHandle));
    expect(runtime.getPanelState('chart').border).toEqual({ color: '#abcdef' });
    value(secondHandle.dispose()); value(secondHandle.dispose());
    expect(runtime.getPanelState('chart').border).toBeUndefined();
    expect(runtime.getPanelState('untouched').border).toBeUndefined();
    expect(JSON.stringify(input)).toBe(saved);
    first.dispose(); second.dispose(); runtime.dispose();
});

it('supports the requesting panel itself, copies input/output and cleans registrations when its owner exits', () => {
    const runtime = new DashboardHostRuntime(board()); const session = runtime.createHost(owner('source'));
    const requested = { color: 'red' }; value(session.host.panels.setBorder('source', requested)); requested.color = 'blue';
    expect(runtime.getPanelState('source').border).toEqual({ color: 'red' });
    runtime.getPanelState('source').border!.color = 'green';
    expect(runtime.getPanelState('source').border).toEqual({ color: 'red' });
    session.dispose();
    expect(runtime.getPanelState('source').border).toBeUndefined();
    expect(session.host.panels.setBorder('source', { color: 'red' })).toMatchObject({ ok: false, error: { code: 'DISPOSED' } });
    runtime.dispose();
});

it('rejects invalid input and foreign handles without disturbing an existing border', () => {
    const runtime = new DashboardHostRuntime(board()); const first = runtime.createHost(owner('source')); const second = runtime.createHost(owner('second'));
    const handle = value(first.host.panels.setBorder('chart', { color: 'red' })); const revision = runtime.getSnapshot();
    expect(first.host.panels.setBorder('chart', { color: '' }).ok).toBe(false);
    expect(first.host.panels.setBorder('chart', { color: undefined } as any).ok).toBe(false);
    expect(second.host.panels.clearBorder(handle)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(first.host.panels.clearBorder({ ...handle })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(runtime.getSnapshot()).toBe(revision);
    expect(runtime.getPanelState('chart').border).toEqual({ color: 'red' });
    first.dispose(); second.dispose(); runtime.dispose();
});

it.each(['preview', 'editor', 'options'] as const)('rejects target border mutation on %s without registering anything', (surface) => {
    const runtime = new DashboardHostRuntime(board()); const session = runtime.createHost(owner('source', { surface }));
    const code = surface === 'preview' ? 'PREVIEW_FORBIDDEN' : 'UNSUPPORTED';
    expect(session.host.panels.setBorder('chart', { color: 'red' })).toMatchObject({ ok: false, error: { code } });
    expect(session.host.panels.clearBorder({ id: 'missing', dispose: () => ({ ok: true, value: undefined }) })).toMatchObject({ ok: false, error: { code } });
    expect(runtime.getPanelState('chart').border).toBeUndefined();
    session.dispose(); runtime.dispose();
});

it('removes target registrations when the target disappears and rejects unsupported or absent targets', () => {
    const input = board(); input.panels.find((panel) => panel.id === 'untouched')!.capabilities = [];
    const runtime = new DashboardHostRuntime(input); const session = runtime.createHost(owner('source'));
    expect(session.host.panels.setBorder('missing', { color: 'red' })).toMatchObject({ ok: false, error: { code: 'TARGET_NOT_FOUND' } });
    expect(session.host.panels.setBorder('untouched', { color: 'red' })).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    const handle = value(session.host.panels.setBorder('chart', { color: 'red' }));
    runtime.updateBoard({ ...input, panels: input.panels.filter((panel) => panel.id !== 'chart') });
    expect(runtime.getPanelState('chart').border).toBeUndefined();
    expect(session.host.panels.clearBorder(handle).ok).toBe(true);
    session.dispose(); runtime.dispose();
});
