import { StrictMode, useRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { getFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { IMAGE_EXTENSION_LIST } from '@/utils/constants';
import { HostBoardProvider, useExtensionHost, useHostActions, useHostBoard, isSelectableHostFile, hostPanelInfo } from './HostReact';
import { ExtensionFields, ExtensionView, PanelExtensionProvider } from './ExtensionPanels';
import { listPanelExtensions, loadPanelExtension } from './registry';
import type { ExtensionHost } from './hostTypes';
import type { ExtensionDefinition } from './types';
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/utils/CheckDataCompatibility', () => ({ CheckDataCompatibility: (text: string, extension: string) => extension === 'wrk'
    ? jest.requireActual('@/utils/CheckDataCompatibility').CheckDataCompatibility(text, extension) : JSON.parse(text) }));
jest.mock('./registry', () => ({ listPanelExtensions: jest.fn(), loadPanelExtension: jest.fn() }));
jest.mock('@/assets/icons/Icon', () => ({ TreeFolder: () => <span>folder</span> }));
jest.mock('@/design-system/components', () => {
    const Block = ({ children }: any) => <div>{children}</div>;
    return { Button: ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
        Modal: { Root: Block, Header: Block, Title: Block, Close: () => null, Body: Block, Footer: Block },
        Toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() } };
});
const hosts = new Map<string, ExtensionHost>();
it.each(['Adv scatter', 'Liquid fill'])('advertises refresh and range for the existing %s panel spelling', (type) => {
    expect(hostPanelInfo({ id: 'native', type }).capabilities).toEqual(expect.arrayContaining(['refresh', 'range:time']));
});
const panel = { id: 'extension-a', type: 'Extension', title: 'Extension A', x: 1, y: 2, w: 6, h: 4,
    extension: { packageId: 'test/pkg', typeId: 'player', settingsVersion: 1, settings: { source: { camera: 'a', serverId: 's' }, keep: 7 } } };
const other = { id: 'chart-b', type: 'Line', title: 'Chart B', x: 8, y: 2, w: 6, h: 4, chartOptions: { retained: true } };
const board: any = { id: 'board-a', name: 'board.dsh', path: '/', savedCode: 'original-bytes', dashboard: { panels: [panel, other], custom: { retained: true } } };
const definition: ExtensionDefinition = { contractVersion: 1, typeId: 'player', label: 'Player', settingsVersion: 1, defaults: {},
    validateSettings: { keep: (value) => typeof value === 'number' && value > 0 ? undefined : 'Must be positive' }, View: () => null };
function Owner({ surface = 'dashboard' }: { surface?: 'dashboard' | 'preview' | 'editor' | 'options' }) {
    const list = useRecoilValue(gBoardList); const p = list[0].dashboard.panels[0];
    const [draft, setDraft] = useState(p.extension.settings);
    const bound = useExtensionHost({ panel: p, definition, surface, settings: surface === 'dashboard' ? p.extension.settings : draft, onReplaceSettings: setDraft });
    if (bound.host) hosts.set(surface, bound.host);
    return <div ref={bound.rootRef}><pre data-testid={'context-' + surface}>{JSON.stringify(bound.context)}</pre><pre data-testid={'draft-' + surface}>{JSON.stringify(draft)}</pre></div>;
}
function Inspector() { return <pre data-testid="boards">{JSON.stringify(useRecoilValue(gBoardList))}</pre>; }
function Provider({ children }: any) {
    const list = useRecoilValue(gBoardList);
    return <HostBoardProvider boardInfo={list[0]} timeRange={{ start: 100, end: 200 }} active>{children}<Inspector /></HostBoardProvider>;
}
function setup(children: any, strict = false) {
    hosts.clear(); const body = <RecoilRoot initializeState={({ set }) => set(gBoardList, [JSON.parse(JSON.stringify(board))])}><Provider>{children}</Provider></RecoilRoot>;
    return render(strict ? <StrictMode>{body}</StrictMode> : body);
}
async function host(surface = 'dashboard') { await waitFor(() => expect(hosts.has(surface)).toBe(true)); return hosts.get(surface)!; }
beforeEach(() => { jest.clearAllMocks(); });
it('validates live patch and preserves unrelated data and saved bytes', async () => {
    setup(<Owner />); const api = await host();
    act(() => { expect(api.settings.patch({ keep: -1 }).ok).toBe(false); });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)[0]).toEqual(board);
    act(() => { expect(api.settings.patch({ keep: 8 }).ok).toBe(true); expect(api.settings.patch({ extra: 'next' }).ok).toBe(true); });
    const current = JSON.parse(screen.getByTestId('boards').textContent!)[0];
    expect(current.dashboard.panels[0].extension.settings).toEqual({ ...panel.extension.settings, keep: 8, extra: 'next' });
    expect(current.dashboard.panels[1]).toEqual(other); expect(current.dashboard.custom).toEqual(board.dashboard.custom);
    expect(current.savedCode).toBe('original-bytes'); expect(board.dashboard.panels[0].extension.settings.keep).toBe(7);
});
it('isolates preview mutations and gives editor a complete panel list', async () => {
    setup(<><Owner surface="preview" /><Owner surface="editor" /></>);
    const preview = await host('preview'); const editor = await host('editor');
    act(() => {
        expect(preview.settings.patch({ keep: 9 }).ok).toBe(false);
        expect(preview.panels.refresh('chart-b').ok).toBe(false);
        expect(preview.panels.setOverlay('chart-b', { id: 'line', kind: 'line', axis: 'x', value: 150 }).ok).toBe(false);
        expect(editor.settings.patch({ keep: -1 }).ok).toBe(true);
    });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)[0]).toEqual(board);
    expect(JSON.parse(screen.getByTestId('draft-editor').textContent!).keep).toBe(-1);
    expect(JSON.parse(screen.getByTestId('context-editor').textContent!).panels.map((p: any) => p.id)).toEqual(expect.arrayContaining(['extension-a', 'chart-b']));
});
it('keeps StrictMode host usable and rejects calls after unmount', async () => {
    const view = setup(<Owner />, true); const api = await host();
    act(() => { expect(api.settings.patch({ keep: 9 }).ok).toBe(true); });
    view.unmount(); expect(api.settings.patch({ keep: 10 })).toMatchObject({ ok: false, error: { code: 'DISPOSED' } });
});
it('selects real list entries with case-insensitive extensions and excludes folders', async () => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [
        { name: '1.dsh', isDir: false }, { name: '3.DSH', isDir: false }, { name: '4.dsh', isDir: true }, { name: 'other.csv', isDir: false },
    ] } } as any);
    setup(<Owner />); const api = await host(); let result: any;
    act(() => { void api.files.select({ extensions: ['dsh'] }).then((value) => { result = value; }); });
    fireEvent.click(await screen.findByRole('button', { name: '3.DSH' }));
    await waitFor(() => expect(result).toEqual({ ok: true, value: '3.DSH' }));
    expect(isSelectableHostFile({ name: '4.dsh', isDir: true }, ['dsh'])).toBe(false);
    expect(isSelectableHostFile({ name: 'other.dsh.bak', isDir: false }, ['dsh'])).toBe(false);
    expect(screen.queryByRole('button', { name: 'other.csv' })).toBeNull();
});
it('cancels a pending picker when its owner exits', async () => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [] } } as any);
    function Toggle() { const [on, setOn] = useState(true); return <><button onClick={() => setOn(false)}>Remove owner</button>{on && <Owner />}</>; }
    setup(<Toggle />); const api = await host(); let result: any;
    act(() => { void api.files.select().then((value) => { result = value; }); });
    await screen.findByText('Select file'); fireEvent.click(screen.getByText('Remove owner'));
    await waitFor(() => expect(result).toMatchObject({ ok: false, error: { code: 'DISPOSED' } }));
    expect(screen.queryByText('Select file')).toBeNull();
});
it('shares the latest draft between Editor and Options without losing same-turn patches', async () => {
    function Field(props: any) { hosts.set(props.context.surface, props.host); return <pre data-testid={props.context.surface}>{JSON.stringify(props.settings)}</pre>; }
    const fieldsDefinition = { ...definition, Editor: Field, Options: Field };
    function Draft() {
        const [settings, setSettings] = useState<any>({ keep: 7 }); const latest = useRef(settings); latest.current = settings;
        const common = { definition: fieldsDefinition, panel, settings, settingErrors: {},
            getSettings: () => latest.current, onReplaceSettings: (next: any) => { latest.current = next; setSettings(next); } };
        return <><ExtensionFields area="Editor" {...common} /><ExtensionFields area="Options" {...common} /></>;
    }
    setup(<Draft />); const editor = await host('editor'); const options = await host('options');
    act(() => { editor.settings.patch({ a: 1 }); options.settings.patch({ b: 2 }); });
    expect(JSON.parse(screen.getByTestId('editor').textContent!)).toEqual({ keep: 7, a: 1, b: 2 });
    expect(JSON.parse(screen.getByTestId('options').textContent!)).toEqual({ keep: 7, a: 1, b: 2 });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)[0]).toEqual(board);
});
it.each([0, 2, 3])('rejects contract v%i without running the extension or changing saved data', async (version) => {
    const before = JSON.stringify(board);
    jest.mocked(listPanelExtensions).mockResolvedValue([{ packageId: 'test/pkg', typeId: 'player', label: 'Player', contractVersion: version, revision: 'r1', moduleId: 0 }]);
    setup(<PanelExtensionProvider enabled><ExtensionView data={panel.extension} panel={panel} mode="dashboard" timeRange={{ start: 100, end: 200 }} distanceRange={{ start: '', end: '' }} title="Extension A" /></PanelExtensionProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported dashboard extension version.');
    expect(loadPanelExtension).not.toHaveBeenCalled();
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    expect(JSON.stringify(board)).toBe(before);
});
it('exposes settings, context and host as the only View props', async () => {
    const receive = jest.fn();
    const View = (props: any) => { receive(props); return <span>API-only View</span>; };
    const entry = { packageId: 'test/pkg', typeId: 'player', label: 'Player', contractVersion: 1, revision: 'r1', moduleId: 0 };
    jest.mocked(listPanelExtensions).mockResolvedValue([entry]);
    jest.mocked(loadPanelExtension).mockResolvedValue(new Map([['player', { ...definition, View }]]));
    setup(<PanelExtensionProvider enabled><ExtensionView data={panel.extension} panel={panel} mode="dashboard" timeRange={{ start: 100, end: 200 }} distanceRange={{ start: '', end: '' }} title="Extension A" /></PanelExtensionProvider>);
    await screen.findByText('API-only View');
    const props = receive.mock.calls.at(-1)![0];
    expect(Object.keys(props).sort()).toEqual(['context', 'host', 'settings']);
    expect(props.host.settings.patch).toEqual(expect.any(Function));
    expect(props.context.surface).toBe('dashboard');
    expect(props.context.capabilities.contractVersion).toBe(1);
    expect(props.context.panel.title).toBe('Extension A');
    expect(props.context.ranges.panelTime).toEqual({ start: 100, end: 200 });
});
it('registers and removes only the owner header actions', async () => {
    function Header() { const actions = useHostActions('extension-a'); return <>{actions.map((action) => <button key={action.id} onClick={action.onSelect}>{action.label}</button>)}</>; }
    setup(<><Owner /><Header /></>); const api = await host(); const click = jest.fn(); let handle: any;
    act(() => { const result = api.header.registerActions([{ id: 'play', label: 'Play this owner', onSelect: click }]); if (result.ok) handle = result.value; });
    fireEvent.click(screen.getByText('Play this owner')); expect(click).toHaveBeenCalledTimes(1);
    act(() => { handle.dispose(); }); expect(screen.queryByText('Play this owner')).toBeNull();
});
it('invalidates only the selected execution and keeps saved ids unchanged', () => {
    function Revisions() { const context = useHostBoard()!; return <><button onClick={() => context.invalidatePanel('extension-a')}>Edit one</button><pre data-testid="revisions">{JSON.stringify(context.executionRevisions)}</pre></>; }
    setup(<Revisions />); fireEvent.click(screen.getByText('Edit one'));
    expect(JSON.parse(screen.getByTestId('revisions').textContent!)).toEqual({ 'extension-a': 1 });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)[0]).toEqual(board);
});
it('does not open a tab when an asynchronous file read finishes after the owner exits', async () => {
    let complete!: (value: any) => void; jest.mocked(getFiles).mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    function Toggle() { const [on, setOn] = useState(true); return <><button onClick={() => setOn(false)}>Remove owner</button>{on && <Owner />}</>; }
    setup(<Toggle />); const api = await host(); let result: any;
    act(() => { void api.navigation.open({ kind: 'file', path: 'note.sql' }).then((value) => { result = value; }); });
    fireEvent.click(screen.getByText('Remove owner'));
    await act(async () => { complete('SELECT 1'); });
    await waitFor(() => expect(result).toMatchObject({ ok: false, error: { code: 'DISPOSED' } }));
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});
it.each([{ isDir: true }, { type: 'dir' }])('accepts an empty directory without children: %j', async (metadata) => {
    // Neo 8.5.13 omits children for empty directories.
    jest.mocked(getFileList).mockResolvedValue({ success: true, reason: 'success', elapse: '1ms', data: { name: '02.dsh', gitClone: false, ...metadata } } as any);
    setup(<Owner />); const api = await host();
    await act(async () => { void api.files.select({ extensions: ['dsh'], startPath: '02.dsh' }); });
    expect(screen.getByText('/02.dsh')).toBeTruthy(); expect(screen.queryByRole('alert')).toBeNull();
    expect(jest.mocked(getFileList)).toHaveBeenCalledWith('', '02.dsh/', '');
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});
it.each([
    { success: false, reason: 'read failed', data: { isDir: true, children: [] } },
    { success: true, data: { name: '02.dsh', isDir: false } },
    { success: true, data: { name: '02.dsh', isDir: true, children: null } },
])('rejects failure, file and malformed responses: %j', async (response) => {
    jest.mocked(getFileList).mockResolvedValue(response as any);
    setup(<Owner />); const api = await host();
    await act(async () => { void api.files.select({ startPath: '02.dsh' }); });
    expect(screen.getByRole('alert').textContent).toBe('Could not read files.');
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});
it('opens uppercase dashboard files through the existing raw-text read option', async () => {
    jest.mocked(getFiles).mockResolvedValue(JSON.stringify({ dashboard: { panels: [] } }) as any);
    setup(<Owner />); const api = await host(); let result: any;
    await act(async () => { result = await api.navigation.open({ kind: 'dashboard', path: 'another.DSH' }); });
    expect(result.ok).toBe(true);
    expect(jest.mocked(getFiles)).toHaveBeenCalledWith('/another.DSH', { rawText: true });
});

const worksheetSection = { id: 'section-1', type: 'sql', contents: 'SELECT COUNT(*) FROM SENSOR', height: 200, unknownField: 'keep' };
const worksheetFormats: [string, (sections: any[]) => unknown][] = [
    ['data wrapper', (sections) => ({ data: sections })],
    ['sheet wrapper', (sections) => ({ sheet: sections })],
    ['legacy array', (sections) => sections],
];
describe.each([false, true])('worksheet navigation with experimentMode=%s', (experiment) => {
    beforeEach(() => localStorage.setItem('experimentMode', JSON.stringify(experiment)));
    afterEach(() => localStorage.removeItem('experimentMode'));
    it.each(worksheetFormats)('loads %s through the real compatibility parser', async (_name, wrap) => {
        const original = '  ' + JSON.stringify(wrap([worksheetSection]), null, 2) + '\n';
        jest.mocked(getFiles).mockResolvedValue(original as any);
        setup(<Owner />); const api = await host(); let result: any;
        await act(async () => { result = await api.navigation.open({ kind: 'file', path: 'saved.wrk' }); });
        expect(result).toMatchObject({ ok: true });
        const boards = JSON.parse(screen.getByTestId('boards').textContent!);
        expect(boards[0]).toEqual(board);
        expect(boards[1]).toMatchObject({ type: 'wrk', name: 'saved.wrk', path: '/', code: '', sheet: [worksheetSection], savedCode: JSON.stringify([worksheetSection]) });
        expect(jest.mocked(getFiles)).toHaveBeenCalledWith('/saved.wrk', { rawText: true });
        expect(original).toBe('  ' + JSON.stringify(wrap([worksheetSection]), null, 2) + '\n');
    });
    it.each(worksheetFormats)('accepts an empty %s without treating it as missing worksheet data', async (_name, wrap) => {
        jest.mocked(getFiles).mockResolvedValue(JSON.stringify(wrap([])) as any);
        setup(<Owner />); const api = await host();
        await act(async () => { expect((await api.navigation.open({ kind: 'file', path: 'empty.wrk' })).ok).toBe(true); });
        expect(JSON.parse(screen.getByTestId('boards').textContent!)[1]).toMatchObject({ sheet: [], savedCode: '[]', code: '' });
    });
});
it.each(['{broken', 'null', '{}', '{"data":{}}', '{"data":[null]}', '{"data":[{}]}', '{"sheet":[{"type":"sql","contents":null}]}'])('rejects invalid worksheet input without changing open boards or selection: %s', async (content) => {
    function Selection() { return <span data-testid="selection">{useRecoilValue(gSelectedTab)}</span>; }
    jest.mocked(getFiles).mockResolvedValue(content as any);
    setup(<><Owner /><Selection /></>); const api = await host(); const selected = screen.getByTestId('selection').textContent; let result: any;
    await act(async () => { result = await api.navigation.open({ kind: 'file', path: 'invalid.wrk' }); });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    expect(screen.getByTestId('selection').textContent).toBe(selected);
});
it.each([false, true])('reuses the existing legacy section conversion with experimentMode=%s', async (experiment) => {
    localStorage.setItem('experimentMode', JSON.stringify(experiment));
    try {
        const legacy = { ...worksheetSection, type: 'chat', contents: '# original markdown' };
        const original = JSON.stringify({ sheet: [legacy] });
        jest.mocked(getFiles).mockResolvedValue(original as any);
        setup(<Owner />); const api = await host();
        await act(async () => { expect((await api.navigation.open({ kind: 'file', path: 'legacy.wrk' })).ok).toBe(true); });
        const opened = JSON.parse(screen.getByTestId('boards').textContent!)[1];
        expect(opened.sheet).toEqual([{ ...legacy, type: experiment ? 'chat' : 'markdown' }]);
        expect(opened.savedCode).toBe(JSON.stringify(opened.sheet));
        expect(original).toBe(JSON.stringify({ sheet: [legacy] }));
    } finally { localStorage.removeItem('experimentMode'); }
});

it.each(['../', 'folder/../other', 'folder\\..\\other'])('rejects invalid picker path %s without changing the board and can still select a valid file', async (startPath) => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [
        { name: '01.dsh', isDir: false }, { name: '03.DSH', isDir: false }, { name: '02.dsh', isDir: true },
    ] } } as any);
    setup(<Owner />); const api = await host();
    let result: any;
    await act(async () => { result = await api.files.select({ startPath }); });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(getFileList).not.toHaveBeenCalled();
    expect(screen.queryByText('Select file')).toBeNull();
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    let selected: any;
    act(() => { void api.files.select({ extensions: ['dsh'], startPath: './' }).then((value) => { selected = value; }); });
    fireEvent.click(await screen.findByRole('button', { name: '03.DSH' }));
    await waitFor(() => expect(selected).toEqual({ ok: true, value: '03.DSH' }));
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});
it.each(['dashboard', 'preview', 'editor', 'options'] as const)('rejects sparse file filters before opening on %s and recovers with a valid filter', async (surface) => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [{ isDir: false, name: '03.DSH' }] } } as any);
    setup(<Owner surface={surface} />); const api = await host(surface);
    const filters = new Array<string>(1); let invalid: any;
    await act(async () => { void api.files.select({ extensions: filters }).then((result) => { invalid = result; }); });
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(getFileList).not.toHaveBeenCalled();
    expect(screen.queryByText('Select file')).toBeNull();
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    expect(filters.length).toBe(1); expect(Object.keys(filters)).toEqual([]);
    let selected: any;
    await act(async () => { void api.files.select({ extensions: ['dsh'] }).then((result) => { selected = result; }); });
    fireEvent.click(await screen.findByRole('button', { name: '03.DSH' }));
    await waitFor(() => expect(selected).toMatchObject({ ok: true, value: '03.DSH' }));
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});

it.each([{ extensions: ['dsh'] }, { extensions: ['.DsH'] }, { extensions: [] }])('preserves valid dense/empty file filter $extensions, numeric gaps and extension-named folders', async ({ extensions }) => {
    jest.mocked(getFileList).mockImplementation(async (_filter, directory) => ({ success: true, data: { isDir: true, children: directory === '02.dsh/' ? [] : [
        { isDir: false, name: '01.dsh' }, { isDir: true, name: '02.dsh' }, { isDir: false, name: '03.DSH' }, { isDir: false, name: 'notes.csv' },
    ] } }) as any);
    setup(<Owner />); const api = await host(); let result: any;
    await act(async () => { void api.files.select({ extensions }).then((value) => { result = value; }); });
    await screen.findByRole('button', { name: '03.DSH' });
    expect(Boolean(screen.queryByRole('button', { name: 'notes.csv' }))).toBe(extensions.length === 0);
    fireEvent.click(screen.getByRole('button', { name: /02\.dsh/ }));
    await screen.findByText('/02.dsh'); expect(result).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Parent folder' }));
    fireEvent.click(await screen.findByRole('button', { name: '03.DSH' }));
    await waitFor(() => expect(result).toMatchObject({ ok: true, value: '03.DSH' }));
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});

it('uses the checked filter copy even if the caller later changes its original array', async () => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [{ isDir: false, name: '03.DSH' }, { isDir: false, name: 'notes.csv' }] } } as any);
    setup(<Owner />); const api = await host(); const extensions = ['dsh']; let result: any;
    await act(async () => { void api.files.select({ extensions }).then((value) => { result = value; }); extensions[0] = 'csv'; });
    expect(screen.queryByRole('button', { name: 'notes.csv' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: '03.DSH' }));
    await waitFor(() => expect(result).toMatchObject({ ok: true, value: '03.DSH' }));
    expect(extensions).toEqual(['csv']);
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
});
it.each([
    { request: { extensions: undefined, startPath: undefined }, expected: 'notes.csv' },
    { request: { extensions: ['dsh'], startPath: undefined }, expected: '03.DSH' },
    { request: { extensions: undefined, startPath: '' }, expected: 'notes.csv' },
])('keeps explicitly undefined optional file selection fields valid: $request', async ({ request, expected }) => {
    jest.mocked(getFileList).mockResolvedValue({ success: true, data: { isDir: true, children: [{ isDir: false, name: '03.DSH' }, { isDir: false, name: 'notes.csv' }] } } as any);
    setup(<Owner />); const api = await host(); let result: any;
    await act(async () => { void api.files.select(request).then((value) => { result = value; }); });
    expect(result).toBeUndefined();
    fireEvent.click(await screen.findByRole('button', { name: expected }));
    await waitFor(() => expect(result).toMatchObject({ ok: true, value: expected }));
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    expect(Object.prototype.hasOwnProperty.call(request, 'extensions')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(request, 'startPath')).toBe(true);
});

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=';
const imageBytes = () => Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0)).buffer;
function installActualFileClient(transport: (config: any) => Promise<any>) {
    const request = jest.requireActual('@/api/core').default;
    const previousAdapter = request.defaults.adapter;
    const previousRead = jest.mocked(getFiles).getMockImplementation();
    request.defaults.adapter = transport;
    jest.mocked(getFiles).mockImplementation((...args) => jest.requireActual('@/api/repository/fileTree').getFiles(...args));
    return () => {
        request.defaults.adapter = previousAdapter;
        if (previousRead) jest.mocked(getFiles).mockImplementation(previousRead);
        else jest.mocked(getFiles).mockReset();
    };
}
function SelectionProbe() { return <pre data-testid="selected-tab">{useRecoilValue(gSelectedTab)}</pre>; }

// Exercise supported filename routing and the actual HTTP binary contract. Image
// decoding is separate; these cases intentionally use identical PNG fixture bytes.
it.each([...IMAGE_EXTENSION_LIST, 'PNG', 'sVg'])('opens supported image filename .%s through the actual client without changing source bytes or other boards', async (extension) => {
    const bytes = imageBytes(); const before = Array.from(new Uint8Array(bytes));
    const transport = jest.fn(async (config: any) => ({ status: 200, statusText: 'OK', headers: { 'content-type': 'image/png' }, config, data: bytes }));
    const restore = installActualFileClient(transport);
    try {
        setup(<><Owner /><SelectionProbe /></>); const api = await host(); let result: any;
        const name = 'camera.' + extension;
        await act(async () => { result = await api.navigation.open({ kind: 'file', path: name }); });
        expect(transport).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/files/' + name, responseType: 'arraybuffer' }));
        expect(result).toMatchObject({ ok: true });
        const boards = JSON.parse(screen.getByTestId('boards').textContent!);
        expect(boards[0]).toEqual(board);
        expect(boards[1]).toMatchObject({ name, path: '/', type: extension.toLowerCase(), code: PNG_BASE64, savedCode: PNG_BASE64 });
        expect(screen.getByTestId('selected-tab').textContent).toBe(boards[1].id);
        expect(Array.from(new Uint8Array(bytes))).toEqual(before);
        expect(transport.mock.calls.every(([config]) => config.method === 'get')).toBe(true);
    } finally { restore(); }
});
it.each(['query.sql', 'literal.json'])('keeps original document text unchanged when opening %s through the actual client', async (name) => {
    const original = name.endsWith('.json') ? '  { "keep": [1, 2] }\n' : 'SELECT  1;\n';
    const restore = installActualFileClient(async (config) => ({ status: 200, statusText: 'OK', headers: { 'content-type': 'text/plain' }, config, data: original }));
    try {
        setup(<Owner />); const api = await host(); let result: any;
        await act(async () => { result = await api.navigation.open({ kind: 'file', path: name }); });
        expect(result).toMatchObject({ ok: true });
        const boards = JSON.parse(screen.getByTestId('boards').textContent!);
        expect(boards[0]).toEqual(board);
        expect(boards[1]).toMatchObject({ name, code: original, savedCode: original });
    } finally { restore(); }
});
it('rejects a real-client image 404 response object without adding a tab or changing selection', async () => {
    const restore = installActualFileClient(async (config) => { throw { response: { status: 404, statusText: 'Not Found', config, headers: {}, data: { reason: 'file not found' } } }; });
    try {
        setup(<><Owner /><SelectionProbe /></>); const api = await host(); const selected = screen.getByTestId('selected-tab').textContent; let result: any;
        await act(async () => { result = await api.navigation.open({ kind: 'file', path: 'missing.png' }); });
        expect(result).toMatchObject({ ok: false, error: { code: 'ADAPTER_ERROR' } });
        expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
        expect(screen.getByTestId('selected-tab').textContent).toBe(selected);
    } finally { restore(); }
});
it('rejects an unexpected image string instead of converting it into an empty image tab', async () => {
    jest.mocked(getFiles).mockResolvedValue('{"reason":"not image bytes"}' as any);
    setup(<><Owner /><SelectionProbe /></>); const api = await host(); const selected = screen.getByTestId('selected-tab').textContent; let result: any;
    await act(async () => { result = await api.navigation.open({ kind: 'file', path: 'unexpected.png' }); });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
    expect(screen.getByTestId('selected-tab').textContent).toBe(selected);
});
it('does not add an image tab after the requesting owner closes during a real-client read', async () => {
    let finish!: (response: any) => void; let configuration: any;
    const transport = jest.fn((config: any) => { configuration = config; return new Promise((resolve) => { finish = resolve; }); });
    const restore = installActualFileClient(transport);
    function Toggle() { const [on, setOn] = useState(true); return <><button onClick={() => setOn(false)}>Remove image owner</button>{on && <Owner />}</>; }
    try {
        setup(<><Toggle /><SelectionProbe /></>); const api = await host(); const selected = screen.getByTestId('selected-tab').textContent; let result: any;
        await act(async () => { void api.navigation.open({ kind: 'file', path: 'late.png' }).then((value) => { result = value; }); });
        await waitFor(() => expect(transport).toHaveBeenCalled());
        fireEvent.click(screen.getByText('Remove image owner'));
        await act(async () => { finish({ status: 200, statusText: 'OK', headers: { 'content-type': 'image/png' }, config: configuration, data: imageBytes() }); });
        await waitFor(() => expect(result).toMatchObject({ ok: false, error: { code: 'DISPOSED' } }));
        expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual([board]);
        expect(screen.getByTestId('selected-tab').textContent).toBe(selected);
    } finally { restore(); }
});
it('reuses an existing image tab without another read or changes to its stored bytes', async () => {
    const transport = jest.fn(async (config: any) => ({ status: 200, statusText: 'OK', headers: { 'content-type': 'image/png' }, config, data: imageBytes() }));
    const restore = installActualFileClient(transport);
    try {
        setup(<><Owner /><SelectionProbe /></>); const api = await host();
        await act(async () => { expect((await api.navigation.open({ kind: 'file', path: 'reused.png' })).ok).toBe(true); });
        const firstBoards = JSON.parse(screen.getByTestId('boards').textContent!); const firstSelected = screen.getByTestId('selected-tab').textContent;
        await act(async () => { expect((await api.navigation.open({ kind: 'file', path: 'reused.png' })).ok).toBe(true); });
        expect(transport).toHaveBeenCalledTimes(1);
        expect(JSON.parse(screen.getByTestId('boards').textContent!)).toEqual(firstBoards);
        expect(firstBoards[0]).toEqual(board);
        expect(firstBoards[1]).toMatchObject({ code: PNG_BASE64, savedCode: PNG_BASE64 });
        expect(screen.getByTestId('selected-tab').textContent).toBe(firstSelected);
    } finally { restore(); }
});
