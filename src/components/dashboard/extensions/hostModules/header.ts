import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import { HOST_HEADER_MENU_IDS } from '../hostTypes';
import type { HostHandle, HostHeaderAction, HostHeaderMenuId, HostHeaderPosition, HostResult } from '../hostTypes';
import { validateExtensionSettings } from '@/extensions/settings';

const method = defineHostMethods<DashboardHostModuleContext>();
const invalidActions = () => failure('INVALID_INPUT', 'Header actions need filled array slots, unique IDs, labels, boolean states, callbacks and an optional before/after position containing a safe integer priority; absolute index and top-level priority are unsupported.');

function normalizePosition(position: unknown): HostHeaderPosition | undefined | null {
    if (position === undefined) return undefined;
    try {
        if (!position || typeof position !== 'object' || Array.isArray(position)) return null;
        // Copy descriptors so normalization never mutates the caller or invokes metadata getters.
        const descriptors = Object.getOwnPropertyDescriptors(position), priority = descriptors.priority;
        if (priority && !('value' in priority)) return null;
        const value = priority?.value;
        descriptors.priority = {
            ...(priority ?? { enumerable: true, configurable: true, writable: true }),
            value: value === undefined || Object.is(value, -0) ? 0 : value,
        };
        const normalized = Object.create(Object.getPrototypeOf(position), descriptors);
        // Default optional priority before the shared JSON validator checks the remaining metadata.
        if (!validateExtensionSettings({ position: normalized }).settings) return null;
        const keys = Object.keys(normalized), anchors = keys.filter(key => key === 'before' || key === 'after');
        if (anchors.length !== 1 || keys.some(key => !['before', 'after', 'priority'].includes(key))) return null;
        const anchor = normalized[anchors[0]];
        if (typeof anchor !== 'string' || !HOST_HEADER_MENU_IDS.includes(anchor as HostHeaderMenuId) || !Number.isSafeInteger(normalized.priority)) return null;
        return normalized as HostHeaderPosition;
    } catch {
        return null;
    }
}

export const headerModule = {
    registerActions: method({
        create: (context) => (actions: HostHeaderAction[]): HostResult<HostHandle> => {
            const guard = context.checkActive();
            if (!guard.ok) return guard;
            if (context.owner.surface !== 'dashboard') return failure('UNSUPPORTED', 'Header actions are available only on dashboard panels.');
            if (!Array.isArray(actions)) return invalidActions();
            const registered: HostHeaderAction[] = [], ids = new Set<string>();
            // Validate the complete registration before publishing any item or notifying observers.
            for (let index = 0; index < actions.length; index++) {
                const action = actions[index];
                if (!Object.prototype.hasOwnProperty.call(actions, index) || !action || typeof action.id !== 'string' || !action.id || ids.has(action.id) || typeof action.label !== 'string' || typeof action.onSelect !== 'function' || Object.prototype.hasOwnProperty.call(action, 'index') || Object.prototype.hasOwnProperty.call(action, 'priority') || (action.checked !== undefined && typeof action.checked !== 'boolean') || (action.disabled !== undefined && typeof action.disabled !== 'boolean')) return invalidActions();
                const position = normalizePosition(action.position);
                if (position === null) return invalidActions();
                ids.add(action.id);
                registered.push({ ...action, ...(position ? { position } : {}) });
            }
            return success(context.register('actions', context.owner.panelId, registered));
        },
    }),
};
