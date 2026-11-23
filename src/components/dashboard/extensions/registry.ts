import { GRID_LAYOUT_COLS } from '@/utils/constants';
import * as React from 'react';
import { supportsPanelContract } from './contracts';
import { runScript } from '@/components/side/AppStore/pkgLifecycle/script';
import { READ_PANEL_EXTENSIONS } from './registryScript';
import { extensionKey, type ExtensionDefinition, type ExtensionEntry } from './types';
import { validateExtensionSettings } from './settings';

async function readRegistry(params?: Record<string, string>, publicView = false): Promise<unknown[]> {
    if (publicView) {
        const response = await fetch('/public/.dashboard-panels/registry.json', { credentials: 'omit', cache: 'no-store' });
        if (!response.ok) throw new Error('Could not read public dashboard extensions.');
        const entries: unknown = await response.json();
        if (!Array.isArray(entries)) throw new Error('Invalid public dashboard extension registry.');
        if (!params) return entries;
        const matching = entries.filter((entry) => isEntry(entry) && entry.packageId === params.packageId && entry.typeId === params.typeId && entry.revision === params.revision);
        if (matching.length !== 1) throw new Error('Public dashboard extension is unavailable.');
        const url: unknown = matching[0].moduleUrl;
        if (typeof url !== 'string' || !/^\/public\/\.dashboard-panels\/[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*\/\d+\.js$/.test(url) || url.includes('..')) {
            throw new Error('Invalid public dashboard extension URL.');
        }
        const module = await fetch(url, { credentials: 'omit', cache: 'no-store' });
        if (!module.ok) throw new Error('Public dashboard extension module is unavailable.');
        return [await module.text()];
    }
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

export async function listPanelExtensions(publicView = false) {
    const entries = (await readRegistry(undefined, publicView)).filter(isEntry);
    const counts = new Map<string, number>();
    for (const entry of entries) {
        const key = extensionKey(entry);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return entries.filter((entry) => counts.get(extensionKey(entry)) === 1);
}

export async function loadPanelExtension(entry: ExtensionEntry, entries: ExtensionEntry[], publicView = false): Promise<Map<string, ExtensionDefinition>> {
    const { packageId, typeId, revision, contractVersion } = entry;
    if (!supportsPanelContract(contractVersion)) throw new Error('Unsupported dashboard extension version.');
    const [source, ...duplicates] = await readRegistry({ packageId, typeId, revision }, publicView);
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
                const width = definition.defaultWidth;
                if (width !== undefined && (!Number.isInteger(width) || width < 1 || width > GRID_LAYOUT_COLS)) throw new Error('Invalid dashboard panel width.');
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
