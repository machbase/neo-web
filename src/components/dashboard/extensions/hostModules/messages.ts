import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import { validateExtensionSettings } from '@/extensions/settings';
import type { HostHandle, HostMessage, HostMessageInput, HostDelivery, HostResult } from '../hostTypes';

const method = defineHostMethods<DashboardHostModuleContext>();

export const messagesModule = {
    subscribe: method({
        create: (context) => (topic: string, handler: (message: HostMessage) => void | Promise<void>): HostResult<HostHandle> => {
            const guard = context.checkDashboard();
            if (!guard.ok) return guard;
            if (typeof topic !== 'string' || !topic.includes('/') || typeof handler !== 'function') return failure('INVALID_INPUT', 'A namespaced topic and handler are required.');
            return success(context.register('listener', context.owner.panelId, { topic, handler }));
        },
    }),
    send: method({
        create: (context) => (message: HostMessageInput): Promise<HostResult<HostDelivery[]>> => {
            const checked = validateExtensionSettings({ message });
            if (!checked.settings) return Promise.resolve(failure('INVALID_INPUT', 'Messages must contain JSON values.'));
            const safeMessage = checked.settings.message as HostMessageInput;
            return context.send(safeMessage);
        },
    }),
};
