import axios from 'axios';
import { getTimer } from '@/api/repository/timer';
import { getBridge } from '@/api/repository/bridge';
import { getApiTokens } from '@/api/repository/token';
import { getKeyList } from '@/api/repository/key';
import { getLogin } from '@/api/repository/login';
import { getTableList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { listInstalledNames, isPkgDirName } from '@/components/side/AppStore/catalog';
import { filterVisibleTableRows, E_TABLE_INFO } from '@/components/side/DBExplorer/utils';
import { getTableType } from '@/utils/dashboardUtil';
import { isTimerRunningState } from '@/components/timer/useTimerStateAction';
import { expiryState } from '@/components/securityKey/detailParts';
import { shortenShellCommand } from '../shellCommand';
import { GroupItem, GroupItemKind, itemKey, splitFilePath } from './groupModel';
import { accountKey } from '../layout/newTabStorage';

/** One thing a group can point at, as the add-items picker lists it. */
export interface ResourceEntry {
    kind: GroupItemKind;
    ref: string;
    label: string;
    detail?: string;
    /** Original record, for opening it the way its own panel does. */
    raw?: any;
}

export const KIND_LABELS: Record<GroupItemKind, { one: string; many: string; action: string }> = {
    file: { one: 'File', many: 'Files', action: 'Open' },
    folder: { one: 'Folder', many: 'Folders', action: 'Reveal' },
    package: { one: 'Package', many: 'Packages', action: 'Launch' },
    timer: { one: 'Timer', many: 'Timers', action: 'Open' },
    bridge: { one: 'Bridge', many: 'Bridges', action: 'Open' },
    shell: { one: 'Shell', many: 'Shells', action: 'Launch' },
    table: { one: 'Table', many: 'Tables', action: 'Open' },
    token: { one: 'Token', many: 'Tokens', action: 'Open' },
    cert: { one: 'Certificate', many: 'Certificates', action: 'Open' },
};

const expiryText = (aNotAfter: number) => {
    const sState = expiryState(aNotAfter);
    return sState === 'expired' ? 'Expired' : sState === 'soon' ? 'Expires soon' : '';
};

/** Lists for every kind except files and folders, which are browsed a directory at a time. */
const LISTERS: Record<Exclude<GroupItemKind, 'file' | 'folder'>, () => Promise<ResourceEntry[]>> = {
    package: async () =>
        Array.from(await listInstalledNames())
            .filter(isPkgDirName)
            .sort()
            .map((aName) => ({ kind: 'package', ref: aName, label: aName })),
    timer: async () => {
        const sRes = await getTimer();
        return (sRes.success ? sRes.data : []).map((aTimer) => ({
            kind: 'timer',
            ref: String(aTimer.id),
            label: aTimer.name,
            detail: [aTimer.schedule, isTimerRunningState(aTimer.state) ? 'Running' : 'Stopped'].filter(Boolean).join(' · '),
            raw: aTimer,
        }));
    },
    bridge: async () => {
        const sRes = await getBridge();
        return (sRes.success ? sRes.data : []).map((aBridge) => ({ kind: 'bridge', ref: aBridge.name, label: aBridge.name, detail: String(aBridge.type ?? ''), raw: aBridge }));
    },
    shell: async () => {
        const sRes: any = await getLogin();
        return ((sRes?.shells ?? []) as any[])
            .filter((aShell) => aShell?.type === 'term')
            .map((aShell) => ({ kind: 'shell', ref: String(aShell.id), label: aShell.label, detail: shortenShellCommand(aShell.command), raw: aShell }));
    },
    table: async () => {
        const sRes: any = await getTableList();
        return filterVisibleTableRows(sRes?.data?.rows).map((aRow: any[]) => ({
            kind: 'table',
            ref: `${aRow[E_TABLE_INFO.DB_NM]}.${aRow[E_TABLE_INFO.USER_NM]}.${aRow[E_TABLE_INFO.TB_NM]}`,
            label: String(aRow[E_TABLE_INFO.TB_NM]),
            detail: `${aRow[E_TABLE_INFO.DB_NM]}.${aRow[E_TABLE_INFO.USER_NM]} · ${getTableType(Number(aRow[E_TABLE_INFO.TB_TYPE])) || 'table'}`,
            raw: aRow,
        }));
    },
    token: async () => {
        const sRes = await getApiTokens();
        return (sRes.success ? sRes.data : []).map((aToken) => ({
            kind: 'token',
            ref: String(aToken.id),
            label: aToken.name,
            detail: [aToken.hint, expiryText(aToken.notAfter)].filter(Boolean).join(' · '),
            raw: aToken,
        }));
    },
    cert: async () => {
        const sRes = await getKeyList();
        return (sRes.success ? sRes.data : []).map((aCert) => ({ kind: 'cert', ref: String(aCert.id), label: aCert.name, detail: expiryText(aCert.notAfter), raw: aCert }));
    },
};

// Lists are shared by every group widget on the page; a short cache keeps a page of widgets to one
// request per kind, and anything that just changed shows up again within the TTL.
const CACHE_TTL_MS = 30_000;
const sCache = new Map<string, { at: number; value: Promise<any> }>();
// Keyed by account too: tables and tokens differ by account, and logging in as another one keeps the page (and this cache).
const cached = <T>(aName: string, aLoad: () => Promise<T>): Promise<T> => {
    const aKey = `${accountKey()}:${aName}`;
    const sHit = sCache.get(aKey);
    if (sHit && Date.now() - sHit.at < CACHE_TTL_MS) return sHit.value;
    const sValue = aLoad().catch((aError) => {
        sCache.delete(aKey);
        throw aError;
    });
    sCache.set(aKey, { at: Date.now(), value: sValue });
    return sValue;
};
export const clearResourceCache = () => sCache.clear();

export const listResources = (aKind: Exclude<GroupItemKind, 'file' | 'folder'>, aFresh = false): Promise<ResourceEntry[]> => {
    if (aFresh) sCache.delete(`${accountKey()}:${aKind}`);
    return cached(aKind, LISTERS[aKind]);
};

export interface DirEntry {
    name: string;
    isDir: boolean;
}
/** Children of a server directory (`/` or `/a/b/`), folders first. */
export const listDirectory = (aDir: string, aFresh = false): Promise<DirEntry[]> => {
    const sKey = `dir:${aDir}`;
    if (aFresh) sCache.delete(`${accountKey()}:${sKey}`);
    return cached(sKey, async () => {
        const sRes: any = await getFiles(aDir);
        // No answer at all is not the same as an empty folder; let the caller treat it as unknown.
        if (axios.isAxiosError(sRes)) throw sRes;
        const sChildren: any[] = sRes?.data?.children ?? [];
        return sChildren
            .filter((aChild) => aChild?.name && !aChild.virtual)
            .map((aChild) => ({ name: String(aChild.name), isDir: !!aChild.isDir }))
            .sort((aA, aB) => Number(aB.isDir) - Number(aA.isDir) || aA.name.localeCompare(aB.name));
    });
};

/** Find the live record behind a group item, or undefined when it no longer exists. */
export const resolveItem = async (aItem: GroupItem): Promise<ResourceEntry | undefined> => {
    if (aItem.kind === 'file' || aItem.kind === 'folder') {
        const { path, name } = splitFilePath(aItem.ref);
        const sEntries = await listDirectory(path);
        const sHit = sEntries.find((aEntry) => aEntry.name === name && aEntry.isDir === (aItem.kind === 'folder'));
        return sHit ? { kind: aItem.kind, ref: aItem.ref, label: name } : undefined;
    }
    const sEntries = await listResources(aItem.kind);
    return sEntries.find((aEntry) => aEntry.ref === aItem.ref);
};

/** Keys of the items that could not be found. A list that fails to load marks nothing missing. */
export const findMissingItems = async (aItems: GroupItem[]): Promise<Set<string>> => {
    const sMissing = new Set<string>();
    await Promise.all(
        aItems.map(async (aItem) => {
            try {
                if (!(await resolveItem(aItem))) sMissing.add(itemKey(aItem));
            } catch {
                // Unknown is not the same as gone.
            }
        })
    );
    return sMissing;
};
