/**
 * What happens to the open tabs after a file was written (issue-1544 r13/r15).
 * Rule: the written file keeps exactly ONE representative tab.
 * The file is identified by its REAL name + path compared EXACTLY (r15): every caller writes with the server's
 * real name (resolveOverwrite existingName), so a case-insensitive match is not needed — and on Linux it would
 * close a tab on a different file ('A.sql' vs 'a.sql').
 */
type TabLike = { id: string; name?: string; path?: string };

/** Is this tab open on the file `{path, name}`? Exact real name + path. */
export const isTabOnFile = (aTab: TabLike, aFile: { path: string; name: string }) => (aTab.name ?? '') === aFile.name && (aTab.path ?? '') === aFile.path;

/**
 * After a write:
 * - the writer tab (`currentTabId`, the tab that became the file — SaveModal, tagAnalyzer) is KEPT and passed
 *   through `aUpdate`, even when it was itself open on that file (Save As onto its own file);
 * - without a writer tab on the file (SaveDashboardModal .tql export), the FIRST tab open on the file is updated
 *   and becomes the representative;
 * - other tabs open on the same file are closed ONLY when `confirmed` (the user approved an overwrite). For a new
 *   file nothing else is touched — a tab on a since-deleted file keeps its unsaved content.
 */
export const afterOverwrite = <T extends TabLike>(
    aTabs: T[],
    aTarget: { path: string; name: string; currentTabId?: string; confirmed: boolean },
    aUpdate: (aTab: T) => T
): T[] => {
    let sHasRepresentative = aTarget.currentTabId !== undefined && aTabs.some((aTab) => aTab.id === aTarget.currentTabId);
    const sResult: T[] = [];
    for (const aTab of aTabs) {
        if (aTarget.currentTabId !== undefined && aTab.id === aTarget.currentTabId) {
            sResult.push(aUpdate(aTab));
        } else if (aTarget.confirmed && isTabOnFile(aTab, aTarget)) {
            if (!sHasRepresentative) {
                sResult.push(aUpdate(aTab));
                sHasRepresentative = true;
            }
            // else: closed
        } else {
            sResult.push(aTab);
        }
    }
    return sResult;
};
