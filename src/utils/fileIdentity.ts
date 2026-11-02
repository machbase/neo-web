import { encodeFilePath } from './filePath';

// Only server-observed aliases are shared. Case-sensitive servers keep both names.
const identities = new Map<string, string | null>();
const directories = new Map<string, string>();
type IdentityObservations = { identities: ReadonlyMap<string, string | null>; directories: ReadonlyMap<string, string> };
const currentObservations: IdentityObservations = { identities, directories };
const key = (path: string) => encodeFilePath(path).replace(/\/$/, '');

/** Conservative lookup/ordering only. Physical identity still requires a server observation. */
export const getFileLookupKey = (path: string): string => path.normalize('NFC')
    .toUpperCase().toLowerCase()
    // A capital sharp S first lowers to ß, which expands to SS on the next pass.
    .toUpperCase().toLowerCase().normalize('NFC');

/** Only aliases verified by reading the folder and its parent's real entries. */
export const rememberDirectoryIdentity = (requested: string, actual: string): void => {
    const from = key(requested).split('/').filter(Boolean), to = key(actual).split('/').filter(Boolean);
    // A verified full directory also observes its ancestors' actual spellings.
    for (let depth = 1; depth <= from.length; depth++) {
        directories.set('/' + from.slice(0, depth).join('/'), '/' + to.slice(0, depth).join('/'));
    }
    directories.set(key(requested), key(actual));
};
const directoryPath = (path: string, observedDirectories: ReadonlyMap<string, string> = directories): string => {
    for (let end = path.length; end > 0; end = path.lastIndexOf('/', end - 1)) {
        const actual = observedDirectories.get(path.slice(0, end));
        if (actual !== undefined) return actual + path.slice(end);
    }
    return path;
};

export const rememberFileIdentity = (requested: string, actual: string): void => {
    identities.set(key(requested), key(actual));
};

/** Observed but ambiguous: also disable the legacy case-only overwrite fallback. */
export const rememberUnresolvedFileIdentity = (path: string): void => { identities.set(key(path), null); };

export const hasFileIdentity = (path: string): boolean => typeof identities.get(key(path)) === 'string';
export const getFileIdentity = (path: string, observed: IdentityObservations = currentObservations): string => {
    const requested = key(path);
    const canonical = directoryPath(requested, observed.directories);
    return directoryPath(observed.identities.get(requested) ?? observed.identities.get(canonical) ?? canonical, observed.directories);
};

/** One physical-file comparison for tabs and queued requests. Only observed
 * identities merge case aliases; the legacy overwrite fallback is opt-in. */
export const isSameFilePath = (left: string, right: string, exactName = true, observed: IdentityObservations = currentObservations): boolean => {
    const leftIdentity = getFileIdentity(left, observed), rightIdentity = getFileIdentity(right, observed);
    const leftPath = encodeFilePath(left), rightPath = encodeFilePath(right);
    if (observed.identities.has(key(left)) || observed.identities.has(key(right)) || leftIdentity !== leftPath || rightIdentity !== rightPath) {
        return leftIdentity === rightIdentity;
    }
    if (exactName) return leftPath === rightPath;
    const leftSeparator = leftPath.lastIndexOf('/'), rightSeparator = rightPath.lastIndexOf('/');
    return leftPath.slice(0, leftSeparator) === rightPath.slice(0, rightSeparator) &&
        decodeURIComponent(leftPath.slice(leftSeparator + 1)).toLowerCase() === decodeURIComponent(rightPath.slice(rightSeparator + 1)).toLowerCase();
};

/** A mutation affects a file itself or descendants of its folder. A broad lookup
 * match alone is not proof: retain verified distinct files, but cancel unknown aliases safely. */
export const getFileMutationRelation = (path: string, target: string, observations: IdentityObservations = currentObservations): 'same' | 'different' | 'unknown' => {
    const actual = getFileIdentity(path, observations), changed = getFileIdentity(target, observations);
    if (isSameFilePath(path, target, true, observations) || changed === '/' || actual.startsWith(changed + '/')) return 'same';
    const depth = changed.split('/').filter(Boolean).length;
    const prefix = '/' + actual.split('/').filter(Boolean).slice(0, depth).join('/');
    if (getFileLookupKey(decodeURIComponent(prefix)) !== getFileLookupKey(decodeURIComponent(changed))) return 'different';
    const observed = (value: string) => observations.directories.has(value) || typeof observations.identities.get(value) === 'string' ||
        [...observations.directories.values(), ...observations.identities.values()].some(actual => actual !== null &&
            (actual === value || actual.startsWith(value + '/')));
    const parent = (value: string) => value.slice(0, value.lastIndexOf('/'));
    // Verified distinct directories also separate children that do not exist
    // yet. Unknown file-name aliases inside the same directory stay protected.
    const distinctParents = parent(prefix) !== parent(changed) && observed(parent(prefix)) && observed(parent(changed));
    return distinctParents || observed(prefix) && observed(changed) ? 'different' : 'unknown';
};

/** Keep the server observations that identified a move's scope, even after its
 * old names are invalidated. A verified distinct peer must stay independent. */
export const captureFileMutationPaths = (paths: string[]) => {
    const pinnedFiles = new Map<string, string | null>(), pinnedDirs = new Map<string, string>();
    // A live view supplies new evidence without refresh() calls. Only facts
    // belonging to this operation are pinned across later path invalidation.
    const observations = (): IdentityObservations => ({
        identities: new Map([...identities, ...pinnedFiles]),
        directories: new Map([...directories, ...pinnedDirs]),
    });
    const identity = (path: string) => getFileIdentity(path, observations());
    const relation = (path: string, target: string) => getFileMutationRelation(path, target, observations());
    const scope = (path: string) => paths.find(target => relation(path, target) !== 'different');
    const capture = () => {
        for (const [path, actual] of identities) if (scope(decodeURIComponent(path)) !== undefined && !pinnedFiles.has(path)) pinnedFiles.set(path, actual);
        for (const [path, actual] of directories) if (scope(decodeURIComponent(path)) !== undefined && !pinnedDirs.has(path)) pinnedDirs.set(path, actual);
    };
    capture();
    return Object.assign(scope, {identity, relation, capture});
};
export type FileMutationScope = ReturnType<typeof captureFileMutationPaths>;

/** File moves/deletes and a new login invalidate observations, just like pending writes. */
export const forgetFileIdentities = (path?: string, isAffected?: (path: string) => boolean): void => {
    if (path === undefined) { identities.clear(); directories.clear(); return; }
    const affected = (value: string) => isAffected ? isAffected(decodeURIComponent(value)) : getFileMutationRelation(decodeURIComponent(value), path) !== 'different';
    // Decide every removal before invalidating observations used by that decision.
    const files = [...identities].filter(([requested, actual]) => affected(requested) || actual !== null && affected(actual));
    const folders = [...directories].filter(([requested, actual]) => affected(requested) || affected(actual));
    for (const [requested] of files) identities.delete(requested);
    for (const [requested] of folders) directories.delete(requested);
};
