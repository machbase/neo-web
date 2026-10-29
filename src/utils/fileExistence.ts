import {getUnknownFileIdentityPaths} from '@/api/repository/fileWriteQueue';
import { getFiles } from '@/api/repository/fileTree';
import { getFileList } from '@/api/repository/api';
import { getFileRequestFailure } from '@/utils/fileRequestResult';
import { extractionExtension } from '@/utils';
import { toDirPath } from '@/utils/filePath';
import { getFileLookupKey, rememberDirectoryIdentity, rememberFileIdentity, rememberUnresolvedFileIdentity } from './fileIdentity';

export type ExistingEntry = { name: string; isDir: boolean };

const matchingEntries = (children: Parameters<typeof findExistingEntry>[0], name: string) =>
    (children ?? []).filter(child => !child?.virtual && typeof child?.name === 'string' && getFileLookupKey(child.name) === getFileLookupKey(name));

/**
 * Find a candidate by case/Unicode spelling and return the server's real name.
 * The server leaves name case to the file system: on macOS/Windows installs `A.sql` overwrites `a.sql`,
 * on Linux they are distinct. Comparing without case loses nothing on any of them (Linux only gets one
 * extra question) — issue-1544 r12. An exact match wins when both exist (Linux).
 * Unicode equivalents are candidates too; resolveOverwrite probes the typed path
 * before recording identity, so distinct NFC/NFD files never share a baseline.
 */
export const findExistingEntry = (aChildren: { name: string; isDir?: boolean; type?: string; virtual?: boolean }[] | undefined | null, aName: string): ExistingEntry | null => {
    if (!Array.isArray(aChildren) || !aName) return null;
    const sKey = getFileLookupKey(aName);
    // r15: a virtual item (sample placeholder, not on disk) is not an existing entry — nothing there to overwrite
    const sReal = aChildren.filter((aChild) => !aChild?.virtual);
    const sHit =
        sReal.find((aChild) => aChild?.name === aName) ??
        // Prefer the original Unicode spelling when that file exists separately.
        sReal.find((aChild) => typeof aChild?.name === 'string' && aChild.name.toLowerCase() === aName.toLowerCase()) ??
        sReal.find((aChild) => typeof aChild?.name === 'string' && getFileLookupKey(aChild.name) === sKey);
    if (!sHit) return null;
    return { name: sHit.name, isDir: !!sHit.isDir || sHit.type === 'dir' };
};

/**
 * Keep the folders and the files of `aType`, extension compared case-INSENSITIVELY (r19): `X.SQL`, `x.Sql`
 * and `x.sql` are all `.sql` files. Order is left as the server sent it.
 */
export const keepTypeEntries = <T extends { name: string; isDir?: boolean; type?: string }>(aChildren: T[] | undefined | null, aType: string): T[] => {
    if (!Array.isArray(aChildren)) return [];
    const sType = aType.replace(/^\./, '').toLowerCase();
    return aChildren.filter((aChild) => !!aChild?.isDir || aChild?.type === 'dir' || extractionExtension(aChild?.name ?? '') === sType);
};

/**
 * The listing of every type-filtered file dialog (save/select). The server `?filter=*.<type>` is
 * case-sensitive (measured: `*.sql` drops `X.SQL`), so a visible file was missing from the list and only
 * surfaced as an overwrite question at save time (r19). The folder is fetched WITHOUT the server filter and
 * narrowed here with keepTypeEntries; folders stay. The response keeps its shape (`data.children`).
 */
export const getTypedFileList = async (aType: string, aDir: string): Promise<any> => {
    const sRes: any = await getFileList('', aDir, '');
    if (!sRes?.data || !Array.isArray(sRes.data.children)) return sRes;
    return { ...sRes, data: { ...sRes.data, children: keepTypeEntries(sRes.data.children, aType) } };
};

/** The one overwrite question, naming the file that is actually there (it may differ from the typed name in case). */
export const overwriteMessage = (aExistingName: string) => `A file named '${aExistingName}' already exists. Do you want to overwrite it?`;

export type TargetDir = { children: { name: string; isDir?: boolean; type?: string; virtual?: boolean }[]; missing: false } | { missing: true };
export type TargetDirResult = { ok: true; dir: TargetDir } | { ok: false; reason: string };

/**
 * Read the folder a new entry will be written into — the one lookup behind every save/create/clone check.
 * Re-queried from the server WITHOUT a filter (the server `?filter=` is case-sensitive, so `X.DSH` never shows in
 * a `*.dsh` listing).
 * - 404              → `{ ok:true, dir:{ missing:true } }` — the caller decides: a clone POST creates the missing
 *                      folders (measured, L1), a file/folder POST does not
 * - a file, not a folder (`GET /f.sql/` answers the file's content with 200 — measured) → error
 * - any other failure → error with the server's reason
 */
export const readTargetDir = async (aDir: string): Promise<TargetDirResult> => {
    const sDir = toDirPath(aDir);
    const sRes: any = await getFiles(sDir);
    if (sRes && typeof sRes === 'object' && sRes.status === 404) return { ok: true, dir: { missing: true } };
    const sFailure = getFileRequestFailure(sRes, 'Failed to read the target folder.');
    if (sFailure) return { ok: false, reason: sFailure.reason };
    if (!sRes?.data?.isDir) return { ok: false, reason: `'${sDir}' is not a folder.` };
    return { ok: true, dir: { missing: false, children: Array.isArray(sRes.data.children) ? sRes.data.children : [] } };
};

/** A file/folder POST does not create missing parent folders (measured: 500 `mkdir ...: no such file or directory`). */
const missingFolderReason = (aDir: string) => `The folder '${toDirPath(aDir)}' does not exist.`;

/** The one clone question (r14): clone replaces the folder's contents and deletes the files in it. */
export const cloneReplaceMessage = (aExistingName: string) =>
    `A folder named '${aExistingName}' already exists. Cloning will replace its contents and delete the files in it. Do you want to continue?`;

/**
 * Detection is case-insensitive and the question names the real existing entry, but a confirmed save is written
 * under the name the USER TYPED (r20 — the user's r12 rule restored): the server leaves name case to the file
 * system, so 'A.sql' over 'a.sql' overwrites on macOS/Windows and makes a second file on Linux. The client does not
 * second-guess that.
 */
export type OverwriteDecision = { status: 'none' | 'cancel' | 'confirmed' } | { status: 'folder' | 'failed'; reason: string };

/** The folder endpoint echoes the requested spelling. Parent listings supply
 * the actual names; exact matches keep case-sensitive sibling folders distinct.
 * The caller has already verified that the requested full folder exists. */
const resolveDirectoryIdentity = async (directory: string, canObserve: () => boolean): Promise<{path: string; uncertain: boolean} | {reason: string}> => {
    let actual = '/', uncertain = false;
    for (const segment of directory.split('/').filter(Boolean)) {
        if (!canObserve()) return {reason: 'File lookup cancelled.'};
        const parent = await readTargetDir(actual);
        if (!parent.ok) return {reason: parent.reason};
        if (parent.dir.missing) return {reason: missingFolderReason(actual)};
        const candidates = matchingEntries(parent.dir.children, segment);
        if (!candidates.some(entry => entry.name === segment) && candidates.length > 1) {
            // The complete requested directory was read successfully, but the API
            // gives no physical id to choose between several equivalent names.
            actual += segment + '/';
            uncertain = true;
            continue;
        }
        const entry = findExistingEntry(parent.dir.children, segment);
        if (!entry?.isDir) return {reason: `Failed to identify the folder '${directory}'.`};
        actual += entry.name + '/';
    }
    return {path: actual, uncertain};
};

/**
 * The shared "save here?" check of every file save/create path: unfiltered re-query right before saving,
 * case-insensitive name match, and `aAsk(existingRealName)` (a ConfirmModal-backed promise) only for an existing file.
 * - 'none'      nothing there → save
 * - 'confirmed' existing file, user approved → save (under the typed name)
 * - 'cancel'    existing file, user declined → do not save
 * - 'folder'    a folder has that name → do not save
 * - 'failed'    the lookup failed / the folder does not exist → do not save
 */
type TargetInspection = {decision: OverwriteDecision; existingName?: string; publish?: () => void};

/** Observation has no approval/UI side effect. Failed or stale observations
 * never publish file identity into the current login's resolver. */
const inspectFileTarget = async (aDir: string, aName: string, canObserve: () => boolean): Promise<TargetInspection> => {
    if (!canObserve()) return {decision: {status: 'cancel'}};
    const dir = await readTargetDir(aDir);
    if (!canObserve()) return {decision: {status: 'cancel'}};
    if (!dir.ok) return {decision: {status: 'failed', reason: dir.reason}};
    if (dir.dir.missing) return {decision: {status: 'failed', reason: missingFolderReason(aDir)}};
    const directory = await resolveDirectoryIdentity(aDir, canObserve);
    if (!canObserve()) return {decision: {status: 'cancel'}};
    if ('reason' in directory) return {decision: {status: 'failed', reason: directory.reason}};
    const children = dir.dir.children;
    const path = toDirPath(aDir), entry = findExistingEntry(children, aName);
    const publishDirectory = () => {
        if (!directory.uncertain) rememberDirectoryIdentity(aDir, directory.path);
        else rememberUnresolvedFileIdentity(path + aName);
    };
    if (!entry) return {decision: {status: 'none'}, publish: publishDirectory};
    if (entry.isDir) return {decision: {status: 'folder', reason: `A folder named '${entry.name}' already exists.`}, publish: () => {
        if (!directory.uncertain && entry.name === aName) {
            publishDirectory(); rememberDirectoryIdentity(path + aName, directory.path + entry.name);
        }
    }};
    let actualName = aName, uncertain = directory.uncertain;
    if (entry.name !== aName) {
        const response: any = await getFiles(path + aName, {rawText: true});
        if (!canObserve()) return {decision: {status: 'cancel'}};
        if (response?.status !== 404) {
            const failure = getFileRequestFailure(response, 'Failed to identify the target file.');
            if (failure) return {decision: {status: 'failed', reason: failure.reason}};
            if (matchingEntries(children, aName).length > 1) uncertain = true;
            else actualName = entry.name;
        }
    }
    return {decision: {status: 'confirmed'}, existingName: uncertain ? aName : entry.name, publish: () => {
        publishDirectory();
        if (uncertain) {rememberUnresolvedFileIdentity(path + aName); return;}
        for (const child of children) if (!child.virtual && getFileLookupKey(child.name) === getFileLookupKey(aName))
            rememberFileIdentity(path + child.name, directory.path + child.name);
        rememberFileIdentity(path + aName, directory.path + actualName);
    }};
};
export const observeFileIdentity = async (dir: string, name: string, canObserve: () => boolean = () => true): Promise<OverwriteDecision> => {
    const inspection = await inspectFileTarget(dir, name, canObserve);
    if (!canObserve()) return {status: 'cancel'};
    inspection.publish?.(); return inspection.decision;
};
export const resolveOverwrite = async (dir: string, name: string, ask: (name: string) => Promise<boolean>, canObserve: () => boolean = () => true): Promise<OverwriteDecision> => {
    const inspection = await inspectFileTarget(dir, name, canObserve);
    if (!canObserve()) return {status: 'cancel'};
    if (inspection.existingName !== undefined && (!await ask(inspection.existingName) || !canObserve())) return {status: 'cancel'};
    inspection.publish?.(); return inspection.decision;
};

export type CloneDecision = { status: 'none' | 'cancel' | 'confirmed' } | { status: 'file' | 'failed'; reason: string };

/**
 * The shared "clone here?" check of the three clone entry points (FolderModal clone, Reference quick install,
 * file-tree virtual folder clone). The server replaces an existing folder's contents on clone (measured), so a
 * same-name folder (case-insensitive) is asked about with cloneReplaceMessage; a same-name FILE cannot become a
 * folder and is reported. A missing parent is not an error: the clone POST creates it (measured r20 — `/a/b/edu`
 * with no `/a` → 200, `/a/b/edu` created). 'failed': the lookup failed, existence unknown, do not clone.
 * A confirmed clone is POSTed under the typed name (r20).
 */
export const resolveCloneTarget = async (aDir: string, aName: string, aAsk: (aName: string) => Promise<boolean>): Promise<CloneDecision> => {
    const sDir = await readTargetDir(aDir);
    if (!sDir.ok) return { status: 'failed', reason: sDir.reason };
    if (sDir.dir.missing) return { status: 'none' };
    const sEntry = findExistingEntry(sDir.dir.children, aName);
    if (!sEntry) return { status: 'none' };
    if (!sEntry.isDir) return { status: 'file', reason: `A file named '${sEntry.name}' already exists.` };
    return (await aAsk(sEntry.name)) ? { status: 'confirmed' } : { status: 'cancel' };
};

export type NewFolderDecision = { status: 'none' } | { status: 'exists' | 'failed'; reason: string };

/**
 * The plain New folder check (mkdir, not clone). Blocks only on the EXACT same name (r20): a case-only difference
 * is the file system's call — Linux makes a second folder, macOS/Windows answer 500 `mkdir ...: file exists`, which
 * the caller shows. The parent must exist: mkdir POST does not create intermediate folders (measured).
 */
export const resolveNewFolder = async (aDir: string, aName: string): Promise<NewFolderDecision> => {
    const sDir = await readTargetDir(aDir);
    if (!sDir.ok) return { status: 'failed', reason: sDir.reason };
    if (sDir.dir.missing) return { status: 'failed', reason: `Parent folder '${toDirPath(aDir)}' does not exist.` };
    const sHit = sDir.dir.children.find((aChild) => !aChild?.virtual && aChild?.name === aName);
    return sHit ? { status: 'exists', reason: `'${sHit.name}' already exists.` } : { status: 'none' };
};

/** Refine only related spelling candidates. This never releases an unknown
 * physical request and never waits for an unrelated source/destination probe. */
export const observeFileAccess = async (path: string, canObserve: () => boolean): Promise<void> => {
    if (!getUnknownFileIdentityPaths(path).length) return;
    const observe = async (target: string) => {
        const separator = target.lastIndexOf('/');
        await observeFileIdentity(target.slice(0, separator + 1), target.slice(separator + 1), canObserve);
    };
    await observe(path);
    for (const target of getUnknownFileIdentityPaths(path)) {
        if (!canObserve()) return;
        await observe(target);
    }
};
