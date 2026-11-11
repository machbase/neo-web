import type { ReactNode } from 'react';
import type { SettingErrors, Settings, SettingValidators } from './settings';

export type HostSurface = 'dashboard' | 'preview' | 'editor' | 'options';
export type HostErrorCode = 'INVALID_INPUT' | 'UNSUPPORTED' | 'TARGET_NOT_FOUND' | 'PREVIEW_FORBIDDEN' | 'DISPOSED' | 'ADAPTER_ERROR';
export type HostResult<T = void> = { ok: true; value: T } | { ok: false; error: { code: HostErrorCode; message: string; settingErrors?: SettingErrors } };
export interface HostHandle { readonly id: string; dispose(): HostResult<void>; }
export interface HostTimeRange { start: number; end: number; }
export interface HostDistanceRange { start: string | number; end: string | number; }
export type HostRefreshReason = 'manual' | 'auto' | 'range-change' | 'panel-request';
export interface HostRefresh { revision: number; reasons: HostRefreshReason[]; }
export interface HostPanelInfo {
    id: string;
    /** Memory-only rendering revision; never part of a saved dashboard panel. */
    executionRevision?: number;
    type: string;
    title?: string;
    theme?: string;
    width?: number;
    height?: number;
    capabilities: string[];
}
export interface HostBoardInput {
    id: string;
    panels: HostPanelInfo[];
    timeRange: HostTimeRange | null;
    distanceRange: HostDistanceRange;
    active?: boolean;
    refresh?: HostRefresh;
}
export interface ExtensionContext {
    board: { id: string };
    panel: HostPanelInfo;
    panels: HostPanelInfo[];
    ranges: {
        time: HostTimeRange | null;
        distance: HostDistanceRange;
        panelTime: HostTimeRange | null;
        panelDistance: HostDistanceRange;
        policies: HostPanelState['rangePolicies'];
    };
    surface: HostSurface;
    active: boolean;
    refresh: HostRefresh;
    capabilities: { contractVersion: 1; apis: string[] };
}
export type HostRangeRequest = {
    kind: 'time' | 'distance';
    source: 'fixed' | 'board';
    range?: HostTimeRange | HostDistanceRange;
    followBoardRefresh?: boolean;
    followPanelRefresh?: boolean;
};
export interface HostRangePolicy { source: 'fixed' | 'board'; followBoardRefresh: boolean; followPanelRefresh: boolean; }
export interface HostOverlay {
    id: string;
    kind: 'line' | 'band';
    axis: 'x' | 'y';
    value?: number | string;
    start?: number | string;
    end?: number | string;
    color?: string;
    width?: number;
}
export interface RegisteredHostOverlay extends HostOverlay { ownerId: string; }
export interface HostHeaderAction {
    id: string;
    label: string;
    icon?: ReactNode;
    checked?: boolean;
    disabled?: boolean;
    onSelect(): void | Promise<void>;
}
export interface RegisteredHostAction extends HostHeaderAction { ownerId: string; }
export interface HostPanelState {
    rangeRevision: number;
    rangeOverrides: { time?: HostTimeRange; distance?: HostDistanceRange };
    rangePolicies: { time?: HostRangePolicy; distance?: HostRangePolicy };
    overlays: RegisteredHostOverlay[];
    actions: RegisteredHostAction[];
    refresh: HostRefresh;
}
export interface HostMessageInput { targetPanelIds: string[]; topic: string; payload: unknown; }
export interface HostMessage {
    id: string;
    topic: string;
    payload: unknown;
    sender: { panelId: string; packageId: string; typeId: string };
}
export interface HostDelivery { panelId: string; status: 'delivered' | 'not-listening' | 'not-found'; }
export interface HostFileSelection { extensions?: string[]; startPath?: string; }
export interface HostOpenRequest { path: string; kind: 'dashboard' | 'file'; target?: 'tab' | 'window'; }
export interface HostNotification { message: string; level?: 'info' | 'success' | 'error'; }
export interface HostAdapters {
    selectFile?(request: HostFileSelection, signal?: AbortSignal): Promise<string | null>;
    open?(request: HostOpenRequest, signal?: AbortSignal): void | Promise<void>;
    notify?(request: HostNotification): void;
    confirm?(message: string): Promise<boolean>;
    enterFullscreen?(): void | Promise<void>;
    exitFullscreen?(): void | Promise<void>;
}
export interface HostOwner {
    panelId: string;
    packageId: string;
    typeId: string;
    surface: HostSurface;
    getSettings(): Settings;
    applySettings(settings: Settings): void;
    validateSettings?: SettingValidators;
    adapters?: HostAdapters;
}
export interface ExtensionHost {
    settings: { patch(changes: Settings, options?: { removeKeys?: string[] }): HostResult<Settings> };
    messages: {
        send(message: HostMessageInput): Promise<HostResult<HostDelivery[]>>;
        subscribe(topic: string, handler: (message: HostMessage) => void | Promise<void>): HostResult<HostHandle>;
    };
    panels: {
        setRangeOverride(panelId: string, request: HostRangeRequest): HostResult<HostHandle>;
        clearRangeOverride(handle: HostHandle): HostResult<void>;
        setOverlay(panelId: string, overlay: HostOverlay): HostResult<HostHandle>;
        clearOverlay(handle: HostHandle): HostResult<void>;
        refresh(panelId: string): HostResult<void>;
    };
    header: { registerActions(actions: HostHeaderAction[]): HostResult<HostHandle> };
    viewport: { enterFullscreen(): Promise<HostResult<void>>; exitFullscreen(): Promise<HostResult<void>> };
    files: { select(request?: HostFileSelection): Promise<HostResult<string | null>> };
    navigation: { open(request: HostOpenRequest): Promise<HostResult<void>> };
    ui: { notify(request: HostNotification): HostResult<void>; confirm(message: string): Promise<HostResult<boolean>> };
}
export interface HostSession { host: ExtensionHost; dispose(): void; }
