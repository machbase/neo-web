export type Settings = Record<string, unknown>;
export type SettingErrors = Record<string, string>;
export type SettingValidators = Record<string, (value: unknown, settings: Settings) => string | undefined>;

function isPlainObject(value: unknown): value is Settings {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function jsonError(value: unknown, path: string, ancestors: Set<object>): string | undefined {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return;
    if (value instanceof Date) return `${path} must be a date string.`;

    if ((Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype) || isPlainObject(value)) {
        if (ancestors.has(value)) return `${path} contains a circular reference.`;
        ancestors.add(value);
        try {
            const keys = Reflect.ownKeys(value);
            if (Array.isArray(value) && keys.length !== value.length + 1) return `${path} must be an array without empty slots or extra fields.`;
            for (const key of keys) {
                if (Array.isArray(value) && key === 'length') continue;
                if (typeof key !== 'string' || (Array.isArray(value) && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) {
                    return `${path} contains a field that cannot be saved as JSON.`;
                }
                const childPath = `${path}[${JSON.stringify(key)}]`;
                const descriptor = Object.getOwnPropertyDescriptor(value, key);
                if (!descriptor?.enumerable || !('value' in descriptor)) return `${childPath} must be a JSON value.`;
                const error = jsonError(descriptor.value, childPath, ancestors);
                if (error) return error;
            }
        } finally {
            ancestors.delete(value);
        }
        return;
    }

    return `${path} must be a JSON value.`;
}

export function validateExtensionSettings(
    draft: unknown,
    validators?: SettingValidators
): { settings?: Settings; settingErrors: SettingErrors; error?: string } {
    const settingErrors: SettingErrors = Object.create(null);
    if (!isPlainObject(draft)) return { settingErrors, error: 'Panel settings must be a JSON object.' };

    for (const key of Reflect.ownKeys(draft)) {
        if (typeof key !== 'string') return { settingErrors, error: 'Panel setting names must be strings.' };
        const path = `settings[${JSON.stringify(key)}]`;
        const descriptor = Object.getOwnPropertyDescriptor(draft, key);
        let error: string | undefined;
        try {
            error = descriptor?.enumerable && 'value' in descriptor ? jsonError(descriptor.value, path, new Set([draft])) : `${path} must be a JSON value.`;
        } catch {
            error = `${path} cannot be checked as a JSON value.`;
        }
        if (error) settingErrors[key] = error;
    }
    if (Object.keys(settingErrors).length) return { settingErrors };

    const serialized = JSON.stringify(draft);
    const validationDraft = JSON.parse(serialized, (_key, value) =>
        value && typeof value === 'object' ? Object.freeze(value) : value
    ) as Settings;
    for (const [key, validate] of Object.entries(validators ?? {})) {
        try {
            const error = validate(Object.prototype.hasOwnProperty.call(validationDraft, key) ? validationDraft[key] : undefined, validationDraft);
            if (typeof error === 'string' && error) settingErrors[key] = error;
        } catch {
            settingErrors[key] = 'The extension could not validate this setting.';
        }
    }

    return Object.keys(settingErrors).length ? { settingErrors } : { settings: JSON.parse(serialized), settingErrors };
}
