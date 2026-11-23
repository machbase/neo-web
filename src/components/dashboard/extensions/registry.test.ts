import * as React from 'react';
import { runScript } from '@/components/side/AppStore/pkgLifecycle/script';
import { listPanelExtensions, loadPanelExtension } from './registry';
import type { ExtensionEntry } from './types';

jest.mock('@/components/side/AppStore/pkgLifecycle/script', () => ({ runScript: jest.fn() }));
const mockActivate = jest.fn();
jest.mock('blob:registered-panel', () => ({ activate: (...args: unknown[]) => mockActivate(...args) }), { virtual: true });
const entry: ExtensionEntry = { packageId: 'example/player', typeId: 'video', label: 'Video', contractVersion: 1, revision: 'installed-1', moduleId: 3 };
const View = () => null;
const Editor = () => null;
const Options = () => null;
const definition = { typeId: 'video', label: 'Video', settingsVersion: 1, defaults: { camera: 'front' }, View, Editor, Options };
function rows(value: unknown) { jest.mocked(runScript).mockResolvedValue({ ok: true, log: JSON.stringify(value) }); }

beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:registered-panel');
    URL.revokeObjectURL = jest.fn();
});

it('lists installed records and excludes malformed module references', async () => {
    const other = { ...entry, typeId: 'events', label: 'Events', moduleId: 8 };
    rows([entry, other, { ...entry, typeId: 'bad', moduleId: -1 }]);
    expect(await listPanelExtensions()).toEqual([entry, other]);
    expect(runScript).toHaveBeenCalledTimes(1);
    expect(jest.mocked(runScript).mock.calls[0][1]).toBeUndefined();
});

it('hides every duplicate identity while keeping other installed types', async () => {
    const other = { ...entry, typeId: 'events' };
    rows([entry, { ...entry, revision: 'conflicting' }, other]);
    expect(await listPanelExtensions()).toEqual([other]);
});

it('binds View, Editor and Options from the registered module with the host React', async () => {
    const before = JSON.stringify(entry);
    rows(['export async function activate(api) {}']);
    mockActivate.mockImplementation((api) => {
        expect(api.React.createElement).toBe(React.createElement);
        expect(api.React.useState).toBe(React.useState);
        api.registerPanelType(definition);
    });
    const result = await loadPanelExtension(entry, [entry]);
    expect(jest.mocked(runScript).mock.calls[0][1]).toEqual({ packageId: entry.packageId, typeId: entry.typeId, revision: entry.revision });
    expect(result.get('video')).toMatchObject({ View, Editor, Options, contractVersion: 1, defaults: { camera: 'front' } });
    expect(JSON.stringify(entry)).toBe(before);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:registered-panel');
});

it('allows one registered module to connect several declared panel types', async () => {
    rows(['registered module']);
    mockActivate.mockImplementation((api) => {
        api.registerPanelType(definition);
        api.registerPanelType({ ...definition, typeId: 'events' });
    });
    expect([...(await loadPanelExtension(entry, [entry, { ...entry, typeId: 'events' }])).keys()]).toEqual(['video', 'events']);
});

it.each(['unregistered', 'other-module', 'other-revision', 'other-package', 'duplicate'])('rejects %s registration and releases its temporary module', async (kind) => {
    rows(['registered module']);
    const extra = { ...entry, typeId: 'events', ...(kind === 'other-module' ? { moduleId: 4 } : {}),
        ...(kind === 'other-revision' ? { revision: 'old' } : {}), ...(kind === 'other-package' ? { packageId: 'another/package' } : {}) };
    mockActivate.mockImplementation((api) => {
        api.registerPanelType(definition);
        api.registerPanelType(kind === 'duplicate' ? definition : { ...definition, typeId: 'events' });
    });
    await expect(loadPanelExtension(entry, kind === 'unregistered' ? [entry] : [entry, extra])).rejects.toThrow('Undeclared or duplicate');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:registered-panel');
});

it.each([{ rows: [] }, { rows: ['source', 'conflict'] }, { rows: [null] }])('does not execute unavailable or ambiguous source: %j', async (input) => {
    rows(input.rows);
    await expect(loadPanelExtension(entry, [entry])).rejects.toThrow('module is unavailable');
    expect(mockActivate).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('propagates a registry read failure without creating a module', async () => {
    jest.mocked(runScript).mockResolvedValue({ ok: false, log: '', reason: 'Registry unavailable' });
    await expect(listPanelExtensions()).rejects.toThrow('Registry unavailable');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});


describe('anonymous public dashboard extensions', () => {
    const publicEntry = { ...entry, moduleUrl: '/public/.dashboard-panels/sample/installed-1/3.js' };
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [publicEntry], text: async () => 'public display module' });
    });
    it('reads only the published display registry without JWT or administrative scripts', async () => {
        expect(await listPanelExtensions(true)).toEqual([publicEntry]);
        expect(fetch).toHaveBeenCalledWith('/public/.dashboard-panels/registry.json', { credentials: 'omit', cache: 'no-store' });
        expect(runScript).not.toHaveBeenCalled();
    });
    it('uses the same React activation and settings checks for the public display module', async () => {
        mockActivate.mockImplementation(api => api.registerPanelType(definition));
        expect((await loadPanelExtension(entry, [entry], true)).get('video')?.View).toBe(View);
        expect(fetch).toHaveBeenLastCalledWith(publicEntry.moduleUrl, { credentials: 'omit', cache: 'no-store' });
        expect(runScript).not.toHaveBeenCalled();
    });
    it.each(['https://elsewhere/module.js', '/web/api/tql', '/public/.dashboard-panels/sample/../private.js', '/public/.dashboard-panels/sample/installed-1/cgi-bin/3.js'])('rejects an unpublished module URL: %s', async moduleUrl => {
        jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [{ ...publicEntry, moduleUrl }] } as Response);
        await expect(loadPanelExtension(entry, [entry], true)).rejects.toThrow('Invalid public dashboard extension URL');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(mockActivate).not.toHaveBeenCalled();
    });
    it('does not fall back to administrator APIs when publication is missing', async () => {
        jest.mocked(fetch).mockResolvedValue({ ok: false } as Response);
        await expect(listPanelExtensions(true)).rejects.toThrow('Could not read public');
        expect(runScript).not.toHaveBeenCalled();
    });
});
