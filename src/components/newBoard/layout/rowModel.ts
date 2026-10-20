import { LayoutNode, ROW_COLUMNS, SECTION_MIN_HEIGHT, SectionNode } from './layoutModel';

// Row arithmetic of a section laid out in four columns, from the layout alone (no screen). Shared by
// LayoutBoard (rendering, fitting heights) and its tests.

/** A section's children in grid rows: packed in order, a node that does not fit starts the next row. */
export const packRows = (aSection: SectionNode): LayoutNode[][] => {
    const sRows: LayoutNode[][] = [];
    let sUsed = ROW_COLUMNS;
    aSection.children.forEach((aChild) => {
        if (sUsed + aChild.size > ROW_COLUMNS) {
            sRows.push([]);
            sUsed = 0;
        }
        sUsed += aChild.size;
        sRows[sRows.length - 1].push(aChild);
    });
    return sRows;
};

/** What decides how a board is packed into rows: its nodes, their order, nesting and sizes (not heights). */
export const shapeOf = (aNodes: LayoutNode[]): string =>
    aNodes.map((aNode) => (aNode.kind === 'section' ? `${aNode.id}:${aNode.size}[${shapeOf(aNode.children)}]` : `${aNode.id}:${aNode.size}`)).join(',');

/** The gap between rows of a section body, and what a nested section adds above its own body (head + its margin). */
export const ROW_GAP = 12;
export const NESTED_HEAD = 20 + 12;

/** What an empty section's body takes (its drop hint). */
export const EMPTY_BODY = 64;

/**
 * The least height (saved px) section `aSection`'s body needs in four columns: a row of widgets the
 * smallest a widget may be, a row holding nested sections their head plus their own height (or what
 * they in turn need), and the gaps between rows. Worked out from the layout, not the screen, so it is
 * the same at any window width.
 */
export const leastSavedHeight = (aSection: SectionNode): number => {
    const sRows = packRows(aSection);
    if (!sRows.length) return EMPTY_BODY;
    return (
        sRows.reduce((aSum, aRow) => {
            const sNested = aRow.filter((aNode): aNode is SectionNode => aNode.kind === 'section');
            const sWidgets = aRow.length > sNested.length ? SECTION_MIN_HEIGHT : 0;
            return aSum + Math.max(sWidgets, ...sNested.map(nestedRowHeight));
        }, 0) +
        ROW_GAP * (sRows.length - 1)
    );
};

/** How much of a row a nested section takes: its head and its own height, or what it needs. */
export const nestedRowHeight = (aSection: SectionNode) => NESTED_HEAD + (aSection.height ?? leastSavedHeight(aSection));

/**
 * How tall a row of widgets only is in a section of set height laid out in four columns: what is left
 * after the rows holding nested sections, shared by the rows of widgets. With fewer columns (a narrow
 * window) the height is released and each such widget keeps this one.
 */
export const widgetRowHeight = (aSection: SectionNode, aHeight: number) => {
    const sRows = packRows(aSection);
    let sFixed = 0;
    let sShared = 0;
    sRows.forEach((aRow) => {
        const sNested = aRow.filter((aNode): aNode is SectionNode => aNode.kind === 'section');
        if (sNested.length) sFixed += Math.max(...sNested.map(nestedRowHeight));
        else sShared++;
    });
    return Math.max(SECTION_MIN_HEIGHT, Math.floor((aHeight - ROW_GAP * Math.max(0, sRows.length - 1) - sFixed) / Math.max(1, sShared)));
};

/**
 * Widgets that share a row with nested sections, and how tall those sections make the row. In four
 * columns such a row is as tall as its tallest item, so with fewer columns the widget takes its own
 * content height but no less than that.
 */
export const besideSections = (aSection: SectionNode) => {
    const sOut = new Map<string, number>();
    packRows(aSection).forEach((aRow) => {
        const sNested = aRow.filter((aNode): aNode is SectionNode => aNode.kind === 'section');
        if (!sNested.length) return;
        const sRow = Math.max(...sNested.map(nestedRowHeight));
        aRow.forEach((aNode) => aNode.kind === 'widget' && sOut.set(aNode.id, sRow));
    });
    return sOut;
};
