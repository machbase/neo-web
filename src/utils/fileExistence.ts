import { getFiles } from '@/api/repository/fileTree';
import { getFileList } from '@/api/repository/api';
import { getFileRequestFailure } from '@/utils/fileRequestResult';
import { extractionExtension } from '@/utils';

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

/**
 * Re-query `aDir` from the server WITHOUT a filter (the server `?filter=` is case-sensitive, so `X.DSH`
 * never shows in a `*.dsh` listing) and check for `aName`. The raw response is returned too, so a failed
 * lookup is visible.
 */
export const checkTargetExists = async (aDir: string, aName: string): Promise<{ entry: ExistingEntry | null; response: any }> => {
    const sDir = aDir.endsWith('/') ? aDir : aDir + '/';
    const sRes: any = await getFiles(sDir.startsWith('/') ? sDir : '/' + sDir);
    return { entry: findExistingEntry(sRes?.data?.children, aName), response: sRes };
};

/** The one clone question (r14): clone replaces the folder's contents and deletes the files in it. */
export const cloneReplaceMessage = (aExistingName: string) =>
    `A folder named '${aExistingName}' already exists. Cloning will replace its contents and delete the files in it. Do you want to continue?`;

/**
 * 'confirmed' carries `existingName`, the server's real name (r13): every caller POSTs, names the tab and
 * records Recent with it, so 'A.sql' typed over an existing 'a.sql' writes, shows and remembers 'a.sql'.
 */
export type OverwriteDecision =
    | { status: 'none' | 'cancel' }
    | { status: 'confirmed'; existingName: string }
    | { status: 'folder' | 'failed'; reason: string };

/** The name to write with: the server's real name after an overwrite confirm, else what was typed. */
export const savedNameOf = (aDecision: OverwriteDecision, aTyped: string) => (aDecision.status === 'confirmed' ? aDecision.existingName : aTyped);

/**
 * The shared "save here?" check of every save/create path: unfiltered re-query right before saving,
 * case-insensitive name match, and `aAsk(existingRealName)` (a ConfirmModal-backed promise) only for an existing file.
 * - 'none'      nothing there → save
 * - 'confirmed' existing file, user approved → save
 * - 'cancel'    existing file, user declined → do not save
 * - 'folder'    a folder has that name → do not save
 * - 'failed'    the lookup failed → existence unknown, do not save
 */
export const resolveOverwrite = async (aDir: string, aName: string, aAsk: (aName: string) => Promise<boolean>): Promise<OverwriteDecision> => {
    const { entry, response } = await checkTargetExists(aDir, aName);
    const sFailure = getFileRequestFailure(response, 'Failed to read the target folder.');
    if (sFailure) return { status: 'failed', reason: sFailure.reason };
    if (!entry) return { status: 'none' };
    if (entry.isDir) return { status: 'folder', reason: `A folder named '${entry.name}' already exists.` };
    return (await aAsk(entry.name)) ? { status: 'confirmed', existingName: entry.name } : { status: 'cancel' };
};

export type CloneDecision =
    | { status: 'none' | 'cancel' }
    | { status: 'confirmed'; existingName: string }
    | { status: 'file' | 'failed'; reason: string };

/**
 * The shared "clone here?" check of the three clone entry points (FolderModal clone, Reference quick install,
 * file-tree virtual folder clone). The server replaces an existing folder's contents on clone (measured), so a
 * same-name folder (case-insensitive) is asked about with cloneReplaceMessage; a same-name FILE cannot become a
 * folder and is reported. 'failed': the lookup failed, existence unknown, do not clone.
 */
export const resolveCloneTarget = async (aDir: string, aName: string, aAsk: (aName: string) => Promise<boolean>): Promise<CloneDecision> => {
    const { entry, response } = await checkTargetExists(aDir, aName);
    const sFailure = getFileRequestFailure(response, 'Failed to read the target folder.');
    if (sFailure) return { status: 'failed', reason: sFailure.reason };
    if (!entry) return { status: 'none' };
    if (!entry.isDir) return { status: 'file', reason: `A file named '${entry.name}' already exists.` };
    return (await aAsk(entry.name)) ? { status: 'confirmed', existingName: entry.name } : { status: 'cancel' };
};
