import { defineHostMethods } from '@/extensions/host/modules';
import { failure, success } from '@/extensions/host/results';
import type { DashboardHostModuleContext } from '../hostModuleContext';
import { validateExtensionSettings } from '@/extensions/settings';
import type { Settings } from '@/extensions/settings';
import type { HostResult } from '../hostTypes';

const method = defineHostMethods<DashboardHostModuleContext>();
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const settingsModule = {
    patch: method({
        create: (context) => (changes: Settings, options?: { removeKeys?: string[] }): HostResult<Settings> => {
            const guard = context.checkMutation();
            if (!guard.ok) return guard;
            try {
                const incoming = validateExtensionSettings(changes);
                if (!incoming.settings) return { ok: false, error: { code: 'INVALID_INPUT', message: incoming.error ?? 'Invalid settings patch.', settingErrors: incoming.settingErrors } };
                const removal = validateExtensionSettings({ removeKeys: options?.removeKeys === undefined ? [] : options.removeKeys });
                const removeKeys = removal.settings?.removeKeys;
                if (!Array.isArray(removeKeys) || removeKeys.some((key) => typeof key !== 'string')) return failure('INVALID_INPUT', 'Settings removal keys must be a JSON array of strings without empty slots.');
                const next = { ...context.owner.getSettings(), ...incoming.settings };
                for (const key of removeKeys) delete next[key];
                const checked = validateExtensionSettings(next, context.owner.surface === 'dashboard' ? context.owner.validateSettings : undefined);
                if (!checked.settings) return { ok: false, error: { code: 'INVALID_INPUT', message: checked.error ?? 'Panel settings are invalid.', settingErrors: checked.settingErrors } };
                context.owner.applySettings(checked.settings);
                context.notify();
                return success(copy(checked.settings));
            } catch { return failure('INVALID_INPUT', 'Panel settings could not be updated.'); }
        },
    }),
};
