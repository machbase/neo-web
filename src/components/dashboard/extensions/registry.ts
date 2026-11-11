import * as React from 'react';
import { supportsPanelContract } from './contracts';
import { runScript } from '@/components/side/AppStore/pkgLifecycle/script';
import { READ_PANEL_EXTENSIONS } from './registryScript';
import { extensionKey, type ExtensionDefinition, type ExtensionEntry } from './types';
import { validateExtensionSettings } from './settings';

async function readRegistry(params?: Record<string, string>): Promise<unknown[]> {
    const response = await runScript(READ_PANEL_EXTENSIONS, params);
    if (!response.ok) throw new Error(response.reason ?? 'Could not read dashboard extensions.');
    const rows: unknown = JSON.parse(response.log);
    if (!Array.isArray(rows)) throw new Error('Invalid dashboard extension registry.');
    return rows;
}

function isEntry(value: unknown): value is ExtensionEntry {
    if (!value || typeof value !== 'object') return false;
    const entry = value as ExtensionEntry;
    return [entry.packageId, entry.typeId, entry.label, entry.revision].every((field) => typeof field === 'string' && field.length > 0) &&
        Number.isInteger(entry.contractVersion) && Number.isInteger(entry.moduleId) && entry.moduleId >= 0;
}

export async function listPanelExtensions() {
    const entries = (await readRegistry()).filter(isEntry);
    const counts = new Map<string, number>();
    for (const entry of entries) {
        const key = extensionKey(entry);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return entries.filter((entry) => counts.get(extensionKey(entry)) === 1);
}

export async function loadPanelExtension(entry: ExtensionEntry, entries: ExtensionEntry[]): Promise<Map<string, ExtensionDefinition>> {
    const { packageId, typeId, revision, contractVersion } = entry;
    if (!supportsPanelContract(contractVersion)) throw new Error('Unsupported dashboard extension version.');
    const [source, ...duplicates] = await readRegistry({ packageId, typeId, revision });
    if (typeof source !== 'string' || duplicates.length) throw new Error('Dashboard extension module is unavailable.');

    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
        const module = await import(/* @vite-ignore */ url);
        if (typeof module.activate !== 'function') throw new Error('Dashboard extension must export activate.');
        const declared = new Set(entries.filter((item) => item.packageId === packageId && item.revision === revision && item.moduleId === entry.moduleId).map((item) => item.typeId));
        const definitions = new Map<string, ExtensionDefinition>();
        await module.activate({
            React,
            registerPanelType(definition: ExtensionDefinition) {
                if (!declared.has(definition?.typeId) || definitions.has(definition.typeId)) throw new Error('Undeclared or duplicate dashboard panel type.');
                if (!definition.View || !Number.isInteger(definition.settingsVersion) || definition.settingsVersion < 1) {
                    throw new Error('Invalid dashboard panel definition.');
                }
                const { settings } = validateExtensionSettings(definition.defaults);
                if (!settings) throw new Error('Invalid dashboard panel defaults.');
                definitions.set(definition.typeId, { ...definition, defaults: settings, contractVersion });
            },
        });
        return definitions;
    } finally {
        URL.revokeObjectURL(url);
    }
}
