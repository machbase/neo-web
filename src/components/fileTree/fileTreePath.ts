// Pure path helpers for the file tree. String comparisons only — paths are user-controlled and
// may contain regex metacharacters ( ( [ + . $ ), so they must never be fed into `new RegExp`.

const withTrailingSlash = (aPath: string): string => (aPath.endsWith('/') ? aPath : aPath + '/');

/** true when `aChildPath` is `aDirPath` itself or lies under it (segment-aware prefix). */
export const isPathWithin = (aChildPath: string, aDirPath: string): boolean => {
    if (typeof aChildPath !== 'string' || typeof aDirPath !== 'string') return false;
    return withTrailingSlash(aChildPath).startsWith(withTrailingSlash(aDirPath));
};

type TreeItemLike = { type: number; name: string; path: string; parentId?: string; id?: string };

/**
 * Drop-section highlight while dragging over `aEnterItem`.
 * - a file at the root: everything is in the section (drop goes to '/')
 * - a directory: the directory itself and everything under it
 * - a file: its parent directory item and everything in that directory
 */
export const isInDropSection = (aEnterItem: TreeItemLike | null | undefined, aItem: TreeItemLike): boolean => {
    if (!aEnterItem) return false;
    if (aEnterItem === aItem) return true;
    if (aEnterItem.type === 0 && (aEnterItem.parentId === '0' || aEnterItem.path === '/')) return true;
    const sDirPath = aEnterItem.type === 0 ? aEnterItem.path : aEnterItem.path + aEnterItem.name + '/';
    // the directory row itself
    if (aItem.type === 1 && aItem.path + aItem.name + '/' === sDirPath) return true;
    return isPathWithin(aItem.path, sDirPath);
};

/** Cmd (macOS) or Ctrl click toggles multi-selection. */
export const isMultiSelectClick = (aEvent: { metaKey?: boolean; ctrlKey?: boolean } | null | undefined): boolean => !!(aEvent && (aEvent.metaKey || aEvent.ctrlKey));

/**
 * New directory path of an open board after `aMovedItem` was moved into `aTargetDirPath`.
 * Returns null when the board is not affected. Replaces the prefix once (startsWith, not includes).
 */
export const computeMovedBoardPath = (aBoardPath: string, aMovedItem: { type: number; name: string; path: string }, aTargetDirPath: string): string | null => {
    const sTarget = withTrailingSlash(aTargetDirPath);
    if (aMovedItem.type === 0) return null;
    const sOldPrefix = aMovedItem.path + aMovedItem.name + '/';
    if (!aBoardPath.startsWith(sOldPrefix)) return null;
    return sTarget + aMovedItem.name + '/' + aBoardPath.slice(sOldPrefix.length);
};
