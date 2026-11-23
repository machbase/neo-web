import { validateExtensionSettings } from './settings';
import { isBlackboxVideoExtension } from './types';
import { createHostApi } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import { dashboardHostModules } from './hostModules';
import type { DashboardHostModuleContext, DashboardRegistrationKind } from './hostModuleContext';
import type {
    ExtensionContext, HostBoardInput, HostDelivery, HostHandle, HostHeaderAction, HostOverlay, HostBorder,
    HostMessage, HostMessageInput, HostOwner, HostPanelState, HostRangeRequest, HostRefreshReason, HostResult,
    HostSession, HostSurface, RegisteredHostAction, RegisteredHostOverlay,
} from './hostTypes';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
type RecordKind = DashboardRegistrationKind;
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
type BlackboxRangePriority = { kind: 'request'; id: string; order: number } | { kind: 'cap'; order: number };
type BlackboxRangeMutation = 'request' | 'reorder' | 'remove' | 'replace';
interface BlackboxRangeSnapshot {
    effective: string;
    mutation: BlackboxRangeMutation;
    video?: { id: string; order: number; priority: BlackboxRangePriority; request: HostRangeRequest; ranked: boolean };
}
const isBlackboxTimeRange = (owner: OwnerRecord, kind: RecordKind, data: any): boolean =>
    kind === 'range' && data?.kind === 'time' && isBlackboxVideoExtension(owner.owner);
const sameRangeRequest = (before: HostRangeRequest, after: HostRangeRequest): boolean =>
    before.source === after.source &&
    (after.source === 'board' || (before.range?.start === after.range?.start && before.range?.end === after.range?.end)) &&
    (before.followBoardRefresh ?? true) === (after.followBoardRefresh ?? true) &&
    (before.followPanelRefresh ?? true) === (after.followPanelRefresh ?? true) &&
    before.followManualRefresh === after.followManualRefresh;
const changesOnlyBlackboxRegistrationOrder = (before: HostRangeRequest, after: HostRangeRequest): boolean => {
    const previous = before.blackboxVideoOrder;
    const next = after.blackboxVideoOrder;
    return !!previous && !!next &&
        Number.isFinite(previous.registered) && Number.isFinite(next.registered) && previous.registered !== next.registered &&
        Number.isFinite(previous.updated) && previous.updated === next.updated &&
        sameRangeRequest(before, after);
};

const selectBlackboxRange = (videoRanges: Registration[]) => {
    // Sync and mode changes update registration rank independently of recording selection.
    // Older packages still use handle order.
    const ranked = videoRanges.every(({ data }) =>
        Number.isFinite(data.blackboxVideoOrder?.registered) && Number.isFinite(data.blackboxVideoOrder?.updated));
    let first: Registration | undefined;
    let recorded: Registration | undefined;
    for (const range of videoRanges) {
        if (!first || (ranked && range.data.blackboxVideoOrder.registered < first.data.blackboxVideoOrder.registered)) first = range;
        if (range.data.source !== 'fixed') continue;
        const rank = ranked ? range.data.blackboxVideoOrder.updated : range.order;
        const latestRank = ranked ? recorded?.data.blackboxVideoOrder.updated : recorded?.order;
        if (!recorded || rank > latestRank) recorded = range;
    }
    return { selected: first?.data.source === 'board' ? first : recorded, ranked };
};

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
    private blackboxRangeChanges: Map<string, BlackboxRangeSnapshot> | null = null;
    private blackboxRangePriority = new Map<string, BlackboxRangePriority>();

    constructor(board: HostBoardInput) { this.board = copy(board); }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    getSnapshot = (): number => this.revision;

    private notify() {
        if (this.blackboxRangeChanges) return;
        this.revision++;
        for (const listener of this.listeners) {
            try { listener(); } catch { /* One host consumer cannot prevent another from updating. */ }
        }
    }

    private blackboxRangeKey(panelId: string): string {
        const { rangeOverrides, rangePolicies } = this.getPanelState(panelId);
        return JSON.stringify([rangeOverrides.time, rangePolicies.time]);
    }

    private selectedBlackboxRange(panelId: string) {
        return selectBlackboxRange([...this.registrations.values()].filter(({ owner, kind, target, data }) =>
            target === panelId && owner.alive && isBlackboxTimeRange(owner, kind, data)));
    }

    private updateBlackboxRangePriority(target: string, snapshot: BlackboxRangeSnapshot): void {
        const { selected: video, ranked } = this.selectedBlackboxRange(target);
        const before = snapshot.video;
        if (snapshot.mutation === 'replace' || !video || !ranked || !before?.ranked || !sameRangeRequest(before.request, video.data) ||
            (snapshot.mutation === 'request' && (video.id !== before.id || video.order !== before.order))) {
            this.blackboxRangePriority.delete(target);
            return;
        }

        const priority = before.priority;
        if (priority.kind === 'request') {
            const origin = this.registrations.get(priority.id);
            if (origin?.owner.alive && origin.target === target && origin.order === priority.order &&
                isBlackboxTimeRange(origin.owner, origin.kind, origin.data) && sameRangeRequest(origin.data, video.data)) {
                if (origin === video) this.blackboxRangePriority.delete(target);
                else this.blackboxRangePriority.set(target, priority);
                return;
            }
        }

        // A passive handoff cannot raise priority. If the surviving video's own
        // request is already at or below the cap, it can supply that priority itself.
        const order = Math.min(priority.order, video.order);
        if (order === video.order) this.blackboxRangePriority.delete(target);
        else this.blackboxRangePriority.set(target, { kind: 'cap', order });
    }

    private withBlackboxRangeChanges<T>(targets: string[], change: () => T, mutation: BlackboxRangeMutation = 'request'): T {
        if (!targets.length) return change();
        const outer = this.blackboxRangeChanges;
        const ranges = outer ?? new Map<string, BlackboxRangeSnapshot>();
        for (const target of targets) {
            const existing = ranges.get(target);
            if (existing) {
                if (mutation === 'request' && existing.mutation !== 'replace') existing.mutation = mutation;
                continue;
            }
            const { selected: video, ranked } = this.selectedBlackboxRange(target);
            ranges.set(target, {
                effective: this.blackboxRangeKey(target),
                mutation,
                video: video && {
                    id: video.id, order: video.order,
                    priority: this.blackboxRangePriority.get(target) ?? { kind: 'request', id: video.id, order: video.order },
                    request: video.data, ranked,
                },
            });
        }
        if (outer) return change();
        this.blackboxRangeChanges = ranges;
        try {
            return change();
        } finally {
            this.blackboxRangeChanges = null;
            for (const [target, before] of ranges) {
                this.updateBlackboxRangePriority(target, before);
                if (before.effective !== this.blackboxRangeKey(target)) this.state(target).rangeRevision++;
            }
            this.notify();
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
        const replacingBoard = previous.id !== next.id;
        const nextIds = new Set(next.panels.map(panel => panel.id));
        const blackboxTargets = [...this.registrations.values()]
            .filter(({ owner, kind, target, data }) => isBlackboxTimeRange(owner, kind, data) &&
                (!nextIds.has(target) || (owner.attached && !nextIds.has(owner.owner.panelId))))
            .map(({ target }) => target);
        if (replacingBoard) blackboxTargets.push(...this.blackboxRangePriority.keys());
        // Resolve the final range after all of the removed videos have been detached.
        this.withBlackboxRangeChanges(blackboxTargets, () => {
            if (replacingBoard) this.blackboxRangePriority.clear();
            this.board = copy(next);
            for (const owner of this.owners.values()) {
                if (owner.attached && !nextIds.has(owner.owner.panelId)) this.disposeOwner(owner);
            }
            for (const registration of [...this.registrations.values()]) {
                if (!nextIds.has(registration.target) && registration.kind !== 'listener' && registration.kind !== 'actions') this.remove(registration.id);
            }
            if (next.refresh && next.refresh.revision !== previous.refresh?.revision) {
                for (const panel of next.panels) this.bumpRefresh(panel.id, next.refresh.reasons);
            }
            this.notify();
        }, replacingBoard ? 'replace' : 'remove');
    }

    getPanelState(panelId: string): HostPanelState {
        const state = this.state(panelId);
        const ranges = new Map<string, Registration>();
        const videoRanges: Registration[] = [];
        const overlays: RegisteredHostOverlay[] = [];
        const actions: RegisteredHostAction[] = [];
        let border: Registration | undefined;
        for (const registration of this.registrations.values()) {
            if (registration.target !== panelId || !registration.owner.alive) continue;
            if (registration.kind === 'range') {
                if (isBlackboxTimeRange(registration.owner, registration.kind, registration.data)) {
                    videoRanges.push(registration);
                    continue;
                }
                const previous = ranges.get(registration.data.kind);
                if (!previous || previous.order < registration.order) ranges.set(registration.data.kind, registration);
            } else if (registration.kind === 'overlay') {
                overlays.push({ ...copy(registration.data), ownerId: registration.owner.id });
            } else if (registration.kind === 'border') {
                if (!border || border.order < registration.order) border = registration;
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
        const { selected: selectedVideoRange } = selectBlackboxRange(videoRanges);
        const otherTimeRange = ranges.get('time');
        if (selectedVideoRange && (!otherTimeRange || (this.blackboxRangePriority.get(panelId)?.order ?? selectedVideoRange.order) > otherTimeRange.order)) {
            ranges.set('time', selectedVideoRange);
        }
        const rangeOverrides: HostPanelState['rangeOverrides'] = {};
        const rangePolicies: HostPanelState['rangePolicies'] = {};
        for (const [kind, registration] of ranges) {
            const request: HostRangeRequest = registration.data;
            const range = request.source === 'board' ? (kind === 'time' ? this.board.timeRange : this.board.distanceRange) : request.range;
            if (range) (rangeOverrides as any)[kind] = copy(range);
            (rangePolicies as any)[kind] = {
                source: request.source,
                followBoardRefresh: request.followBoardRefresh ?? true,
                followPanelRefresh: request.followPanelRefresh ?? true,
                ...(request.followManualRefresh === undefined ? {} : { followManualRefresh: request.followManualRefresh }),
            };
        }
        return { rangeRevision: state.rangeRevision, rangeOverrides, rangePolicies, overlays, ...(border ? { border: copy(border.data) } : {}), actions, refresh: copy(state.refresh) };
    }

    getContext(panelId: string, surface: HostSurface = 'dashboard'): ExtensionContext {
        const panel = this.board.panels.find((entry) => entry.id === panelId) ?? { id: panelId, type: 'Extension', capabilities: [] };
        const state = this.getPanelState(panelId);
        return {
            board: { id: this.board.id, editing: this.board.editing ?? false, ...(this.board.publicView ? { publicView: true } : {}) }, panel: copy(panel), panels: copy(this.board.panels),
            ranges: {
                time: copy(this.board.timeRange), distance: copy(this.board.distanceRange),
                panelTime: state.rangeOverrides.time ?? copy(this.board.timeRange), panelDistance: state.rangeOverrides.distance ?? copy(this.board.distanceRange),
                policies: copy(state.rangePolicies),
            },
            surface, active: this.board.active ?? true, refresh: state.refresh,
            capabilities: { contractVersion: 1 },
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
        const videoTimeOnDistanceChart = capability === 'range:time' && isBlackboxVideoExtension(owner.owner) &&
            target.capabilities.includes('range:distance');
        if (!target.capabilities.includes(capability) && !videoTimeOnDistanceChart) {
            return failure('UNSUPPORTED', 'The target panel does not support this operation.');
        }
        return success(undefined);
    }

    private register(owner: OwnerRecord, kind: RecordKind, target: string, data: unknown): HostHandle {
        const blackbox = isBlackboxTimeRange(owner, kind, data);
        return this.withBlackboxRangeChanges(blackbox ? [target] : [], () => {
            const id = `${owner.id}/registration-${++this.sequence}`;
            const handle: HostHandle = { id, dispose: () => { this.remove(id); return success(undefined); } };
            this.registrations.set(id, { id, owner, kind, target, data, order: ++this.sequence, handle });
            if (kind === 'range' && !blackbox) this.state(target).rangeRevision++;
            this.notify();
            return handle;
        });
    }

    private remove(id: string): void {
        const registration = this.registrations.get(id);
        if (!registration) return;
        const { owner, kind, target, data } = registration;
        const blackbox = isBlackboxTimeRange(owner, kind, data);
        this.withBlackboxRangeChanges(blackbox ? [target] : [], () => {
            this.registrations.delete(id);
            if (kind === 'range' && !blackbox) this.state(target).rangeRevision++;
            this.notify();
        }, 'remove');
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
        const owned = [...this.registrations.values()].filter(item => item.owner === owner);
        const targets = owned.filter(({ kind, data }) => isBlackboxTimeRange(owner, kind, data)).map(({ target }) => target);
        this.withBlackboxRangeChanges(targets, () => {
            owner.alive = false;
            owner.abort.abort();
            for (const registration of owned) this.remove(registration.id);
            this.owners.delete(owner.id);
            this.messageQueues.delete(owner.id);
        }, 'remove');
    }

    dispose(): void {
        if (!this.alive) return;
        this.alive = false;
        for (const owner of [...this.owners.values()]) this.disposeOwner(owner);
        this.blackboxRangePriority.clear();
        this.listeners.clear();
    }

    createHost(input: HostOwner): HostSession {
        const owner: OwnerRecord = { id: `${this.board.id}/${input.panelId}/owner-${++this.sequence}`, owner: input, alive: this.alive, attached: this.board.panels.some((panel) => panel.id === input.panelId), abort: new AbortController() };
        this.owners.set(owner.id, owner);
        const context: DashboardHostModuleContext = {
            owner: input, surface: input.surface, adapters: input.adapters, signal: owner.abort.signal,
            checkActive: () => this.guard(owner),
            checkMutation: () => this.guard(owner, true),
            checkDashboard: () => this.dashboardGuard(owner),
            checkTarget: (panelId, capability) => this.target(owner, panelId, capability),
            register: (kind, target, data) => this.register(owner, kind, target, data),
            upsert: (kind, target, data) => this.upsert(owner, kind, target, data),
            clear: (kind, handle) => this.clear(owner, kind, handle),
            send: (message) => {
                const task = () => this.send(owner, message);
                const pending = (this.messageQueues.get(owner.id) ?? Promise.resolve()).then(task, task);
                this.messageQueues.set(owner.id, pending);
                return pending;
            },
            refresh: (panelId) => { this.bumpRefresh(panelId, ['panel-request']); this.notify(); },
            notify: () => this.notify(),
        };
        const host = createHostApi<DashboardHostModuleContext, typeof dashboardHostModules>(dashboardHostModules, context);
        return { host, dispose: () => this.disposeOwner(owner) };
    }

    private upsert(owner: OwnerRecord, kind: 'range' | 'overlay' | 'border', target: string, data: HostRangeRequest | HostOverlay | HostBorder): HostHandle {
        const previous = [...this.registrations.values()].find((entry) => entry.owner === owner && entry.kind === kind && entry.target === target &&
            (kind === 'range' ? entry.data.kind === (data as HostRangeRequest).kind : kind === 'overlay' ? entry.data.id === (data as HostOverlay).id : true));
        if (previous) {
            const blackbox = isBlackboxTimeRange(owner, kind, data);
            // A synchronization toggle can reorder videos within Blackbox without
            // moving this range ahead of another extension's explicit range request.
            const reorderedVideo = blackbox && changesOnlyBlackboxRegistrationOrder(previous.data, data as HostRangeRequest);
            return this.withBlackboxRangeChanges(blackbox ? [target] : [], () => {
                previous.data = data;
                if (kind !== 'overlay' && !reorderedVideo) previous.order = ++this.sequence;
                if (kind === 'range' && !blackbox) this.state(target).rangeRevision++;
                this.notify();
                return previous.handle;
            }, reorderedVideo ? 'reorder' : 'request');
        }
        return this.register(owner, kind, target, data);
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
