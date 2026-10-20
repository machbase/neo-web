import { extractionExtension, isImage } from '@/utils';

/**
 * What happens to the open tabs after a file was written (issue-1544 r13/r15/r20).
 * Rule: the written file keeps exactly ONE representative tab.
 *
 * r20: the file is written under the name the USER TYPED (the server decides by file system whether 'A.sql' over an
 * existing 'a.sql' overwrites it — macOS/Windows — or makes a second file — Linux). Tabs are matched as follows:
 * - the writer tab (`currentTabId`) is always the one updated;
 * - other tabs are touched ONLY when `confirmed` (the user explicitly approved overwriting that file), and then they
 *   are matched by exact path + name compared case-INSENSITIVELY — the same comparison that raised the question
 *   (findExistingEntry), so the tab on the file the user agreed to overwrite ('a.sql') is updated/closed even though
 *   the typed name was 'A.sql'. On Linux this also closes the 'a.sql' tab although 'a.sql' survives as a separate
 *   file — accepted: the user confirmed overwriting it, and the tab would otherwise show content the user just chose
 *   to replace. Kept simple on purpose (no file-system guessing).
 * - without a confirm (a new file) nothing but the writer tab is touched — a tab on a since-deleted file keeps its
 *   unsaved content.
 */
type TabLike = { id: string; name?: string; path?: string };

/** Is this tab open on the file `{path, name}`? Exact path, name compared case-insensitively (see above). */
export const isTabOnFile = (aTab: TabLike, aFile: { path: string; name: string }) =>
    (aTab.path ?? '') === aFile.path && (aTab.name ?? '').toLowerCase() === aFile.name.toLowerCase();

/**
 * After a write:
 * - the writer tab (`currentTabId`, the tab that became the file — SaveModal, tagAnalyzer) is KEPT and passed
 *   through `aUpdate`, even when it was itself open on that file (Save As onto its own file);
 * - without a writer tab on the file (SaveDashboardModal .tql export, New file, URL download), the FIRST tab open on
 *   the file is passed through `aUpdate` and becomes the representative;
 * - other tabs open on the same file are closed ONLY when `confirmed`.
 * `aUpdate` may return null: that tab is closed instead (e.g. binary content it cannot show — tabFromWrittenContent).
 */
export const afterOverwrite = <T extends TabLike>(
    aTabs: T[],
    aTarget: { path: string; name: string; currentTabId?: string; confirmed: boolean },
    aUpdate: (aTab: T) => T | null
): T[] => {
    let sHasRepresentative = aTarget.currentTabId !== undefined && aTabs.some((aTab) => aTab.id === aTarget.currentTabId);
    const sResult: T[] = [];
    const push = (aTab: T | null) => {
        if (aTab) sResult.push(aTab);
    };
    for (const aTab of aTabs) {
        if (aTarget.currentTabId !== undefined && aTab.id === aTarget.currentTabId) {
            push(aUpdate(aTab));
        } else if (aTarget.confirmed && isTabOnFile(aTab, aTarget)) {
            if (!sHasRepresentative) {
                push(aUpdate(aTab));
                sHasRepresentative = true;
            }
            // else: closed
        } else {
            sResult.push(aTab);
        }
    }
    return sResult;
};

/** Tabs whose model is not plain `code` (a board / sheet / analyzer) — rebuilding them from raw content is the open path's job. */
const BOARD_TAB_EXTENSIONS = ['dsh', 'wrk', 'taz'];

/**
 * The `aUpdate` for afterOverwrite when a dialog wrote `aContent` to a file it did not have open (New file, URL
 * download, dashboard .tql export) — one rule for all of them (r20 M3):
 * - text content → the tab shows exactly what was written: `code` and `savedCode` = the text (an object payload is
 *   what axios sends: JSON.stringify), and the tab takes the written name;
 * - binary content (ArrayBuffer/Blob), an image tab, or a board tab (dsh/wrk/taz — its model is not `code`) → null:
 *   the tab is closed, reopening it reads the new file.
 */
export const tabFromWrittenContent =
    (aContent: unknown, aWrittenName: string) =>
    <T extends TabLike>(aTab: T): T | null => {
        const sBinary = aContent instanceof ArrayBuffer || ArrayBuffer.isView(aContent) || (typeof Blob !== 'undefined' && aContent instanceof Blob);
        const sTabName = aTab.name ?? '';
        if (sBinary || isImage(sTabName) || BOARD_TAB_EXTENSIONS.includes(extractionExtension(sTabName))) return null;
        const sText = aContent === undefined || aContent === null ? '' : typeof aContent === 'string' ? aContent : JSON.stringify(aContent);
        return { ...aTab, name: aWrittenName, code: sText, savedCode: sText };
    };
