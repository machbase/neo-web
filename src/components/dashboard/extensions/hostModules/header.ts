import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import { HOST_HEADER_MENU_IDS } from '../hostTypes';
import type { HostHandle, HostHeaderAction, HostHeaderMenuId, HostHeaderPosition, HostResult } from '../hostTypes';
import { validateExtensionSettings } from '@/extensions/settings';

const method = defineHostMethods<DashboardHostModuleContext>();

function validPosition(position: unknown): position is HostHeaderPosition | undefined {
    if (position === undefined) return true;
    if (!position || typeof position !== 'object' || Array.isArray(position) || !validateExtensionSettings({ position }).settings) return false;
    const keys = Object.keys(position);
    const anchors = keys.filter(key => key === 'before' || key === 'after');
    if (anchors.length !== 1 || keys.some(key => !['before', 'after', 'priority'].includes(key))) return false;
    const record = position as Record<string, unknown>, anchor = record[anchors[0]];
    return typeof anchor === 'string' && HOST_HEADER_MENU_IDS.includes(anchor as HostHeaderMenuId) && (record.priority === undefined || Number.isSafeInteger(record.priority));
}

export const headerModule = {
    registerActions: method({
        create: (context) => (actions: HostHeaderAction[]): HostResult<HostHandle> => {
            const guard = context.checkActive();
            if (!guard.ok) return guard;
            if (context.owner.surface !== 'dashboard') return failure('UNSUPPORTED', 'Header actions are available only on dashboard panels.');
            // Check every index, as the JSON setting validator does for arrays.
            // Actions contain React nodes and callbacks; only their position uses the shared JSON validator.
            if (!Array.isArray(actions) || Array.from(actions).some((action, index) => !Object.prototype.hasOwnProperty.call(actions, index) || !action || typeof action.id !== 'string' || !action.id || typeof action.label !== 'string' || typeof action.onSelect !== 'function' || Object.prototype.hasOwnProperty.call(action, 'index') || Object.prototype.hasOwnProperty.call(action, 'priority') || !validPosition(action.position) || (action.checked !== undefined && typeof action.checked !== 'boolean') || (action.disabled !== undefined && typeof action.disabled !== 'boolean')) || new Set(actions.map((action) => action.id)).size !== actions.length) return failure('INVALID_INPUT', 'Header actions need filled array slots, unique IDs, labels, boolean states, callbacks and an optional before/after position containing a safe integer priority; absolute index and top-level priority are unsupported.');
            return success(context.register('actions', context.owner.panelId, actions.map((action) => ({ ...action, ...(action.position ? { position: { ...action.position } } : {}) }))));
        },
    }),
};
