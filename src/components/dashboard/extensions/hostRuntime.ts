import { validateExtensionSettings } from './settings';
import { normalizeHostPath } from './hostPaths';
import type {
    ExtensionContext, ExtensionHost, HostAdapters, HostBoardInput, HostDelivery, HostErrorCode, HostHandle, HostHeaderAction,
    HostMessage, HostMessageInput, HostOwner, HostPanelState, HostRangeRequest, HostRefreshReason, HostResult,
    HostSession, HostSurface, RegisteredHostAction, RegisteredHostOverlay,
} from './hostTypes';

const success = <T,>(value: T): HostResult<T> => ({ ok: true, value });
const failure = <T = never,>(code: HostErrorCode, message: string): HostResult<T> => ({ ok: false, error: { code, message } });
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const apis = ['settings.patch', 'messages.send', 'messages.subscribe', 'panels.setRangeOverride', 'panels.clearRangeOverride', 'panels.setOverlay', 'panels.clearOverlay', 'panels.refresh', 'header.registerActions'];
type RecordKind = 'range' | 'overlay' | 'actions' | 'listener';
interface OwnerRecord { id: string; owner: HostOwner; alive: boolean; attached: boolean; abort: AbortController; }
interface Registration {
    id: string;
    owner: OwnerRecord;
    kind: RecordKind;
    target: string;
    order: number;
    data: any;
    handle: HostHandle;
}
interface PanelCounters { rangeRevision: number; refresh: { revision: number; reasons: HostRefreshReason[] }; }

/** One runtime belongs to one open dashboard execution, never to a saved file globally. */
export class DashboardHostRuntime {
    private board: HostBoardInput;
    private revision = 0;
    private sequence = 0;
    private alive = true;
    private owners = new Map<string, OwnerRecord>();
    private registrations = new Map<string, Registration>();
    private listeners = new Set<() => void>();
    private counters = new Map<string, PanelCounters>();
    private pendingRefresh = new Set<string>();
    private messageQueues = new Map<string, Promise<unknown>>();

    constructor(board: HostBoardInput) { this.board = copy(board); }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    getSnapshot = (): number => this.revision;

    private notify() {
        this.revision++;
        for (const listener of this.listeners) {
            try { listener(); } catch { /* One host consumer cannot prevent another from updating. */ }
        }
    }

    private state(panelId: string): PanelCounters {
        let state = this.counters.get(panelId);
        if (!state) {
            state = { rangeRevision: 0, refresh: { revision: 0, reasons: [] } };
            this.counters.set(panelId, state);
        }
        return state;
    }

    private bumpRefresh(panelId: string, reasons: HostRefreshReason[]) {
        const state = this.state(panelId);
        const merged = this.pendingRefresh.has(panelId) ? [...state.refresh.reasons, ...reasons] : reasons;
        state.refresh = { revision: state.refresh.revision + 1, reasons: [...new Set(merged)] };
        if (!this.pendingRefresh.has(panelId)) {
            this.pendingRefresh.add(panelId);
            queueMicrotask(() => { this.pendingRefresh.delete(panelId); });
        }
    }

    updateBoard(next: HostBoardInput): void {
        if (!this.alive || JSON.stringify(next) === JSON.stringify(this.board)) return;
        const previous = this.board;
        this.board = copy(next);
        for (const owner of this.owners.values()) {
            if (owner.attached && !next.panels.some((panel) => panel.id === owner.owner.panelId)) this.disposeOwner(owner);
        }
        for (const registration of [...this.registrations.values()]) {
            if (!next.panels.some((panel) => panel.id === registration.target) && registration.kind !== 'listener' && registration.kind !== 'actions') this.remove(registration.id);
        }
        if (next.refresh && next.refresh.revision !== previous.refresh?.revision) {
            for (const panel of next.panels) this.bumpRefresh(panel.id, next.refresh.reasons);
        }
        this.notify();
    }

    getPanelState(panelId: string): HostPanelState {
        const state = this.state(panelId);
        const ranges = new Map<string, Registration>();
        const overlays: RegisteredHostOverlay[] = [];
        const actions: RegisteredHostAction[] = [];
        for (const registration of this.registrations.values()) {
            if (registration.target !== panelId || !registration.owner.alive) continue;
            if (registration.kind === 'range') {
                const previous = ranges.get(registration.data.kind);
                if (!previous || previous.order < registration.order) ranges.set(registration.data.kind, registration);
            } else if (registration.kind === 'overlay') {
                overlays.push({ ...copy(registration.data), ownerId: registration.owner.id });
            } else if (registration.kind === 'actions') {
                actions.push(...(registration.data as HostHeaderAction[]).map((action) => ({
                    ...action, ownerId: registration.owner.id,
                    onSelect: () => {
                        if (!registration.owner.alive || !this.registrations.has(registration.id) || action.disabled) return;
                        try { Promise.resolve(action.onSelect()).catch(() => {}); } catch { /* Callback isolation. */ }
                    },
                })));
            }
        }
        const rangeOverrides: HostPanelState['rangeOverrides'] = {};
        const rangePolicies: HostPanelState['rangePolicies'] = {};
        for (const [kind, registration] of ranges) {
            const request: HostRangeRequest = registration.data;
            const range = request.source === 'board' ? (kind === 'time' ? this.board.timeRange : this.board.distanceRange) : request.range;
            if (range) (rangeOverrides as any)[kind] = copy(range);
            (rangePolicies as any)[kind] = { source: request.source, followBoardRefresh: request.followBoardRefresh ?? true, followPanelRefresh: request.followPanelRefresh ?? true };
        }
        return { rangeRevision: state.rangeRevision, rangeOverrides, rangePolicies, overlays, actions, refresh: copy(state.refresh) };
    }

    getContext(panelId: string, surface: HostSurface = 'dashboard', adapters?: HostAdapters): ExtensionContext {
        const panel = this.board.panels.find((entry) => entry.id === panelId) ?? { id: panelId, type: 'Extension', capabilities: [] };
        const state = this.getPanelState(panelId);
        const allowed = surface === 'dashboard' ? [...apis] : surface === 'preview' ? [] : ['settings.patch'];
        const adapterAPIs: [keyof HostAdapters, string][] = [
            ['selectFile', 'files.select'], ['open', 'navigation.open'], ['notify', 'ui.notify'], ['confirm', 'ui.confirm'],
            ['enterFullscreen', 'viewport.enterFullscreen'], ['exitFullscreen', 'viewport.exitFullscreen'],
        ];
        for (const [name, api] of adapterAPIs) if (adapters?.[name]) allowed.push(api);
        return {
            board: { id: this.board.id }, panel: copy(panel), panels: copy(this.board.panels),
            ranges: {
                time: copy(this.board.timeRange), distance: copy(this.board.distanceRange),
                panelTime: state.rangeOverrides.time ?? copy(this.board.timeRange), panelDistance: state.rangeOverrides.distance ?? copy(this.board.distanceRange),
                policies: copy(state.rangePolicies),
            },
            surface, active: this.board.active ?? true, refresh: state.refresh,
            capabilities: { contractVersion: 1, apis: [...allowed] },
        };
    }

    private guard(owner: OwnerRecord, targetOperation = false): HostResult<void> {
        if (!this.alive || !owner.alive) return failure('DISPOSED', 'This panel instance has closed.');
        if (targetOperation && owner.owner.surface === 'preview') return failure('PREVIEW_FORBIDDEN', 'Preview cannot change the dashboard.');
        return success(undefined);
    }

    private dashboardGuard(owner: OwnerRecord): HostResult<void> {
        const guard = this.guard(owner, true);
        if (!guard.ok) return guard;
        return owner.owner.surface === 'dashboard' ? guard : failure('UNSUPPORTED', 'Panel operations and messages are available only on dashboard panels.');
    }

    private target(owner: OwnerRecord, panelId: string, capability: string): HostResult<void> {
        const guard = this.dashboardGuard(owner);
        if (!guard.ok) return guard;
        const target = this.board.panels.find((panel) => panel.id === panelId);
        if (!target) return failure('TARGET_NOT_FOUND', 'The target panel is unavailable.');
        if (!target.capabilities.includes(capability)) return failure('UNSUPPORTED', 'The target panel does not support this operation.');
        return success(undefined);
    }

    private register(owner: OwnerRecord, kind: RecordKind, target: string, data: unknown): HostHandle {
        const id = `${owner.id}/registration-${++this.sequence}`;
        const handle: HostHandle = { id, dispose: () => { this.remove(id); return success(undefined); } };
        this.registrations.set(id, { id, owner, kind, target, data, order: ++this.sequence, handle });
        if (kind === 'range') this.state(target).rangeRevision++;
        this.notify();
        return handle;
    }

    private remove(id: string): void {
        const registration = this.registrations.get(id);
        if (!registration) return;
        this.registrations.delete(id);
        if (registration.kind === 'range') this.state(registration.target).rangeRevision++;
        this.notify();
    }

    private clear(owner: OwnerRecord, kind: RecordKind, handle: HostHandle): HostResult<void> {
        const guard = this.dashboardGuard(owner);
        if (!guard.ok) return guard;
        if (!handle || typeof handle.id !== 'string') return failure('INVALID_INPUT', 'A registration handle is required.');
        const registration = this.registrations.get(handle.id);
        if (!registration) return success(undefined);
        if (registration.owner !== owner || registration.kind !== kind || registration.handle !== handle) return failure('INVALID_INPUT', 'This registration belongs to another owner.');
        this.remove(handle.id);
        return success(undefined);
    }

    private disposeOwner(owner: OwnerRecord): void {
        if (!owner.alive) return;
        owner.alive = false;
        owner.abort.abort();
        for (const registration of [...this.registrations.values()]) if (registration.owner === owner) this.remove(registration.id);
        this.owners.delete(owner.id);
        this.messageQueues.delete(owner.id);
    }

    dispose(): void {
        if (!this.alive) return;
        this.alive = false;
        for (const owner of [...this.owners.values()]) this.disposeOwner(owner);
        this.listeners.clear();
    }

    createHost(input: HostOwner): HostSession {
        const owner: OwnerRecord = { id: `${this.board.id}/${input.panelId}/owner-${++this.sequence}`, owner: input, alive: this.alive, attached: this.board.panels.some((panel) => panel.id === input.panelId), abort: new AbortController() };
        this.owners.set(owner.id, owner);
        const adapter = <T,>(operation: (() => T | Promise<T>) | undefined): Promise<HostResult<T>> => {
            const guard = this.guard(owner);
            if (!guard.ok) return Promise.resolve(guard);
            if (!operation) return Promise.resolve(failure('UNSUPPORTED', 'This operation is unavailable.'));
            // Call before Promise resolution to retain the browser's user activation.
            try {
                return Promise.resolve(operation()).then((result) => {
                    const stillAlive = this.guard(owner);
                    return stillAlive.ok ? success(result) : stillAlive;
                }, () => failure('ADAPTER_ERROR', 'The requested operation failed.'));
            } catch { return Promise.resolve(failure('ADAPTER_ERROR', 'The requested operation failed.')); }
        };
        const host: ExtensionHost = {
            settings: { patch: (changes, options) => {
                const guard = this.guard(owner, true);
                if (!guard.ok) return guard;
                try {
                    const incoming = validateExtensionSettings(changes);
                    if (!incoming.settings) return { ok: false, error: { code: 'INVALID_INPUT', message: incoming.error ?? 'Invalid settings patch.', settingErrors: incoming.settingErrors } };
                    const removal = validateExtensionSettings({ removeKeys: options?.removeKeys === undefined ? [] : options.removeKeys });
                    const removeKeys = removal.settings?.removeKeys;
                    if (!Array.isArray(removeKeys) || removeKeys.some((key) => typeof key !== 'string')) return failure('INVALID_INPUT', 'Settings removal keys must be a JSON array of strings without empty slots.');
                    const next = { ...input.getSettings(), ...incoming.settings };
                    for (const key of removeKeys) delete next[key];
                    const checked = validateExtensionSettings(next, input.surface === 'dashboard' ? input.validateSettings : undefined);
                    if (!checked.settings) return { ok: false, error: { code: 'INVALID_INPUT', message: checked.error ?? 'Panel settings are invalid.', settingErrors: checked.settingErrors } };
                    input.applySettings(checked.settings);
                    this.notify();
                    return success(copy(checked.settings));
                } catch { return failure('INVALID_INPUT', 'Panel settings could not be updated.'); }
            } },
            messages: {
                subscribe: (topic, handler) => {
                    const guard = this.dashboardGuard(owner);
                    if (!guard.ok) return guard;
                    if (typeof topic !== 'string' || !topic.includes('/') || typeof handler !== 'function') return failure('INVALID_INPUT', 'A namespaced topic and handler are required.');
                    return success(this.register(owner, 'listener', input.panelId, { topic, handler }));
                },
                send: (message) => {
                    const checked = validateExtensionSettings({ message });
                    if (!checked.settings) return Promise.resolve(failure('INVALID_INPUT', 'Messages must contain JSON values.'));
                    const safeMessage = checked.settings.message as HostMessageInput;
                    const task = () => this.send(owner, safeMessage);
                    const pending = (this.messageQueues.get(owner.id) ?? Promise.resolve()).then(task, task);
                    this.messageQueues.set(owner.id, pending);
                    return pending;
                },
            },
            panels: {
                setRangeOverride: (panelId, request) => {
                    if (!request || !['time', 'distance'].includes(request.kind) || !['fixed', 'board'].includes(request.source)) return failure('INVALID_INPUT', 'A range kind and source are required.');
                    const guard = this.target(owner, panelId, `range:${request.kind}`);
                    if (!guard.ok) return guard;
                    const checked = validateExtensionSettings({ request });
                    if (!checked.settings) return failure('INVALID_INPUT', 'The range request must contain JSON values.');
                    if (request.followBoardRefresh !== undefined && typeof request.followBoardRefresh !== 'boolean' || request.followPanelRefresh !== undefined && typeof request.followPanelRefresh !== 'boolean') return failure('INVALID_INPUT', 'Refresh policies must be boolean.');
                    if (request.source === 'fixed') {
                        const range = request.range;
                        if (!range || (request.kind === 'time' && (typeof range.start !== 'number' || typeof range.end !== 'number' || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start > range.end)) || (request.kind === 'distance' && (![range.start, range.end].every((value) => typeof value === 'string' || typeof value === 'number')))) return failure('INVALID_INPUT', 'A valid fixed range is required.');
                    }
                    const previous = [...this.registrations.values()].find((entry) => entry.owner === owner && entry.kind === 'range' && entry.target === panelId && entry.data.kind === request.kind);
                    if (previous) {
                        previous.data = copy(request); previous.order = ++this.sequence;
                        this.state(panelId).rangeRevision++; this.notify();
                        return success(previous.handle);
                    }
                    return success(this.register(owner, 'range', panelId, copy(request)));
                },
                clearRangeOverride: (handle) => this.clear(owner, 'range', handle),
                setOverlay: (panelId, overlay) => {
                    const guard = this.target(owner, panelId, 'overlay');
                    if (!guard.ok) return guard;
                    if (!overlay || typeof overlay.id !== 'string' || !overlay.id || !['line', 'band'].includes(overlay.kind) || !['x', 'y'].includes(overlay.axis)) return failure('INVALID_INPUT', 'An overlay ID, kind and axis are required.');
                    const coordinates = overlay.kind === 'line' ? [overlay.value] : [overlay.start, overlay.end];
                    if (!coordinates.every((value) => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)) || !validateExtensionSettings({ overlay }).settings || (overlay.color !== undefined && typeof overlay.color !== 'string') || (overlay.width !== undefined && (typeof overlay.width !== 'number' || !Number.isFinite(overlay.width) || overlay.width <= 0))) return failure('INVALID_INPUT', 'Overlay coordinates and appearance must be valid data values.');
                    const previous = [...this.registrations.values()].find((entry) => entry.owner === owner && entry.kind === 'overlay' && entry.target === panelId && entry.data.id === overlay.id);
                    if (previous) { previous.data = copy(overlay); this.notify(); return success(previous.handle); }
                    return success(this.register(owner, 'overlay', panelId, copy(overlay)));
                },
                clearOverlay: (handle) => this.clear(owner, 'overlay', handle),
                refresh: (panelId) => {
                    const guard = this.target(owner, panelId, 'refresh');
                    if (!guard.ok) return guard;
                    this.bumpRefresh(panelId, ['panel-request']); this.notify();
                    return success(undefined);
                },
            },
            header: { registerActions: (actions) => {
                const guard = this.guard(owner);
                if (!guard.ok) return guard;
                if (input.surface !== 'dashboard') return failure('UNSUPPORTED', 'Header actions are available only on dashboard panels.');
                // Check every index, as the JSON setting validator does for arrays.
                // Header actions also contain React nodes and callbacks, so do not JSON-validate them.
                if (!Array.isArray(actions) || Array.from(actions).some((action, index) => !Object.prototype.hasOwnProperty.call(actions, index) || !action || typeof action.id !== 'string' || !action.id || typeof action.label !== 'string' || typeof action.onSelect !== 'function' || (action.checked !== undefined && typeof action.checked !== 'boolean') || (action.disabled !== undefined && typeof action.disabled !== 'boolean')) || new Set(actions.map((action) => action.id)).size !== actions.length) return failure('INVALID_INPUT', 'Header actions need filled array slots, unique IDs, labels, boolean states and callbacks.');
                return success(this.register(owner, 'actions', input.panelId, actions.map((action) => ({ ...action }))));
            } },
            viewport: {
                enterFullscreen: () => adapter(input.adapters?.enterFullscreen ? () => input.adapters!.enterFullscreen!() : undefined),
                exitFullscreen: () => adapter(input.adapters?.exitFullscreen ? () => input.adapters!.exitFullscreen!() : undefined),
            },
            files: { select: (request = {}) => {
                if (!request || typeof request !== 'object' || Array.isArray(request)) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path are invalid.'));
                try {
                    // Validate before copying: JSON would turn array holes into null.
                    // Explicit undefined optional fields retain their existing "not provided" meaning.
                    const normalizedRequest = {
                        ...(request.extensions === undefined ? {} : { extensions: request.extensions }),
                        ...(request.startPath === undefined ? {} : { startPath: request.startPath }),
                    };
                    const validated = validateExtensionSettings({ request: normalizedRequest });
                    if (!validated.settings) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path must contain JSON values without empty slots.'));
                    const checked = validated.settings.request as typeof request;
                    if ((checked.startPath !== undefined && typeof checked.startPath !== 'string') || (checked.extensions !== undefined && (!Array.isArray(checked.extensions) || checked.extensions.some((extension) => typeof extension !== 'string' || !extension)))) return Promise.resolve(failure('INVALID_INPUT', 'File filters and start path are invalid.'));
                    if (checked.startPath !== undefined) checked.startPath = normalizeHostPath(checked.startPath);
                    return adapter(input.adapters?.selectFile ? () => input.adapters!.selectFile!(checked, owner.abort.signal) : undefined);
                } catch {
                    return Promise.resolve(failure('INVALID_INPUT', 'The file selection start path is invalid.'));
                }
            } },
            navigation: { open: (request) => {
                if (!request || typeof request.path !== 'string' || !request.path || !['dashboard', 'file'].includes(request.kind) || (request.target !== undefined && !['tab', 'window'].includes(request.target))) return Promise.resolve(failure('INVALID_INPUT', 'A path, file kind and valid target are required.'));
                return adapter(input.adapters?.open ? () => input.adapters!.open!({ ...request }, owner.abort.signal) : undefined);
            } },
            ui: {
                notify: (request) => {
                    const guard = this.guard(owner);
                    if (!guard.ok) return guard;
                    if (!request || typeof request.message !== 'string') return failure('INVALID_INPUT', 'A notification message is required.');
                    if (!input.adapters?.notify) return failure('UNSUPPORTED', 'Notifications are unavailable.');
                    try { input.adapters.notify({ ...request }); return success(undefined); } catch { return failure('ADAPTER_ERROR', 'The notification could not be shown.'); }
                },
                confirm: (message) => typeof message !== 'string' ? Promise.resolve(failure('INVALID_INPUT', 'A confirmation message is required.')) : adapter(input.adapters?.confirm ? () => input.adapters!.confirm!(message) : undefined),
            },
        };
        return { host, dispose: () => this.disposeOwner(owner) };
    }

    private send(owner: OwnerRecord, message: HostMessageInput): HostResult<HostDelivery[]> {
        const guard = this.dashboardGuard(owner);
        if (!guard.ok) return guard;
        if (!message || !Array.isArray(message.targetPanelIds) || !message.targetPanelIds.length || message.targetPanelIds.some((id) => typeof id !== 'string' || !id) || typeof message.topic !== 'string' || !message.topic.includes('/')) return failure('INVALID_INPUT', 'Explicit target panel IDs and a namespaced topic are required.');
        const checked = validateExtensionSettings({ payload: message.payload });
        if (!checked.settings) return failure('INVALID_INPUT', 'Message payloads must contain JSON values.');
        const sender = { panelId: owner.owner.panelId, packageId: owner.owner.packageId, typeId: owner.owner.typeId };
        const id = `${owner.id}/message-${++this.sequence}`;
        const scope = (surface: HostSurface) => surface === 'dashboard' ? 'dashboard' : surface === 'preview' ? 'preview' : 'editor';
        const deliveries: HostDelivery[] = [];
        for (const panelId of [...new Set(message.targetPanelIds)]) {
            if (!this.board.panels.some((panel) => panel.id === panelId)) { deliveries.push({ panelId, status: 'not-found' }); continue; }
            const receivers = [...this.registrations.values()].filter((entry) => entry.kind === 'listener' && entry.target === panelId && entry.data.topic === message.topic && entry.owner.alive && scope(entry.owner.owner.surface) === scope(owner.owner.surface));
            deliveries.push({ panelId, status: receivers.length ? 'delivered' : 'not-listening' });
            for (const receiver of receivers) {
                if (!receiver.owner.alive || !this.registrations.has(receiver.id)) continue;
                const envelope: HostMessage = { id, sender: { ...sender }, topic: message.topic, payload: copy(checked.settings.payload) };
                try { Promise.resolve(receiver.data.handler(envelope)).catch(() => {}); } catch { /* Delivery reports invocation, never package completion. */ }
            }
        }
        return success(deliveries);
    }
}
