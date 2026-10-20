import { useSyncExternalStore } from 'react';
import { getUserName } from '@/utils';

/**
 * Files the user opened or saved, newest first, for the New tab's "Recent" list.
 *
 * Kept in this browser's localStorage and keyed by login name, so two accounts on one browser do
 * not see each other's files. Only the location is stored — the content is fetched again on open,
 * so a file that was renamed or removed since fails to open and is dropped from the list then.
 */
export interface RecentFile {
    name: string;
    /** Directory with leading and trailing slash, as the file tree spells it (`/dir/`). */
    path: string;
    openedAt: number;
}

const MAX_RECENT_FILES = 8;
const CHANGE_EVENT = 'neo-recent-files-change';

const storageKey = () => `recentFiles:${String(getUserName() ?? '').toUpperCase()}`;

const isRecentFile = (aItem: any): aItem is RecentFile =>
    typeof aItem?.name === 'string' && aItem.name !== '' && typeof aItem?.path === 'string' && typeof aItem?.openedAt === 'number';

const sameFile = (aFile: Pick<RecentFile, 'name' | 'path'>, bFile: Pick<RecentFile, 'name' | 'path'>) => aFile.name === bFile.name && aFile.path === bFile.path;

const EMPTY: RecentFile[] = [];
let sCache: { key: string; raw: string | null; list: RecentFile[] } | undefined;

export const getRecentFiles = (): RecentFile[] => {
    const sKey = storageKey();
    let sRaw: string | null = null;
    try {
        sRaw = localStorage.getItem(sKey);
    } catch {
        return EMPTY;
    }
    // useSyncExternalStore compares snapshots by identity, so hand back the same array until the
    // stored text actually changes.
    if (sCache && sCache.key === sKey && sCache.raw === sRaw) return sCache.list;
    let sList: RecentFile[] = EMPTY;
    try {
        const sParsed = sRaw ? JSON.parse(sRaw) : [];
        if (Array.isArray(sParsed)) sList = sParsed.filter(isRecentFile).slice(0, MAX_RECENT_FILES);
    } catch {
        sList = EMPTY;
    }
    sCache = { key: sKey, raw: sRaw, list: sList };
    return sList;
};

const writeRecentFiles = (aList: RecentFile[]) => {
    try {
        localStorage.setItem(storageKey(), JSON.stringify(aList));
    } catch {
        return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const recordRecentFile = (aFile: { name: string; path: string }) => {
    if (!aFile?.name) return;
    const sEntry: RecentFile = { name: aFile.name, path: aFile.path || '/', openedAt: Date.now() };
    writeRecentFiles([sEntry, ...getRecentFiles().filter((aItem) => !sameFile(aItem, sEntry))].slice(0, MAX_RECENT_FILES));
};

export const removeRecentFile = (aFile: { name: string; path: string }) => {
    writeRecentFiles(getRecentFiles().filter((aItem) => !sameFile(aItem, aFile)));
};

const subscribe = (aOnChange: () => void) => {
    // `storage` keeps other browser tabs of the app in step; the custom event covers this one.
    window.addEventListener(CHANGE_EVENT, aOnChange);
    window.addEventListener('storage', aOnChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, aOnChange);
        window.removeEventListener('storage', aOnChange);
    };
};

export const useRecentFiles = () => useSyncExternalStore(subscribe, getRecentFiles, () => EMPTY);
