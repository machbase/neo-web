import type { ApplicationHostContext } from '@/extensions/host/types';
import type { HostBorder, HostHandle, HostMessageInput, HostDelivery, HostOverlay, HostOwner, HostRangeRequest, HostResult } from './hostTypes';

export type DashboardRegistrationKind = 'range' | 'overlay' | 'border' | 'actions' | 'listener';

/** Dashboard services supplied to modules, never exposed to package code. */
export interface DashboardHostModuleContext extends ApplicationHostContext {
    owner: HostOwner;
    checkMutation(): HostResult<void>;
    checkDashboard(): HostResult<void>;
    checkTarget(panelId: string, capability: string): HostResult<void>;
    register(kind: DashboardRegistrationKind, target: string, data: unknown): HostHandle;
    upsert(kind: 'range' | 'overlay' | 'border', target: string, data: HostRangeRequest | HostOverlay | HostBorder): HostHandle;
    clear(kind: DashboardRegistrationKind, handle: HostHandle): HostResult<void>;
    send(message: HostMessageInput): Promise<HostResult<HostDelivery[]>>;
    refresh(panelId: string): void;
    notify(): void;
}
