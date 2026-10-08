import { getFiles } from '@/api/repository/fileTree';
import { getFileList } from '@/api/repository/api';
import { getFileRequestFailure } from '@/utils/fileRequestResult';
import { extractionExtension } from '@/utils';
import { toDirPath } from '@/utils/filePath';

export type ExistingEntry = { name: string; isDir: boolean };

/**
 * Find an entry with the same name, compared case-INSENSITIVELY, and return the server's real name.
 * The server leaves name case to the file system: on macOS/Windows installs `A.sql` overwrites `a.sql`,
 * on Linux they are distinct. Comparing without case loses nothing on any of them (Linux only gets one
 * extra question) — issue-1544 r12. An exact match wins when both exist (Linux).
 */
export const findExistingEntry = (aChildren: { name: string; isDir?: boolean; type?: string; virtual?: boolean }[] | undefined | null, aName: string): ExistingEntry | null => {
    if (!Array.isArray(aChildren) || !aName) return null;
    const sKey = aName.toLowerCase();
    // r15: a virtual item (sample placeholder, not on disk) is not an existing entry — nothing there to overwrite
    const sReal = aChildren.filter((aChild) => !aChild?.virtual);
    const sHit =
        sReal.find((aChild) => aChild?.name === aName) ??
        sReal.find((aChild) => typeof aChild?.name === 'string' && aChild.name.toLowerCase() === sKey);
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

/**
 * The shared "save here?" check of every file save/create path: unfiltered re-query right before saving,
 * case-insensitive name match, and `aAsk(existingRealName)` (a ConfirmModal-backed promise) only for an existing file.
 * - 'none'      nothing there → save
 * - 'confirmed' existing file, user approved → save (under the typed name)
 * - 'cancel'    existing file, user declined → do not save
 * - 'folder'    a folder has that name → do not save
 * - 'failed'    the lookup failed / the folder does not exist → do not save
 */
export const resolveOverwrite = async (aDir: string, aName: string, aAsk: (aName: string) => Promise<boolean>): Promise<OverwriteDecision> => {
    const sDir = await readTargetDir(aDir);
    if (!sDir.ok) return { status: 'failed', reason: sDir.reason };
    if (sDir.dir.missing) return { status: 'failed', reason: missingFolderReason(aDir) };
    const sEntry = findExistingEntry(sDir.dir.children, aName);
    if (!sEntry) return { status: 'none' };
    if (sEntry.isDir) return { status: 'folder', reason: `A folder named '${sEntry.name}' already exists.` };
    return (await aAsk(sEntry.name)) ? { status: 'confirmed' } : { status: 'cancel' };
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
