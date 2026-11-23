import { applicationHostModules } from './applicationModules';
import { createHostApi, defineHostMethods } from './modules';
import { failure, success } from './results';
import type { ApplicationHostContext, HostResult } from './types';

interface DocumentContext extends ApplicationHostContext {
    editable: boolean;
    readSelection(): string[];
    replaceSelection(selection: string[]): void;
}

const method = defineHostMethods<DocumentContext>();
const documentsModule = {
    readSelection: method({
        create: (context) => (): HostResult<string[]> => {
            const guard = context.checkActive();
            return guard.ok ? success([...context.readSelection()]) : guard;
        },
    }),
    replaceSelection: method({
        create: (context) => (selection: string[]): HostResult<void> => {
            const guard = context.checkActive();
            if (!guard.ok) return guard;
            if (!context.editable) return failure('UNSUPPORTED', 'This document is read-only.');
            context.replaceSelection([...selection]);
            return success(undefined);
        },
    }),
};
const modules = { ...applicationHostModules, documents: documentsModule };

function documentContext(editable = true) {
    const abort = new AbortController();
    let selection = ['original'];
    const context: DocumentContext = {
        surface: 'document', editable, signal: abort.signal,
        checkActive: () => abort.signal.aborted ? failure('DISPOSED', 'This document has closed.') : success(undefined),
        readSelection: () => selection,
        replaceSelection: (next) => { selection = next; },
        adapters: { notify: jest.fn(), selectFile: jest.fn(async () => 'notes.md') },
    };
    const host = createHostApi<DocumentContext, typeof modules>(modules, context);
    return { context, host, close: () => abort.abort() };
}

it('adds a typed API outside dashboards and reuses application modules without board or panel services', async () => {
    const first = documentContext();
    const second = documentContext();
    expect(first.host.documents.replaceSelection(['updated']).ok).toBe(true);
    const snapshot = first.host.documents.readSelection();
    expect(snapshot).toEqual(success(['updated']));
    if (snapshot.ok) snapshot.value.push('caller mutation');
    expect(first.host.documents.readSelection()).toEqual(success(['updated']));
    expect(second.host.documents.readSelection()).toEqual(success(['original']));
    expect(first.host.ui.notify({ message: 'Saved' }).ok).toBe(true);
    expect(first.context.adapters!.notify).toHaveBeenCalledWith({ message: 'Saved' });
    expect(await first.host.files.select()).toEqual(success('notes.md'));
});

it('derives the callable type from an added module without a separate API declaration', () => {
    const { context } = documentContext();
    const extended = {
        ...modules,
        inspector: {
            selectedCount: method({ create: (services) => (): HostResult<number> => success(services.readSelection().length) }),
        },
    };
    const host = createHostApi<DocumentContext, typeof extended>(extended, context);
    expect(host.inspector.selectedCount()).toEqual(success(1));
    expect('inspector' in createHostApi(modules, context)).toBe(false);
});

it('enforces read-only rules inside the area API and rejects unsupported adapters without changing its data', async () => {
    const { host } = documentContext(false);
    expect(host.documents.replaceSelection(['unexpected'])).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    expect(host.documents.readSelection()).toEqual(success(['original']));
    expect(await host.navigation.open({ path: 'notes.md', kind: 'file' })).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
});

it('uses the area lifetime to reject late adapter results and later calls while preserving another area instance', async () => {
    const first = documentContext();
    const second = documentContext();
    let finish!: (path: string | null) => void;
    first.context.adapters!.selectFile = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
    const pending = first.host.files.select();
    expect(first.context.adapters!.selectFile).toHaveBeenCalledWith({}, first.context.signal);
    first.close();
    finish('late.md');
    expect(await pending).toMatchObject({ ok: false, error: { code: 'DISPOSED' } });
    expect(first.host.ui.notify({ message: 'Late' })).toMatchObject({ ok: false, error: { code: 'DISPOSED' } });
    expect(first.context.adapters!.notify).not.toHaveBeenCalled();
    expect(first.host.documents.readSelection()).toMatchObject({ ok: false, error: { code: 'DISPOSED' } });
    expect(second.host.documents.readSelection()).toEqual(success(['original']));
});

it('calls gesture-dependent adapters before returning the promise and contains adapter failures', async () => {
    const { context, host } = documentContext();
    const enter = jest.fn(() => { throw new Error('Denied by browser'); });
    context.adapters!.enterFullscreen = enter;
    const pending = host.viewport.enterFullscreen();
    expect(enter).toHaveBeenCalledTimes(1);
    expect(await pending).toMatchObject({ ok: false, error: { code: 'ADAPTER_ERROR' } });
});

it('validates module names before creating any API, preventing reserved keys and partial setup', () => {
    const { context } = documentContext();
    const create = jest.fn(() => () => success(undefined));
    const invalid = {
        valid: { read: { create } },
        constructor: { read: { create } },
    };
    expect(() => createHostApi(invalid, context)).toThrow('Invalid host API name: constructor');
    expect(create).not.toHaveBeenCalled();
});
