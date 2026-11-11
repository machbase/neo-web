import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { getFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { getId, isImage, binaryCodeEncodeBase64 } from '@/utils';
import { loadTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';
import { Button, Modal, Toast } from '@/design-system/components';
import { TreeFolder } from '@/assets/icons/Icon';
import { DashboardHostRuntime } from './hostRuntime';
import { normalizeHostPath as cleanPath } from './hostPaths';
import { isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { ChartTypeList } from '@/utils/constants';
import type { ExtensionDefinition } from './types';
import type { Settings } from './settings';
import type { HostAdapters, HostBoardInput, HostFileSelection, HostPanelInfo, HostRefresh, HostSession, HostSurface, HostTimeRange, RegisteredHostAction } from './hostTypes';

interface HostBoardContextValue {
    runtime: DashboardHostRuntime;
    boardInfo: any;
    timeRange: HostTimeRange | null;
    active: boolean;
    refresh: HostRefresh;
    executionRevisions: Record<string, number>;
    invalidatePanel(panelId: string): void;
    readSettings(panelId: string): Settings;
    applySettings(panelId: string, settings: Settings): void;
    selectFile(request: HostFileSelection, signal?: AbortSignal): Promise<string | null>;
    open(request: { path: string; kind: 'dashboard' | 'file'; target?: 'tab' | 'window' }, signal?: AbortSignal): Promise<void>;
}
const HostBoardContext = createContext<HostBoardContextValue | undefined>(undefined);
const EMPTY_REFRESH: HostRefresh = { revision: 0, reasons: [] };
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const emptyActions: RegisteredHostAction[] = [];
export function hostPanelInfo(panel: any, executionRevision = 0): HostPanelInfo {
    const chart = ChartTypeList.some(({ key, value }) => key === panel.type && value !== 'video');
    const cartesian = ['Line', 'Bar', 'Scatter'].includes(panel.type) && !panel.chartOptions?.isPolar;
    const range = isNumericBaseTimeBlock(panel.blockList?.[0]) ? 'range:distance' : 'range:time';
    return { id: panel.id, type: panel.type, title: panel.title, theme: panel.theme, width: panel.w, height: panel.h, executionRevision,
        capabilities: panel.type === 'Extension' ? ['refresh', 'range:time', 'range:distance'] : chart ? ['refresh', range, ...(cartesian ? ['overlay'] : [])] : [] };
}
function boardInput(boardInfo: any, timeRange: HostTimeRange | null, active: boolean, refresh: HostRefresh, revisions: Record<string, number>): HostBoardInput {
    return { id: String(boardInfo?.id ?? 'standalone'), panels: (boardInfo?.dashboard?.panels ?? []).map((panel: any) => hostPanelInfo(panel, revisions[panel.id] ?? 0)),
        timeRange, distanceRange: { start: boardInfo?.dashboard?.distanceRange?.start ?? '', end: boardInfo?.dashboard?.distanceRange?.end ?? '' }, active, refresh };
}
export function useHostBoard() { return useContext(HostBoardContext); }

function loadHostWorksheet(content: string) {
    const document = JSON.parse(content);
    const sections = Array.isArray(document) ? document
        : Array.isArray(document?.data) ? document.data
        : Array.isArray(document?.sheet) ? document.sheet : undefined;
    if (!sections || sections.some((section: unknown) => {
        if (!section || typeof section !== 'object' || Array.isArray(section)) return true;
        const value = section as Record<string, unknown>;
        return typeof value.type !== 'string' || typeof value.contents !== 'string';
    })) {
        throw new Error('The file does not contain worksheet sections.');
    }
    // The existing parser reads the data envelope in normal mode. Normalize the
    // supported legacy envelopes before reusing its section conversions.
    const compatible = CheckDataCompatibility(JSON.stringify({ data: sections }), 'wrk');
    const sheet = Array.isArray(compatible) ? compatible
        : Array.isArray(compatible?.data) ? compatible.data
        : Array.isArray(compatible?.sheet) ? compatible.sheet : sections;
    return { sheet, code: '', savedCode: JSON.stringify(sheet) };
}
export function isSelectableHostFile(entry: any, extensions: string[] = []) {
    if (!entry || entry.isDir === true || entry.type === 'dir' || typeof entry.name !== 'string') return false;
    return !extensions.length || extensions.some((extension) => entry.name.toLowerCase().endsWith('.' + extension.replace(/^\./, '').toLowerCase()));
}
function HostFilePicker({ request, onClose }: { request: HostFileSelection; onClose(path: string | null): void }) {
    const [directory, setDirectory] = useState(() => cleanPath(request.startPath ?? ''));
    const [entries, setEntries] = useState<any[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        setError(''); setEntries([]);
        // The shared HTTP client treats names ending in .dsh/.tql as raw files.
        // A trailing slash keeps a directory with such a name on the JSON-list path.
        getFileList('', directory ? directory + '/' : '/', '').then((response: any) => {
            if (!active) return;
            const data = response?.data;
            const directoryResponse = data?.isDir === true || data?.type === 'dir';
            if (response?.success !== true || !directoryResponse || (data.children !== undefined && !Array.isArray(data.children))) {
                setError('Could not read files.'); return;
            }
            // Empty directories omit children in Neo 8.5.13.
            setEntries(data.children ?? []);
        }).catch(() => { if (active) setError('Could not read files.'); });
        return () => { active = false; };
    }, [directory]);
    return <Modal.Root isOpen onClose={() => onClose(null)} size="md">
        <Modal.Header><Modal.Title>Select file</Modal.Title><Modal.Close /></Modal.Header>
        <Modal.Body>
            <div>{'/' + directory}</div>
            <Button onClick={() => setDirectory(directory.split('/').slice(0, -1).join('/'))} disabled={!directory}>Parent folder</Button>
            {error && <div role="alert">{error}</div>}
            {entries.filter((entry) => entry.isDir === true || entry.type === 'dir' || isSelectableHostFile(entry, request.extensions)).map((entry) => {
                const folder = entry.isDir === true || entry.type === 'dir';
                return <Button key={entry.name} onClick={() => {
                    if (entry.name.includes('/') || entry.name.includes('\\') || ['.', '..'].includes(entry.name)) return;
                    const path = [directory, entry.name].filter(Boolean).join('/');
                    if (folder) setDirectory(path); else onClose(path);
                }}>{folder && <TreeFolder />}{entry.name}</Button>;
            })}
        </Modal.Body>
        <Modal.Footer><Button onClick={() => onClose(null)}>Cancel</Button></Modal.Footer>
    </Modal.Root>;
}
export function useHostActions(panelId: string) {
    const board = useHostBoard();
    useSyncExternalStore(board ? (listener) => board.runtime.subscribe(listener) : noopSubscribe, board ? () => board.runtime.getSnapshot() : zeroSnapshot);
    return board?.runtime.getPanelState(panelId).actions ?? emptyActions;
}

export function useExtensionHost({ panel, definition, surface, settings, getSettings, onReplaceSettings, timeRange, distanceRange }: {
    panel: any; definition: ExtensionDefinition; surface: HostSurface; settings: Settings;
    getSettings?(): Settings;
    onReplaceSettings?(settings: Settings): void;
    timeRange?: HostTimeRange | null; distanceRange?: { start: string | number; end: string | number };
}) {
    const board = useHostBoard();
    const rootRef = useRef<HTMLDivElement>(null);
    const contextPanels = [...(board?.boardInfo?.dashboard?.panels ?? []).filter((item: any) => item.id !== panel.id), panel].map((item: any) => hostPanelInfo(item));
    const standalone = useMemo(() => new DashboardHostRuntime({
        id: String(board?.boardInfo.id ?? 'standalone'), panels: contextPanels, timeRange: timeRange ?? board?.timeRange ?? null,
        distanceRange: distanceRange ?? { start: '', end: '' }, active: board?.active ?? true,
    }), [board?.runtime, panel.id, surface]);
    const runtime = surface === 'dashboard' && board ? board.runtime : standalone;
    const latest = useRef({ board, settings, getSettings, onReplaceSettings });
    latest.current = { board, settings, getSettings, onReplaceSettings };
    const [session, setSession] = useState<{ value: HostSession; definition: ExtensionDefinition; runtime: DashboardHostRuntime }>();
    useLayoutEffect(() => {
        if (runtime !== standalone) return;
        runtime.updateBoard({ id: String(board?.boardInfo.id ?? 'standalone'), panels: contextPanels,
            timeRange: timeRange ?? board?.timeRange ?? null, distanceRange: distanceRange ?? { start: '', end: '' },
            active: board?.active ?? true, refresh: board?.refresh });
    }, [runtime, standalone, panel, timeRange, distanceRange, board?.boardInfo, board?.active, board?.refresh]);
    const adapters = useMemo<HostAdapters>(() => ({
        selectFile: (request, signal) => {
            if (!latest.current.board) return Promise.reject(new Error('File selection is unavailable.'));
            return latest.current.board.selectFile(request, signal);
        },
        open: (request, signal) => {
            if (!latest.current.board) return Promise.reject(new Error('Navigation is unavailable.'));
            return latest.current.board.open(request, signal);
        },
        notify: ({ message, level = 'info' }) => { Toast[level](message); },
        confirm: async (message) => window.confirm(message),
        enterFullscreen: () => {
            const element = rootRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
            if (!element) throw new Error('The extension view is unavailable.');
            if (element.requestFullscreen) return element.requestFullscreen();
            if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
            throw new Error('Fullscreen is unavailable.');
        },
        exitFullscreen: () => {
            const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
            const full = doc.fullscreenElement ?? doc.webkitFullscreenElement;
            if (!full) return;
            if (full !== rootRef.current) throw new Error('This extension does not own fullscreen.');
            if (doc.exitFullscreen) return doc.exitFullscreen();
            doc.webkitExitFullscreen?.();
        },
    }), []);
    const availableAdapters = useMemo(() => ({ ...adapters,
        ...(board ? {} : { selectFile: undefined, open: undefined }),
        ...(['editor', 'options'].includes(surface) ? { enterFullscreen: undefined, exitFullscreen: undefined } : {}),
    }), [adapters, !!board, surface]);

    useEffect(() => {
        const created = runtime.createHost({
            panelId: panel.id, packageId: panel.extension.packageId, typeId: panel.extension.typeId, surface,
            getSettings: () => surface === 'dashboard' && latest.current.board ? latest.current.board.readSettings(panel.id) : (latest.current.getSettings?.() ?? latest.current.settings),
            applySettings: (next) => {
                latest.current.settings = next;
                if (surface === 'dashboard' && latest.current.board) latest.current.board.applySettings(panel.id, next);
                else latest.current.onReplaceSettings?.(next);
            },
            validateSettings: definition.validateSettings,
            adapters: availableAdapters,
        });
        setSession({ value: created, definition, runtime });
        return () => created.dispose();
    }, [runtime, panel.id, panel.extension.packageId, panel.extension.typeId, surface, definition, availableAdapters]);
    useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
    return { host: session?.definition === definition && session.runtime === runtime ? session.value.host : undefined, context: runtime.getContext(panel.id, surface, availableAdapters), rootRef };
}

export function HostBoardProvider({ boardInfo, timeRange, active, refresh = EMPTY_REFRESH, children }: {
    boardInfo: any; timeRange: HostTimeRange | null; active: boolean; refresh?: HostRefresh; children: ReactNode;
}) {
    const [boards, setBoards] = useRecoilState(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const [executionRevisions, setExecutionRevisions] = useState<Record<string, number>>({});
    const input = boardInput(boardInfo, timeRange, active, refresh, executionRevisions);
    const runtime = useMemo(() => new DashboardHostRuntime(input), [boardInfo.id]);
    const activeRuntime = useRef(runtime);
    activeRuntime.current = runtime;
    const mounted = useRef(false);
    const current = useRef({ boardInfo, boards });
    current.current = { boardInfo, boards };
    const pendingSettings = useRef(new Map<string, { base: Settings; next: Settings }>());
    const selectionRef = useRef<{ request: HostFileSelection; resolve(value: string | null): void }>();
    const [selection, setSelection] = useState<typeof selectionRef.current>();
    useLayoutEffect(() => { runtime.updateBoard(input); }, [runtime, boardInfo, timeRange, active, refresh, executionRevisions]);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            selectionRef.current?.resolve(null);
            // StrictMode repeats effect setup; retain its live runtime during that replay.
            queueMicrotask(() => { if (!mounted.current || activeRuntime.current !== runtime) runtime.dispose(); });
        };
    }, [runtime]);
    const value: HostBoardContextValue = {
        runtime, boardInfo, timeRange, active, refresh, executionRevisions,
        invalidatePanel: (id) => setExecutionRevisions((all) => ({ ...all, [id]: (all[id] ?? 0) + 1 })),
        readSettings: (id) => {
            const base = current.current.boardInfo?.dashboard?.panels?.find((panel: any) => panel.id === id)?.extension?.settings ?? {};
            const pending = pendingSettings.current.get(id);
            return pending && pending.base === base ? pending.next : base;
        },
        applySettings: (id, settings) => {
            const base = current.current.boardInfo?.dashboard?.panels?.find((panel: any) => panel.id === id)?.extension?.settings ?? {};
            pendingSettings.current.set(id, { base, next: settings });
            setBoards((all) => all.map((board) => board.id !== current.current.boardInfo.id ? board : {
                ...board, dashboard: { ...board.dashboard, panels: board.dashboard.panels.map((panel: any) => panel.id !== id || panel.type !== 'Extension' ? panel : {
                    ...panel, extension: { ...panel.extension, settings },
                }) },
            }));
        },
        selectFile: (request, signal) => new Promise((resolve, reject) => {
            if (signal?.aborted) { resolve(null); return; }
            if (selectionRef.current) { reject(new Error('A file selection is already open.')); return; }
            const checkedRequest = { ...request, startPath: cleanPath(request.startPath ?? '') };
            const abort = () => next.resolve(null);
            const next = { request: checkedRequest, resolve: (path: string | null) => {
                signal?.removeEventListener('abort', abort);
                if (selectionRef.current === next) { selectionRef.current = undefined; setSelection(undefined); }
                resolve(path);
            } };
            selectionRef.current = next; setSelection(next);
            signal?.addEventListener('abort', abort, { once: true });
        }),
        open: async (request, signal) => {
            if (signal?.aborted) return;
            const segments = cleanPath(request.path).split('/').filter(Boolean);
            const name = segments.at(-1);
            if (!name) throw new Error('Select a file.');
            const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
            const directory = '/' + segments.slice(0, -1).join('/') + (segments.length > 1 ? '/' : '');
            if (request.kind === 'dashboard' && extension !== 'dsh') throw new Error('Select a dashboard file.');
            if (request.target === 'window') {
                if (request.kind !== 'dashboard') throw new Error('Only dashboards support a new window.');
                const path = segments.join('/').replace(/\.dsh$/i, '').split('/').map(encodeURIComponent).join('/');
                if (!window.open(`${window.location.origin}/web/ui/board/${path}`, '_blank')) throw new Error('The browser blocked the new window.');
                return;
            }
            const existing = current.current.boards.find((board) => board.name === name && board.path === directory);
            if (existing) { setSelectedTab(existing.id); return; }
            const content: any = await getFiles('/' + segments.join('/'), { rawText: true });
            if (signal?.aborted) return;
            const image = isImage(name);
            if (image ? !(content instanceof ArrayBuffer) : typeof content !== 'string') throw new Error('Could not read the file.');
            const id = getId();
            const parsed = extension === 'dsh' ? CheckDataCompatibility(content, 'dsh') : undefined;
            const base64 = image ? binaryCodeEncodeBase64(content) : undefined;
            const opened: any = image
                ? { id, name, path: directory, type: extension, code: base64, savedCode: base64 }
                : extension === 'dsh'
                ? { ...parsed, id, name, path: directory, type: extension, savedCode: JSON.stringify(JSON.parse(content).dashboard) }
                : extension === 'taz' ? loadTazBoard(JSON.parse(content), id, name, directory)
                : extension === 'wrk' ? { id, name, path: directory, type: extension, ...loadHostWorksheet(content) }
                : { id, name, path: directory, type: extension, code: content, savedCode: content };
            setBoards((all) => [...all, opened]); setSelectedTab(id);
        },
    };
    return <HostBoardContext.Provider value={value}>{children}
        {selection && <HostFilePicker request={selection.request} onClose={selection.resolve} />}
    </HostBoardContext.Provider>;
}
