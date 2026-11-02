import {getUnknownFileIdentityPaths} from '@/api/repository/fileWriteQueue';
import {getFiles} from '@/api/repository/fileTree';
import {getFileRequestFailure} from './fileRequestResult';
import {toDirPath} from './filePath';
import {findExistingEntry, missingFolderReason, readTargetDir, type OverwriteDecision} from './fileExistence';
import {getFileLookupKey, rememberDirectoryIdentity, rememberFileIdentity, rememberUnresolvedFileIdentity} from './fileIdentity';

// File-operation identity observations are explicit. Ordinary create/download/clone
// callers keep the existing fileExistence lookup and overwrite rules.
const matchingEntries = (children: Parameters<typeof findExistingEntry>[0], name: string) =>
    (children ?? []).filter(child => !child?.virtual && typeof child?.name === 'string' && getFileLookupKey(child.name) === getFileLookupKey(name));

const findObservedEntry = (children: Parameters<typeof findExistingEntry>[0], name: string) => {
    const existing = findExistingEntry(children, name);
    if (existing) return existing;
    const candidate = matchingEntries(children, name)[0];
    return candidate ? findExistingEntry([candidate], candidate.name) : null;
};

/** The folder endpoint echoes the requested spelling. Parent listings supply
 * the actual names; exact matches keep case-sensitive sibling folders distinct.
 * The caller has already verified that the requested full folder exists. */
const resolveDirectoryIdentity = async (directory: string, canObserve: () => boolean): Promise<{path: string; uncertain: boolean} | {reason: string}> => {
    let actual = '/', uncertain = false;
    for (const segment of directory.split('/').filter(Boolean)) {
        if (!canObserve()) return {reason: 'File lookup cancelled.'};
        const parent = await readTargetDir(actual, canObserve);
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
        const entry = findObservedEntry(parent.dir.children, segment);
        if (!entry?.isDir) return {reason: `Failed to identify the folder '${directory}'.`};
        actual += entry.name + '/';
    }
    return {path: actual, uncertain};
};

/**
 * Tracked editor save preparation: unfiltered re-query right before saving,
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
    const dir = await readTargetDir(aDir, canObserve);
    if (!canObserve()) return {decision: {status: 'cancel'}};
    if (!dir.ok) return {decision: {status: 'failed', reason: dir.reason}};
    if (dir.dir.missing) return {decision: {status: 'failed', reason: missingFolderReason(aDir)}};
    const directory = await resolveDirectoryIdentity(aDir, canObserve);
    if (!canObserve()) return {decision: {status: 'cancel'}};
    if ('reason' in directory) return {decision: {status: 'failed', reason: directory.reason}};
    const children = dir.dir.children;
    const path = toDirPath(aDir), entry = findObservedEntry(children, aName);
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
        const response: any = await getFiles(path + aName, {rawText: true, canRetryFileRequest: canObserve});
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
export const resolveTrackedOverwrite = async (dir: string, name: string, ask: (name: string) => Promise<boolean>, canObserve: () => boolean = () => true): Promise<OverwriteDecision> => {
    const inspection = await inspectFileTarget(dir, name, canObserve);
    if (!canObserve()) return {status: 'cancel'};
    if (inspection.existingName !== undefined && (!await ask(inspection.existingName) || !canObserve())) return {status: 'cancel'};
    inspection.publish?.(); return inspection.decision;
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
