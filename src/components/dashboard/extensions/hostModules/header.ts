import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import type { HostHandle, HostHeaderAction, HostResult } from '../hostTypes';

const method = defineHostMethods<DashboardHostModuleContext>();

export const headerModule = {
    registerActions: method({
        create: (context) => (actions: HostHeaderAction[]): HostResult<HostHandle> => {
            const guard = context.checkActive();
            if (!guard.ok) return guard;
            if (context.owner.surface !== 'dashboard') return failure('UNSUPPORTED', 'Header actions are available only on dashboard panels.');
            // Check every index, as the JSON setting validator does for arrays.
            // Header actions also contain React nodes and callbacks, so do not JSON-validate them.
            if (!Array.isArray(actions) || Array.from(actions).some((action, index) => !Object.prototype.hasOwnProperty.call(actions, index) || !action || typeof action.id !== 'string' || !action.id || typeof action.label !== 'string' || typeof action.onSelect !== 'function' || (action.checked !== undefined && typeof action.checked !== 'boolean') || (action.disabled !== undefined && typeof action.disabled !== 'boolean')) || new Set(actions.map((action) => action.id)).size !== actions.length) return failure('INVALID_INPUT', 'Header actions need filled array slots, unique IDs, labels, boolean states and callbacks.');
            return success(context.register('actions', context.owner.panelId, actions.map((action) => ({ ...action }))));
        },
    }),
};
