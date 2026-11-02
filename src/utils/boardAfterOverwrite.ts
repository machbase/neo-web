import { extractionExtension, isImage } from '@/utils';
import { isSameFilePath } from './fileIdentity';

/**
 * Files are written under the typed name. resolveOverwrite records whether the
 * server treats a case variant as the same file or as a separate file.
 * Confirmed overwrites only close tabs on that resolved file; unconfirmed writes
 * keep other tabs. Callers without an observation retain the legacy case match.
 */
type TabLike = { id: string; name?: string; path?: string };

/** Confirmed overwrites accept case aliases; ordinary saves must keep distinct file names distinct. */
export const isTabOnFile = (aTab: TabLike, aFile: { path: string; name: string }, exactName = false) => {
    // An empty path is a retained draft, never a root file.
    if (!aTab.path || !aFile.path) return false;
    const tabPath = aTab.path + (aTab.name ?? '');
    const targetPath = aFile.path + aFile.name;
    return isSameFilePath(tabPath, targetPath, exactName);
};

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
