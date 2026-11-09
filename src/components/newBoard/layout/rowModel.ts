import { LayoutNode, SECTION_MAX_HEIGHT, SECTION_MIN_HEIGHT, SectionNode, updateNode, WidgetNode } from './layoutModel';

// Row arithmetic of a section laid out in its columns, from the layout alone (no screen). Shared by
// LayoutBoard (rendering, fitting heights) and its tests.

/** A section's children in grid rows: packed in order, a node that does not fit starts the next row. */
export const packRows = (aSection: SectionNode): LayoutNode[][] => {
    const sRows: LayoutNode[][] = [];
    let sUsed: number = aSection.size;
    aSection.children.forEach((aChild) => {
        if (sUsed + aChild.size > aSection.size) {
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

/** How tall the widgets with a height of their own make a row; undefined when none has one. */
export const ownRowHeight = (aRow: LayoutNode[]): number | undefined => {
    const sOwn = aRow.flatMap((aNode) => (aNode.kind === 'widget' && aNode.height ? [aNode.height] : []));
    return sOwn.length ? Math.max(...sOwn) : undefined;
};

/** The gap between rows of a section body, and what a nested section adds above its own body (head + its margin). */
export const ROW_GAP = 12;
export const NESTED_HEAD = 20 + 12;

/** What an empty section's body takes (its drop hint). */
export const EMPTY_BODY = 64;

/**
 * The least height (saved px) section `aSection`'s body needs in its columns: a row of widgets the
 * tallest height of its own or else the smallest a widget may be, a row holding nested sections their head plus their own height (or what
 * they in turn need), and the gaps between rows. Worked out from the layout, not the screen, so it is
 * the same at any window width.
 */
export const leastSavedHeight = (aSection: SectionNode): number => {
    const sRows = packRows(aSection);
    if (!sRows.length) return EMPTY_BODY;
    return (
        sRows.reduce((aSum, aRow) => {
            const sNested = aRow.filter((aNode): aNode is SectionNode => aNode.kind === 'section');
            const sWidgets = aRow.length > sNested.length ? Math.max(SECTION_MIN_HEIGHT, ownRowHeight(aRow) ?? 0) : 0;
            return aSum + Math.max(sWidgets, ...sNested.map(nestedRowHeight));
        }, 0) +
        ROW_GAP * (sRows.length - 1)
    );
};

/** How much of a row a nested section takes: its head and its own height, or what it needs. */
export const nestedRowHeight = (aSection: SectionNode) => NESTED_HEAD + (aSection.height ?? leastSavedHeight(aSection));

/**
 * How tall a row of widgets only is in a section of set height laid out in its columns: what is left
 * after the rows holding nested sections or a widget of set height, shared by the other rows of widgets. With fewer columns (a narrow
 * window) the height is released and each such widget keeps this one.
 */
export const widgetRowHeight = (aSection: SectionNode, aHeight: number) => {
    const sRows = packRows(aSection);
    let sFixed = 0;
    let sShared = 0;
    sRows.forEach((aRow) => {
        const sNested = aRow.filter((aNode): aNode is SectionNode => aNode.kind === 'section');
        const sOwn = ownRowHeight(aRow);
        if (sNested.length) sFixed += Math.max(sOwn ?? 0, ...sNested.map(nestedRowHeight));
        else if (sOwn) sFixed += sOwn;
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

/** Widgets with no height of their own beside one that has: how tall that makes their row, kept on a narrow window. */
export const besideOwnHeight = (aSection: SectionNode) => {
    const sOut = new Map<string, number>();
    packRows(aSection).forEach((aRow) => {
        const sOwn = ownRowHeight(aRow);
        if (sOwn) aRow.forEach((aNode) => aNode.kind === 'widget' && !aNode.height && sOut.set(aNode.id, sOwn));
    });
    return sOut;
};

/**
 * The widgets that would change height along with `aId` if left alone: the rest of its row, which
 * follow the row, and in a section of set height every widget, whose rows share that height.
 */
export const heldWithWidget = (aSection: SectionNode, aId: string): WidgetNode[] => {
    const sRows = packRows(aSection);
    const sNodes = aSection.height ? sRows.flat() : sRows.find((aRow) => aRow.some((aNode) => aNode.id === aId)) ?? [];
    return sNodes.filter((aNode): aNode is WidgetNode => aNode.kind === 'widget' && aNode.id !== aId && !aNode.height);
};

/** A section of set height holding a widget being resized, and how far the widget can grow before that section must. */
export type WidgetHolder = { id: string; height: number; slack: number };

/** What the sections holding a widget become when it grows by `aGrowth`: only ever taller, and by what their slack does not cover. */
export const holdersAfter = (aHolders: WidgetHolder[], aGrowth: number) =>
    aHolders.filter((aHolder) => aGrowth > aHolder.slack).map((aHolder) => ({ id: aHolder.id, height: aHolder.height + aGrowth - aHolder.slack }));

/** How far a widget can grow before one of the sections holding it would pass the height limit. */
export const growthLimit = (aHolders: WidgetHolder[]) => Math.min(Infinity, ...aHolders.map((aHolder) => SECTION_MAX_HEIGHT - aHolder.height + aHolder.slack));

/** Give widget `aId` its own height, and every node in `aOthers` the height given, in one change. */
export const setWidgetHeight = (aNodes: SectionNode[], aId: string, aHeight: number, aOthers: { id: string; height: number }[] = []): SectionNode[] =>
    updateNode(aOthers.reduce((aAll, aOne) => updateNode(aAll, aOne.id, { height: aOne.height }), aNodes), aId, { height: aHeight });
