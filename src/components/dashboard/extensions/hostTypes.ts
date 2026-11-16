import type { ReactNode } from 'react';
import type { Settings, SettingValidators } from './settings';
import type { HostAdapters } from '@/extensions/host/types';
import type { HostFromModules } from '@/extensions/host/modules';
import type { dashboardHostModules } from './hostModules';
export type { HostErrorCode, HostResult, HostHandle, HostFileSelection, HostOpenRequest, HostNotification, HostAdapters } from '@/extensions/host/types';

export type HostSurface = 'dashboard' | 'preview' | 'editor' | 'options';
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
    editing?: boolean;
    refresh?: HostRefresh;
}
export interface ExtensionContext {
    board: { id: string; editing: boolean };
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
    capabilities: { contractVersion: 1 };
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
export interface HostBorder { color: string; }
export const HOST_HEADER_MENU_IDS = ['setting', 'zoom', 'duplicate', 'taganalyzer', 'download-data', 'delete', 'save-tql'] as const;
export type HostHeaderMenuId = typeof HOST_HEADER_MENU_IDS[number];
export type HostHeaderPosition = ({ before: HostHeaderMenuId; after?: never } | { after: HostHeaderMenuId; before?: never }) & {
    /** Lower safe integers appear first in the same position group; default 0. Negative values are allowed; ties retain registration order. */
    priority?: number;
};
export interface HostHeaderAction {
    id: string;
    label: string;
    icon?: ReactNode;
    /**
     * Place beside one built-in menu ID using exactly one of before/after, with priority inside this object.
     * Missing or hidden anchors append by priority, without exposing editing items.
     * Omit to retain the legacy group before built-ins. No start/end positions exist.
     */
    position?: HostHeaderPosition;
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
    border?: HostBorder;
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
export type ExtensionHost = HostFromModules<typeof dashboardHostModules>;
export interface HostSession { host: ExtensionHost; dispose(): void; }
