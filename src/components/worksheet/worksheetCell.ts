/**
 * Why a saved worksheet cell cannot be shown, or undefined when it can (#1547).
 *
 * A cell the editor cannot use — not an object, or text that is not text — used to throw inside
 * the editor and, before the cell boundaries, took the app down. Known up front, it is shown as an
 * error card straight away and nothing has to be thrown (or logged) for it. The cell stays in the
 * sheet as saved.
 */
const describe = (aValue: unknown): string => (aValue === null ? 'null' : Array.isArray(aValue) ? 'a list' : typeof aValue === 'object' ? 'an object' : `a ${typeof aValue}`);

export const getWorksheetCellLoadError = (aCell: unknown): string | undefined => {
    if (aCell === null || typeof aCell !== 'object' || Array.isArray(aCell)) return `the cell is ${describe(aCell)}, not a cell`;
    const sContents = (aCell as { contents?: unknown }).contents;
    if (sContents !== undefined && sContents !== null && typeof sContents !== 'string') return `its contents are ${describe(sContents)}, not text`;
    return undefined;
};
