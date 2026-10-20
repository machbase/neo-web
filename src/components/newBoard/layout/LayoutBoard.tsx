import { Component, Fragment, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    clampSectionHeight,
    createSection,
    findNode,
    SECTION_MAX_HEIGHT,
    SECTION_MIN_HEIGHT,
    LayoutNode,
    LayoutResult,
    moveNode,
    insertNode,
    ROW_COLUMNS,
    SECTION_SIZES,
    SectionNode,
    shiftNode,
    updateNode,
    WidgetNode,
    widgetSizes,
    WidgetSize,
} from './layoutModel';
import { getLayoutDrag, setLayoutDrag } from './layoutDrag';
import { besideSections, leastSavedHeight, packRows, ROW_GAP, shapeOf, widgetRowHeight } from './rowModel';


// React 18 has no `inert` prop. While editing, a widget's own buttons must not open anything, and
// `inert` also keeps them out of the tab order, which pointer-events alone would not.
const setInert = (aEl: HTMLElement | null, aOn: boolean) => {
    if (!aEl) return;
    if (aOn) aEl.setAttribute('inert', '');
    else aEl.removeAttribute('inert');
};

const CONFIGURABLE = new Set<WidgetNode['type']>(['clock', 'weather', 'calendar']);

/** Room above a row of widgets for their control bars while editing (`.nb-widget` margin in index.scss). */
const EDIT_BAR_ROOM = 18;
/** Room under a last row of nested sections while editing, so their resize handle and this section's do not sit on top of each other. */
const EDIT_FOOT_ROOM = 20;
/** A nested section's own padding above and below while editing (`.nb-depth-1` in index.scss), so its outline clears its head's buttons and its content's lines. */
const EDIT_NEST_PAD = 10 + 12;

const endsWithSection = (aSection: SectionNode) => packRows(aSection).at(-1)?.some((aNode) => aNode.kind === 'section') ?? false;


/**
 * How much taller section `aSection` is while editing than once saved: each row holding a widget gets
 * room for the control bars, plus whatever its tallest nested section gains. A section with a set
 * height grows by this while editing, so its widgets keep exactly the height they will have saved.
 */
const editExtra = (aSection: SectionNode): number =>
    (endsWithSection(aSection) ? EDIT_FOOT_ROOM : 0) +
    packRows(aSection).reduce(
        // A widget's bar room and a nested section's own growth sit side by side in a row, not on top
        // of each other: the row grows by the larger (summed, a section holding both was a bar's room
        // short of what it needs, and a drag could take it below its nested section).
        (aSum, aRow) =>
            aSum + Math.max(aRow.some((aNode) => aNode.kind === 'widget') ? EDIT_BAR_ROOM : 0, ...aRow.map((aNode) => (aNode.kind === 'section' ? editExtra(aNode) + EDIT_NEST_PAD : 0))),
        0
    );

/**
 * Row tracks for a section with a set height. A row holding a nested section is as tall as that
 * section (its set height, or its content); rows of widgets share what is left, and with none the
 * rest stays empty at the bottom. (All rows sharing equally held a nested section to its share: it
 * could not grow into space left under the sections below it, and one without a set height was
 * squeezed until its own sections spilled out.)
 */
const rowTracks = (aSection: SectionNode, aHeight: number) => {
    const sRows = packRows(aSection);
    // A row of widgets keeps the least a widget may be, so a nested section taller than its share
    // (one without a height, on a narrower window) gives way and scrolls instead of squeezing the
    // widgets to a sliver. A section saved shorter than its rows need still shares what it has.
    const sShare = Math.floor((aHeight - ROW_GAP * Math.max(0, sRows.length - 1)) / Math.max(1, sRows.length));
    const sLeast = Math.max(0, Math.min(SECTION_MIN_HEIGHT, sShare));
    return sRows.map((aRow) => (aRow.some((aNode) => aNode.kind === 'section') ? 'auto' : `minmax(${sLeast}px, 1fr)`)).join(' ');
};

/**
 * The drag preview: a copy of the dragged node alone. Chrome's own preview of a nested node took a
 * box around it that showed parts of the sections it sits in. The copy goes inside the board, so
 * the board's styles still apply to it, and is removed once the browser has taken its picture.
 */
const setDragPreview = (aEvent: React.DragEvent, aNode: HTMLElement, aHost: HTMLElement | null) => {
    if (!aHost || typeof aEvent.dataTransfer.setDragImage !== 'function') return;
    const sRect = aNode.getBoundingClientRect();
    const sCopy = aNode.cloneNode(true) as HTMLElement;
    sCopy.className = sCopy.className.replace(/\s*is-(dragging|drop-[\w-]+)/g, '');
    sCopy.style.margin = '0';
    sCopy.style.width = '100%';
    sCopy.style.height = '100%';
    const sCanvases = aNode.querySelectorAll('canvas');
    sCopy.querySelectorAll('canvas').forEach((aCanvas, aIndex) => aCanvas.getContext('2d')?.drawImage(sCanvases[aIndex], 0, 0));
    // Room for the node's own outline, which is drawn outside its box.
    const sPad = 4;
    const sWrap = document.createElement('div');
    sWrap.className = 'nb-drag-preview';
    // A section has no background of its own; take what shows behind it so the preview is not see-through.
    let sBackground = 'transparent';
    for (let sEl: HTMLElement | null = aNode; sEl && sBackground === 'transparent'; sEl = sEl.parentElement) {
        const sColor = getComputedStyle(sEl).backgroundColor;
        if (sColor && sColor !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(sColor)) sBackground = sColor;
    }
    sWrap.style.background = sBackground;
    Object.assign(sWrap.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: `${sRect.width + sPad * 2}px`,
        height: `${sRect.height + sPad * 2}px`,
        padding: `${sPad}px`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
    });
    sWrap.appendChild(sCopy);
    aHost.appendChild(sWrap);
    aEvent.dataTransfer.setDragImage(sWrap, aEvent.clientX - sRect.left + sPad, aEvent.clientY - sRect.top + sPad);
    setTimeout(() => sWrap.remove());
};

/** Below this the sections' bodies drop to two and one columns (index.scss). */
const NARROW_QUERY = '(max-width: 900px)';

/** How close to the top or bottom of the board a drag must come to scroll it, and how fast at the edge. */
const AUTO_SCROLL_EDGE = 72;
const AUTO_SCROLL_MAX_STEP = 22;

const scrollParent = (aEl: HTMLElement | null): HTMLElement | null => {
    for (let sEl = aEl?.parentElement; sEl; sEl = sEl.parentElement) {
        const sOverflow = getComputedStyle(sEl).overflowY;
        if ((sOverflow === 'auto' || sOverflow === 'scroll') && sEl.scrollHeight > sEl.clientHeight) return sEl;
    }
    return null;
};

/**
 * While something is dragged, holding it near the top or bottom edge of the board scrolls the board,
 * faster the closer it is, so a section can be carried to a place that was scrolled out of view in
 * one drag instead of several.
 */
const useDragAutoScroll = (aOn: boolean, aRootRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        if (!aOn) return;
        let sY: number | undefined;
        let sFrame = 0;
        let sScroller: HTMLElement | null = null;
        const tick = () => {
            sFrame = requestAnimationFrame(tick);
            if (sY === undefined || !sScroller || !getLayoutDrag()) return;
            const sRect = sScroller.getBoundingClientRect();
            const sTop = sY - sRect.top;
            const sBottom = sRect.bottom - sY;
            // Only near an edge inside the board: a pointer past it (over the panel under the board on a
            // narrow window) counted as at the edge and ran the board to its end.
            if (sTop < 0 || sBottom < 0) return;
            if (sTop < AUTO_SCROLL_EDGE) sScroller.scrollTop -= Math.ceil(AUTO_SCROLL_MAX_STEP * (1 - Math.max(0, sTop) / AUTO_SCROLL_EDGE));
            else if (sBottom < AUTO_SCROLL_EDGE) sScroller.scrollTop += Math.ceil(AUTO_SCROLL_MAX_STEP * (1 - Math.max(0, sBottom) / AUTO_SCROLL_EDGE));
        };
        const onOver = (aEvent: DragEvent) => {
            sY = aEvent.clientY;
            if (!sFrame) {
                sScroller = scrollParent(aRootRef.current);
                sFrame = requestAnimationFrame(tick);
            }
        };
        const stop = () => {
            cancelAnimationFrame(sFrame);
            sFrame = 0;
            sY = undefined;
        };
        document.addEventListener('dragover', onOver, true);
        document.addEventListener('dragend', stop, true);
        document.addEventListener('drop', stop, true);
        return () => {
            stop();
            document.removeEventListener('dragover', onOver, true);
            document.removeEventListener('dragend', stop, true);
            document.removeEventListener('drop', stop, true);
        };
    }, [aOn, aRootRef]);
};

const SIZE_TITLES: Record<WidgetSize, string> = { 1: '1 of 4 columns', 2: '2 of 4 columns', 3: '3 of 4 columns', 4: 'The whole row' };

interface LayoutBoardProps {
    pNodes: SectionNode[];
    pEditing: boolean;
    pSelectedId?: string;
    pOnSelect: (aId: string | undefined) => void;
    /** `automatic`: a change the board made by itself (fitting heights), not an edit of the user's. */
    pOnChange: (aNodes: SectionNode[], aOptions?: { automatic?: boolean }) => void;
    pOnRemove: (aId: string) => void;
    pOnRefused: (aReason: string) => void;
    pRenderWidget: (aNode: WidgetNode) => React.ReactNode;
    pWidgetLabel: (aNode: WidgetNode) => string;
    /** Widgets with options get a settings button while editing. */
    pOnConfigure?: (aNode: WidgetNode) => void;
    /** Why this account cannot use a widget, if it cannot. Such widgets stay in place while editing, marked, and are left out once saved. */
    pUnavailable?: (aNode: WidgetNode) => string | undefined;
}

export const LayoutBoard = ({ pNodes, pEditing, pSelectedId, pOnSelect, pOnChange, pOnRemove, pOnRefused, pRenderWidget, pWidgetLabel, pOnConfigure, pUnavailable }: LayoutBoardProps) => {
    const [sDropMark, setDropMark] = useState<string | undefined>(undefined);
    // Height while a section's bottom edge is being dragged; written to the layout on release.
    // `holders`: sections with a set height that grow along when this one outgrows them.
    /** The node whose "⋯" menu is open (only shown when its controls are too narrow to sit in one row). */
    const [sMoreId, setMoreId] = useState<string | undefined>(undefined);
    /** Which way the open menu runs: from a button in the left half of the board, to the right. */
    const [sMoreStart, setMoreStart] = useState(false);
    /** The node being dragged on the board, outlined in the accent colour until it is dropped. */
    const [sDraggingId, setDraggingId] = useState<string | undefined>(undefined);
    const [sLive, setLive] = useState<{ id: string; height: number; holders: { id: string; height: number }[] } | undefined>(undefined);
    const sRootRef = useRef<HTMLDivElement>(null);
    useDragAutoScroll(pEditing, sRootRef);

    useEffect(() => {
        if (!pEditing) setMoreId(undefined);
        if (!sMoreId || !pEditing) return;
        const close = (aEvent: PointerEvent) => {
            if (!(aEvent.target as HTMLElement).closest?.('.nb-ctl-more.is-open')) setMoreId(undefined);
        };
        document.addEventListener('pointerdown', close, true);
        return () => document.removeEventListener('pointerdown', close, true);
    }, [sMoreId, pEditing]);

    /** The body a resize handle sits on (both live in the section's frame). */
    const bodyOf = (aHandle: HTMLElement) => aHandle.parentElement?.querySelector(':scope > .nb-section-body') as HTMLElement | null;

    /**
     * How tall a nested section's body can get inside a parent of fixed height: down to the bottom of
     * the row it sits in. Without the cap the handle kept counting up while the section, held by its
     * parent, stopped growing. A section whose parent grows with its content has no cap.
     */
    /**
     * How tall each row of a section body must stay: a nested section its own height, a widget the
     * smallest a section may be (plus its control bar's room while editing). Rows are read from where
     * the children are drawn.
     */
    const usedHeight = (aBody: HTMLElement) => {
        const sRows = new Map<number, number>();
        [...aBody.children].forEach((aEl) => {
            if (!aEl.classList.contains('nb-node')) return;
            // From the top of its margin: while editing a widget sits lower than a section in the same
            // row (room for its control bar), and it was counted as a row of its own, so a section
            // holding both grew by a whole row on any edit and could not be made shorter.
            const sTop = Math.round(aEl.getBoundingClientRect().top - (parseFloat(getComputedStyle(aEl).marginTop) || 0));
            const sInner = aEl.querySelector(':scope > .nb-section') as HTMLElement | null;
            const sNeed = sInner ? sInner.getBoundingClientRect().height : SECTION_MIN_HEIGHT + (pEditing ? EDIT_BAR_ROOM : 0);
            sRows.set(sTop, Math.max(sRows.get(sTop) ?? 0, sNeed));
        });
        const sStyle = getComputedStyle(aBody);
        const sGap = parseFloat(sStyle.rowGap) || 0;
        const sPadding = (parseFloat(sStyle.paddingTop) || 0) + (parseFloat(sStyle.paddingBottom) || 0);
        return [...sRows.values()].reduce((aSum, aNeed) => aSum + aNeed, 0) + sGap * Math.max(0, sRows.size - 1) + sPadding;
    };

    /**
     * How tall a nested section's body can get: what it is now plus the free space of the nearest
     * section above it that has a set height (sections in between grow with it). Without the cap the
     * handle kept counting up while the section, held by that ancestor, spilled out of it.
     */
    const roomFor = (aBody: HTMLElement | null) => {
        // Space its own row already leaves under it counts too (a tall widget beside it, say), at
        // every level up to the holder.
        let sSlack = 0;
        let sSection = aBody?.closest('.nb-section') as HTMLElement | null;
        while (sSection) {
            const sNode = sSection.closest('.nb-node') as HTMLElement | null;
            const sParent = sNode?.parentElement;
            if (!aBody || !sNode || !sParent?.classList.contains('nb-section-body')) return Infinity;
            // In the holder itself the space its row leaves beside this section (a taller widget next
            // to it) is already in what usedHeight leaves free, which counts the section, not the row:
            // added again, the room came out that much too big and the holder grew that much too little.
            if (sParent.classList.contains('has-height')) return Math.max(SECTION_MIN_HEIGHT, Math.floor(aBody.offsetHeight + sSlack + sParent.clientHeight - usedHeight(sParent)));
            sSlack += Math.max(0, sNode.offsetHeight - sSection.offsetHeight);
            sSection = sParent.closest('.nb-section') as HTMLElement | null;
        }
        return Infinity;
    };

    /** The least a section's body can be: what its rows need, so its nested sections never spill out. */
    const leastFor = (aBody: HTMLElement | null) => (aBody ? Math.ceil(usedHeight(aBody)) : SECTION_MIN_HEIGHT);

    /** A section's height as it will be once saved (what is drawn while editing has the control bars' room added). */
    const savedHeight = (aNode: SectionNode, aBody: HTMLElement | null) => aNode.height ?? (aBody ? aBody.offsetHeight - editExtra(aNode) : SECTION_MIN_HEIGHT);

    /** The nearest section above `aBody` that has a set height (sections in between grow with their content). */
    const holderOf = (aBody: HTMLElement | null) => {
        let sHolder = aBody?.closest('.nb-node')?.parentElement ?? null;
        while (sHolder?.classList.contains('nb-section-body') && !sHolder.classList.contains('has-height')) sHolder = sHolder.closest('.nb-node')?.parentElement ?? null;
        if (!sHolder?.classList.contains('has-height')) return undefined;
        const sId = (sHolder.closest('.nb-section') as HTMLElement | null)?.dataset.sectionId;
        const sFound = sId ? findNode(pNodes, sId) : undefined;
        return sFound?.node.kind === 'section' && sFound.node.height ? { body: sHolder, node: sFound.node } : undefined;
    };

    type Resize = { height: number; holders: { id: string; height: number }[] };

    /**
     * Sizes for a resize of `aNode` to `aWanted` (saved px). It never goes below what its own rows
     * need. Past the room the section holding it leaves, the holder grows by the difference, and past
     * the holder's own room its holder grows, and so on up, so a nested section is never stopped at
     * the edge of a section that could simply get taller.
     */
    const resizePlan = (aNode: SectionNode, aBody: HTMLElement | null) => {
        type Level = { id: string; start: number; room: number; up?: Level };
        const levelOf = (aSection: SectionNode, aSectionBody: HTMLElement | null): Level => {
            const sHolder = holderOf(aSectionBody);
            return {
                id: aSection.id,
                start: savedHeight(aSection, aSectionBody),
                room: Math.min(SECTION_MAX_HEIGHT, roomFor(aSectionBody) - editExtra(aSection)),
                up: sHolder ? levelOf(sHolder.node, sHolder.body) : undefined,
            };
        };
        const sLevel = levelOf(aNode, aBody);
        const sMin = leastFor(aBody) - editExtra(aNode);
        const fit = (aLevel: Level, aWant: number, aHolders: Resize['holders']): number => {
            if (aWant <= aLevel.room || !aLevel.up) return Math.min(aWant, aLevel.room);
            const sUp = aLevel.up;
            const sUpHeight = Math.max(sUp.start, fit(sUp, sUp.start + aWant - aLevel.room, aHolders));
            aHolders.push({ id: sUp.id, height: sUpHeight });
            return Math.min(aWant, aLevel.room + sUpHeight - sUp.start);
        };
        return {
            start: sLevel.start,
            at: (aWanted: number): Resize => {
                const sHolders: Resize['holders'] = [];
                const sHeight = fit(sLevel, Math.max(clampSectionHeight(aWanted), Math.min(sMin, sLevel.room)), sHolders);
                return { height: sHeight, holders: sHolders };
            },
        };
    };

    const commitResize = (aId: string, aSize: Resize, aAutomatic = false) =>
        pOnChange(
            updateNode(aSize.holders.reduce((aNodes, aHolder) => updateNode(aNodes, aHolder.id, { height: aHolder.height }), pNodes), aId, { height: aSize.height }),
            aAutomatic ? { automatic: true } : undefined
        );

    /** The board's shape when it was last fitted, and whether a change to it is still being fitted. */
    const sFittedShape = useRef<string | undefined>(undefined);
    const sFitting = useRef(false);
    /** Whether the window is narrow enough for sections to drop below four columns (index.scss, 900px). */
    const [sNarrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches);
    useEffect(() => {
        const sQuery = window.matchMedia(NARROW_QUERY);
        const onChange = () => setNarrow(sQuery.matches);
        sQuery.addEventListener('change', onChange);
        return () => sQuery.removeEventListener('change', onChange);
    }, []);

    /**
     * After something is added, moved or resized in columns, a section of set height grows when what
     * it now holds needs more room than it has, the same way a resize grows it (and the sections
     * holding it). Without this, adding a section under a widget squeezed the widget's row, down to
     * nothing, and the two drew over each other. Innermost first, one section per render; the next
     * render fits whatever that one moved. Opening Customize changes nothing.
     *
     * Saved heights are for four columns. Laid out in four, the drawn rows are measured (they know how
     * tall widgets and nested sections really are); in fewer (a narrow window) the drawn rows are not
     * the saved ones, so the layout's own least height is used, and the change stays pending until
     * the window is wide again, when the drawn rows are checked once more.
     */
    useLayoutEffect(() => {
        if (!pEditing) {
            sFittedShape.current = undefined;
            sFitting.current = false;
            return;
        }
        const sShape = shapeOf(pNodes);
        if (sFittedShape.current === undefined) sFittedShape.current = sShape;
        else if (sShape !== sFittedShape.current) {
            sFittedShape.current = sShape;
            sFitting.current = true;
        }
        // While a resize is dragged the drawn heights are not the saved ones yet.
        if (!sFitting.current || sLive || !sRootRef.current) return;
        const heightOf = (aId: string) => {
            const sFound = findNode(pNodes, aId)?.node;
            return sFound?.kind === 'section' ? sFound.height : undefined;
        };
        const sBodies = [...sRootRef.current.querySelectorAll<HTMLElement>('.nb-section-body.has-height')].reverse();
        for (const sBody of sBodies) {
            const sId = (sBody.closest('.nb-section') as HTMLElement | null)?.dataset.sectionId;
            const sNode = sId ? findNode(pNodes, sId)?.node : undefined;
            if (sNode?.kind !== 'section' || !sNode.height) continue;
            if (getComputedStyle(sBody).gridTemplateColumns.split(' ').length !== ROW_COLUMNS) {
                const sLeast = clampSectionHeight(leastSavedHeight(sNode));
                if (sLeast <= sNode.height) continue;
                pOnChange(updateNode(pNodes, sNode.id, { height: sLeast }), { automatic: true });
                return;
            }
            if (Math.ceil(usedHeight(sBody)) - sBody.clientHeight <= 1) continue;
            const sSize = resizePlan(sNode, sBody).at(leastFor(sBody) - editExtra(sNode));
            // At the height cap nothing changes, and committing anyway would render forever.
            if (sSize.height === sNode.height && sSize.holders.every((aHolder) => heightOf(aHolder.id) === aHolder.height)) continue;
            commitResize(sNode.id, sSize, true);
            return;
        }
        // Fitted from the layout alone: check the drawn rows once the window is wide again.
        sFitting.current = sNarrow;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pNodes, pEditing, sLive, sNarrow]);

    const startResize = (aEvent: React.PointerEvent<HTMLElement>, aNode: SectionNode) => {
        if (aEvent.button !== 0) return;
        aEvent.preventDefault();
        aEvent.stopPropagation();
        const sPlan = resizePlan(aNode, bodyOf(aEvent.currentTarget));
        const sStartY = aEvent.clientY;
        const sizeAt = (aY: number) => sPlan.at(sPlan.start + aY - sStartY);
        const onMove = (aMove: PointerEvent) => setLive({ id: aNode.id, ...sizeAt(aMove.clientY) });
        const onUp = (aUp: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            setLive(undefined);
            if (Math.abs(aUp.clientY - sStartY) > 2) commitResize(aNode.id, sizeAt(aUp.clientY));
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const apply = (aResult: LayoutResult) => {
        if (aResult.ok) pOnChange(aResult.nodes);
        else pOnRefused(aResult.reason);
    };

    /**
     * Drop the dragged thing into section `aParentId` (top level when undefined) at `aIndex`. With
     * `aRoom` (the free columns of the row it was dropped into) it takes the largest size it supports
     * that fits there, so it fills the gap instead of wrapping to a new row at its default size.
     */
    const dropAt = (aParentId: string | undefined, aIndex: number | undefined, aRoom?: number) => {
        const sPayload = getLayoutDrag();
        setLayoutDrag(undefined);
        setDropMark(undefined);
        // A node moved into another section is mounted anew, so its dragend never reaches the board.
        setDraggingId(undefined);
        if (!sPayload) return;
        const sNode = sPayload.from === 'board' ? undefined : sPayload.create();
        const sId = sNode?.id ?? (sPayload.from === 'board' ? sPayload.id : '');
        const sResult = sNode ? insertNode(pNodes, sNode, aParentId, aIndex) : moveNode(pNodes, sId, aParentId, aIndex);
        if (!sResult.ok) return pOnRefused(sResult.reason);
        const sPlaced = aParentId && aRoom ? fittedSize(sResult.nodes, sId, aRoom) : undefined;
        pOnChange(sPlaced ? updateNode(sResult.nodes, sId, { size: sPlaced }) : sResult.nodes);
        if (sNode?.kind === 'section') pOnSelect(sNode.id);
    };

    /** The largest size node `aId` supports that fits `aRoom` columns, when it differs from its own. */
    const fittedSize = (aNodes: SectionNode[], aId: string, aRoom: number): WidgetSize | undefined => {
        const sNode = findNode(aNodes, aId)?.node;
        if (!sNode) return undefined;
        const sSizes = sNode.kind === 'section' ? SECTION_SIZES : widgetSizes(sNode.type);
        const sFit = sSizes.filter((aSize) => aSize <= aRoom).pop();
        return sFit && sFit !== sNode.size ? sFit : undefined;
    };

    /**
     * Where a drop on a section's empty space lands: at the end of the row under the pointer (or of
     * the last row, below every row), with that row's free columns. Rows are read from where the
     * children are drawn; a full row leaves no room, so the drop keeps its own size.
     */
    const rowDrop = (aEvent: React.DragEvent, aSection: SectionNode) => {
        const sBody = aEvent.currentTarget as HTMLElement;
        const sKids = [...sBody.children].filter((aEl) => aEl.classList.contains('nb-node')) as HTMLElement[];
        if (!sKids.length || sKids.length !== aSection.children.length) return { index: undefined, room: undefined };
        // A widget moved within its own row frees its columns there.
        const sPayload = getLayoutDrag();
        const sMoving = sPayload?.from === 'board' ? sPayload.id : undefined;
        const sRows: { bottom: number; last: number; used: number }[] = [];
        sKids.forEach((aEl, aIndex) => {
            const sRect = aEl.getBoundingClientRect();
            const sRow = sRows[sRows.length - 1];
            const sChild = aSection.children[aIndex];
            const sSpan = sChild.id === sMoving ? 0 : sChild.size;
            if (sRow && sRect.top < sRow.bottom - 1) {
                sRow.last = aIndex;
                sRow.used += sSpan;
                sRow.bottom = Math.max(sRow.bottom, sRect.bottom);
            } else sRows.push({ bottom: sRect.bottom, last: aIndex, used: sSpan });
        });
        const sRow = sRows.find((aRow) => aEvent.clientY <= aRow.bottom) ?? sRows[sRows.length - 1];
        const sRoom = ROW_COLUMNS - sRow.used;
        return { index: sRow === sRows[sRows.length - 1] ? undefined : sRow.last + 1, room: sRoom > 0 ? sRoom : undefined };
    };

    /**
     * Whether `aId` is the node being dragged on the board or inside it: a section cannot go into
     * itself, so nothing there is offered as a place (the drop used to be refused only once made).
     */
    const insideDragged = (aId: string | undefined) => {
        const sPayload = getLayoutDrag();
        if (sPayload?.from !== 'board' || !aId) return false;
        const sDragged = findNode(pNodes, sPayload.id)?.node;
        return !!sDragged && (sDragged.id === aId || (sDragged.kind === 'section' && !!findNode(sDragged.children, aId)));
    };
    /** Over a place the dragged node cannot go: no drop allowed, and no place shown (nor one further out). */
    const refuseOver = (aEvent: React.DragEvent) => {
        aEvent.stopPropagation();
        if (sDropMark !== undefined) setDropMark(undefined);
    };

    const dropProps = (aMark: string, aParentId: string | undefined, aIndex: number | undefined, aSection?: SectionNode) =>
        pEditing
            ? {
                  onDragOver: (aEvent: React.DragEvent) => {
                      if (!getLayoutDrag()) return;
                      if (insideDragged(aParentId)) return refuseOver(aEvent);
                      aEvent.preventDefault();
                      aEvent.stopPropagation();
                      if (sDropMark !== aMark) setDropMark(aMark);
                  },
                  onDrop: (aEvent: React.DragEvent) => {
                      aEvent.preventDefault();
                      aEvent.stopPropagation();
                      if (!aSection) return dropAt(aParentId, aIndex);
                      const { index, room } = rowDrop(aEvent, aSection);
                      dropAt(aParentId, index, room);
                  },
              }
            : {};

    /**
     * Dropping on a node puts the dragged thing before or after it, by which half the pointer is
     * over: left/right for nodes that sit side by side, top/bottom for one that fills its row.
     * Without the "after" half, the last place in a section could only be reached by dropping on the
     * section's empty space.
     */
    const nodeDropProps = (aNodeId: string, aParentId: string | undefined, aIndex: number) => {
        const sideOf = (aEvent: React.DragEvent) => {
            const sEl = aEvent.currentTarget as HTMLElement;
            const sRect = sEl.getBoundingClientRect();
            const sRow = sEl.parentElement?.getBoundingClientRect();
            const sFullRow = !sRow || sRect.width >= sRow.width * 0.9;
            const sAfter = sFullRow ? aEvent.clientY > sRect.top + sRect.height / 2 : aEvent.clientX > sRect.left + sRect.width / 2;
            return { side: sAfter ? 'after' : 'before', axis: sFullRow ? 'y' : 'x' } as const;
        };
        return pEditing
            ? {
                  onDragOver: (aEvent: React.DragEvent) => {
                      if (!getLayoutDrag()) return;
                      if (insideDragged(aNodeId)) return refuseOver(aEvent);
                      aEvent.preventDefault();
                      aEvent.stopPropagation();
                      const { side, axis } = sideOf(aEvent);
                      const sMark = `${side}:${axis}:${aNodeId}`;
                      if (sDropMark !== sMark) setDropMark(sMark);
                  },
                  onDrop: (aEvent: React.DragEvent) => {
                      aEvent.preventDefault();
                      aEvent.stopPropagation();
                      dropAt(aParentId, sideOf(aEvent).side === 'after' ? aIndex + 1 : aIndex);
                  },
              }
            : {};
    };

    /**
     * A press in a field (a section title) selects its text. The nodes around it are draggable, and
     * the browser starts a drag from the nearest one (the drag's target is that node, not the field),
     * so the section moved instead; they stop being draggable until the press ends.
     */
    const holdDragInField = (aEvent: React.PointerEvent) => {
        const sField = (aEvent.target as HTMLElement).closest('input, textarea');
        if (!sField) return;
        const sHeld: HTMLElement[] = [];
        for (let sEl = sField.closest<HTMLElement>('[draggable="true"]'); sEl; sEl = sEl.parentElement?.closest<HTMLElement>('[draggable="true"]') ?? null) {
            sEl.draggable = false;
            sHeld.push(sEl);
        }
        const release = () => {
            sHeld.forEach((aEl) => (aEl.draggable = true));
            window.removeEventListener('pointerup', release, true);
            window.removeEventListener('pointercancel', release, true);
        };
        window.addEventListener('pointerup', release, true);
        window.addEventListener('pointercancel', release, true);
    };

    const dragProps = (aId: string) =>
        pEditing
            ? {
                  draggable: true,
                  onDragStart: (aEvent: React.DragEvent) => {
                      aEvent.stopPropagation();
                      setLayoutDrag({ from: 'board', id: aId });
                      setDraggingId(aId);
                      aEvent.dataTransfer.effectAllowed = 'move';
                      aEvent.dataTransfer.setData('text/plain', aId);
                      setDragPreview(aEvent, aEvent.currentTarget as HTMLElement, sRootRef.current);
                  },
                  onDragEnd: () => {
                      setLayoutDrag(undefined);
                      setDropMark(undefined);
                      setDraggingId(undefined);
                  },
              }
            : {};

    const sizeControl = (aNode: LayoutNode, aSizes: WidgetSize[]) =>
        aSizes.length > 1 ? (
            <span className="nb-sizes" role="group" aria-label="Size">
                {aSizes.map((aSize) => (
                    <button
                        type="button"
                        key={aSize}
                        data-testid={`size-${aSize}`}
                        aria-pressed={aNode.size === aSize}
                        title={SIZE_TITLES[aSize]}
                        onClick={() => pOnChange(updateNode(pNodes, aNode.id, { size: aSize }))}
                    >
                        {aSize}
                    </button>
                ))}
            </span>
        ) : null;

    /**
     * Controls that fold into a "⋯" menu when the node is too narrow for one row (a container query in
     * index.scss decides). Wide enough, the wrappers are `display: contents` and the controls sit inline.
     */
    const moreMenu = (aNode: LayoutNode, aLabel: string, aContent: React.ReactNode) => (
        <span
            className={`nb-ctl-more${sMoreId === aNode.id ? ' is-open' : ''}${sMoreStart ? ' is-align-start' : ''}`}
            // The menu closes on Escape (focus back on its button), once something in it is chosen,
            // and when focus moves out of it; it stayed open behind dialogs and came back later.
            onKeyDown={(aEvent) => {
                if (aEvent.key !== 'Escape' || sMoreId !== aNode.id) return;
                aEvent.stopPropagation();
                setMoreId(undefined);
                (aEvent.currentTarget.querySelector('.nb-ctl-more-btn') as HTMLElement | null)?.focus();
            }}
            onBlur={(aEvent) => {
                if (sMoreId === aNode.id && !aEvent.currentTarget.contains(aEvent.relatedTarget as Node | null)) setMoreId(undefined);
            }}
        >
            <button
                type="button"
                className="nb-icon-btn nb-ctl-more-btn"
                data-testid="more"
                aria-label={`More for ${aLabel}`}
                aria-expanded={sMoreId === aNode.id}
                title="Size and settings"
                onClick={(aEvent) => {
                    const sButton = aEvent.currentTarget.getBoundingClientRect();
                    const sBoard = sRootRef.current?.getBoundingClientRect();
                    setMoreStart(!!sBoard && sButton.left + sButton.width / 2 < sBoard.left + sBoard.width / 2);
                    setMoreId((aPrev) => (aPrev === aNode.id ? undefined : aNode.id));
                }}
            >
                ⋯
            </button>
            <span
                className="nb-ctl-extra"
                data-testid="more-menu"
                // A press on the menu's own padding is not a click outside: it keeps focus (so the menu
                // does not close on blur) and does not select the section underneath.
                onMouseDown={(aEvent) => {
                    if (!(aEvent.target as HTMLElement).closest('button')) aEvent.preventDefault();
                }}
                onClick={(aEvent) => {
                    aEvent.stopPropagation();
                    const sChosen = (aEvent.target as HTMLElement).closest('button');
                    if (!sChosen) return;
                    // Choosing closes the menu, which hides what was chosen: focus goes to the menu's
                    // button, or to the chosen control if the bar no longer folds (a wider size).
                    const sMore = aEvent.currentTarget.parentElement?.querySelector('.nb-ctl-more-btn') as HTMLElement | null;
                    const sMenu = aEvent.currentTarget;
                    setMoreId(undefined);
                    requestAnimationFrame(() => {
                        // A choice that opened a dialog (settings) has moved focus into it; leave it there.
                        const sNow = document.activeElement;
                        if (sNow && sNow !== document.body && !sMenu.contains(sNow)) return;
                        if (sMore?.isConnected && sMore.getClientRects().length) sMore.focus();
                        else if (sChosen.isConnected && sChosen.getClientRects().length) sChosen.focus();
                    });
                }}
            >
                {aContent}
                {/* Shown only when the row is too narrow for the remove button beside the menu. */}
                <span className="nb-ctl-menu-only">{removeButton(aNode, aLabel, 'menu-remove')}</span>
            </span>
        </span>
    );

    const removeButton = (aNode: LayoutNode, aLabel: string, aTestId = 'remove') => (
        <button type="button" className="nb-icon-btn nb-remove" data-testid={aTestId} aria-label={`Remove ${aLabel}`} title={aNode.kind === 'section' ? 'Remove this section and what is in it' : 'Remove from the New tab'} onClick={() => pOnRemove(aNode.id)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        </button>
    );

    const renderNode = (aNode: LayoutNode, aParent: SectionNode | undefined, aIndex: number, aDepth: number): React.ReactNode => {
        // `before:x:id`, `after:y:id` ... while something is dragged over this node.
        const sDropSide = sDropMark?.endsWith(`:${aNode.id}`) ? sDropMark.split(':').slice(0, 2).join('-') : '';
        const sDropClass = (sDropSide ? ` is-drop-${sDropSide}` : '') + (sDraggingId === aNode.id ? ' is-dragging' : '');
        const sSizeClass = aDepth === 0 ? 4 : aNode.size;

        if (aNode.kind === 'widget') {
            const sLabel = pWidgetLabel(aNode);
            const sSizes = widgetSizes(aNode.type);
            const sUnavailable = pEditing ? pUnavailable?.(aNode) : undefined;
            // Beside nested sections in a section of set height: how tall they make its row (index.scss
            // uses it once the window is too narrow for four columns).
            const sBeside = aParent?.height ? besideSections(aParent).get(aNode.id) : undefined;
            return (
                <div
                    key={aNode.id}
                    className={`nb-node nb-span-${sSizeClass} nb-widget${sDropClass}${sUnavailable ? ' is-unavailable' : ''}${sBeside ? ' is-beside-section' : ''}`}
                    style={sBeside ? { ['--nb-row-min' as string]: `${sBeside}px` } : undefined}
                    data-testid={`widget-${encodeURIComponent(aNode.id)}`}
                    data-widget-type={aNode.type}
                    {...dragProps(aNode.id)}
                    {...nodeDropProps(aNode.id, aParent?.id, aIndex)}
                >
                    {pEditing ? (
                        <span className="nb-widget-ctl" data-testid="bar">
                            <span className="nb-grip" data-testid="grip" title="Drag onto another widget to put it before that one" aria-hidden="true">
                                ⋮⋮
                            </span>
                            <span className="nb-widget-label">{sLabel}</span>
                            <button type="button" className="nb-icon-btn nb-move" data-testid="move-earlier" aria-label={`Move ${sLabel} earlier`} title="Move earlier in this section" onClick={() => apply(shiftNode(pNodes, aNode.id, -1))}>
                                ←
                            </button>
                            <button type="button" className="nb-icon-btn nb-move" data-testid="move-later" aria-label={`Move ${sLabel} later`} title="Move later in this section" onClick={() => apply(shiftNode(pNodes, aNode.id, 1))}>
                                →
                            </button>
                            {sSizes.length > 1 || (pOnConfigure && CONFIGURABLE.has(aNode.type))
                                ? moreMenu(
                                      aNode,
                                      sLabel,
                                      <>
                                          {sizeControl(aNode, sSizes)}
                                          {pOnConfigure && CONFIGURABLE.has(aNode.type) ? (
                                              <button type="button" className="nb-icon-btn" data-testid="settings" aria-label={`Settings for ${sLabel}`} title="Settings" onClick={() => pOnConfigure(aNode)}>
                                                  ⚙
                                              </button>
                                          ) : null}
                                      </>
                                  )
                                : null}
                            {removeButton(aNode, sLabel)}
                        </span>
                    ) : null}
                    <div className="nb-widget-body" ref={(aEl) => setInert(aEl, pEditing)}>
                        {sUnavailable ? <p className="nb-widget-unavailable">Not shown to this account. {sUnavailable}.</p> : <WidgetBoundary>{pRenderWidget(aNode)}</WidgetBoundary>}
                    </div>
                </div>
            );
        }

        const sLabel = aNode.title || 'Untitled section';
        const sSelected = pEditing && pSelectedId === aNode.id;
        const sHeight = sLive?.id === aNode.id ? sLive.height : (sLive?.holders.find((aHolder) => aHolder.id === aNode.id)?.height ?? aNode.height);
        return (
            <div key={aNode.id} className={`nb-node nb-span-${sSizeClass}${sDropClass}`} {...dragProps(aNode.id)} {...nodeDropProps(aNode.id, aParent?.id, aIndex)}>
                <section
                    className={`nb-section nb-depth-${Math.min(aDepth, 2)}${aNode.title || pEditing ? '' : ' is-untitled'}${sSelected ? ' is-selected' : ''}${sHeight ? ' has-own-height' : ''}${sDropMark === `end:${aNode.id}` ? ' is-drop-into' : ''}`}
                    data-testid={`section-${encodeURIComponent(aNode.id)}`}
                    data-section-id={aNode.id}
                    aria-label={aNode.title || undefined}
                    onClick={
                        pEditing
                            ? (aEvent) => {
                                  aEvent.stopPropagation();
                                  if (!(aEvent.target as HTMLElement).closest('button, input')) pOnSelect(aNode.id);
                              }
                            : undefined
                    }
                >
                    <div className="nb-section-head" data-testid="head">
                        {pEditing ? (
                            <>
                                <span className="nb-grip" data-testid="grip" title="Drag to move this section" aria-hidden="true">
                                    ⋮⋮
                                </span>
                                <input
                                    className="nb-section-title-input"
                                    data-testid="title"
                                    aria-label="Section title"
                                    value={aNode.title}
                                    placeholder="Untitled section"
                                    maxLength={60}
                                    onFocus={() => pOnSelect(aNode.id)}
                                    onChange={(aEvent) => pOnChange(updateNode(pNodes, aNode.id, { title: aEvent.target.value, note: undefined }))}
                                />
                            </>
                        ) : (
                            <h2>{aNode.title}</h2>
                        )}
                        <span className="nb-section-side">
                            {!pEditing && aNode.note ? <small>{aNode.note}</small> : null}
                            {pEditing ? (
                                <span className="nb-section-ctl">
                                    {aDepth > 0 ? moreMenu(aNode, sLabel, sizeControl(aNode, SECTION_SIZES)) : null}
                                    <button type="button" className="nb-icon-btn nb-move" data-testid="move-up" aria-label={`Move ${sLabel} up`} title="Move up" onClick={() => apply(shiftNode(pNodes, aNode.id, -1))}>
                                        ↑
                                    </button>
                                    <button type="button" className="nb-icon-btn nb-move" data-testid="move-down" aria-label={`Move ${sLabel} down`} title="Move down" onClick={() => apply(shiftNode(pNodes, aNode.id, 1))}>
                                        ↓
                                    </button>
                                    {removeButton(aNode, sLabel)}
                                </span>
                            ) : null}
                        </span>
                    </div>
                    {/* The body and its resize handle share a frame, so the handle stays on the body's bottom
                        edge even when the section is stretched to its row. In Customize the body is also the
                        drop target for "add to the end": the whole section lights up instead of a separate
                        drop zone, which made sections taller while editing than once saved. */}
                    <div className="nb-section-frame">
                        <div
                            data-testid="body"
                            className={`nb-section-body${sHeight ? ' has-height' : ''}${aNode.children.length ? '' : ' is-empty'}${endsWithSection(aNode) ? ' ends-with-section' : ''}`}
                            style={sHeight ? { height: sHeight + (pEditing ? editExtra(aNode) : 0), gridTemplateRows: rowTracks(aNode, sHeight), ['--nb-row-h' as string]: `${widgetRowHeight(aNode, sHeight)}px` } : undefined}
                            data-empty-hint={pEditing && !aNode.children.length ? 'Empty section. Drop a widget here, or select it and press + in the panel.' : undefined}
                            {...dropProps(`end:${aNode.id}`, aNode.id, undefined, aNode)}
                        >
                            {aNode.children.map((aChild, aChildIndex) => renderNode(aChild, aNode, aChildIndex, aDepth + 1))}
                        </div>
                        {pEditing ? (
                            <div
                                className={`nb-section-resize${sLive?.id === aNode.id ? ' is-dragging' : ''}`}
                                data-testid="resize"
                                role="separator"
                                aria-orientation="horizontal"
                                aria-label={`Height of ${sLabel}`}
                                aria-valuenow={sHeight}
                                tabIndex={0}
                                title={sHeight ? `${sHeight}px · drag to change, double-click for automatic height` : 'Drag down to make this section taller'}
                                onPointerDown={(aEvent) => startResize(aEvent, aNode)}
                                onDoubleClick={() => pOnChange(updateNode(pNodes, aNode.id, { height: undefined }))}
                                onKeyDown={(aEvent) => {
                                    if (aEvent.key !== 'ArrowUp' && aEvent.key !== 'ArrowDown') return;
                                    aEvent.preventDefault();
                                    const sPlan = resizePlan(aNode, bodyOf(aEvent.currentTarget));
                                    commitResize(aNode.id, sPlan.at(sPlan.start + (aEvent.key === 'ArrowDown' ? 20 : -20)));
                                }}
                            >
                                <span className="nb-section-resize-grip" aria-hidden="true" />
                                {sLive?.id === aNode.id ? <span className="nb-section-resize-value">{sLive.height}px</span> : null}
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        );
    };

    const insertBar = (aIndex: number) =>
        pEditing ? (
            <div key={`bar-${aIndex}`} className={`nb-insert${sDropMark === `root:${aIndex}` ? ' is-over' : ''}`} data-testid="new-board-insert-bar" {...dropProps(`root:${aIndex}`, undefined, aIndex)}>
                <button
                    type="button"
                    className="nb-insert-btn"
                    data-testid="new-board-insert-section"
                    onClick={(aEvent) => {
                        aEvent.stopPropagation();
                        const sSection = createSection();
                        const sResult = insertNode(pNodes, sSection, undefined, aIndex);
                        if (sResult.ok) {
                            pOnChange(sResult.nodes);
                            pOnSelect(sSection.id);
                        }
                    }}
                >
                    + Add section here
                </button>
            </div>
        ) : null;

    return (
        <div ref={sRootRef} className={`nb-board${pEditing ? ' is-editing' : ''}`} data-testid="board" onPointerDownCapture={pEditing ? holdDragInField : undefined}>
            {insertBar(0)}
            {/* Keyed by the section, so moving one moves its widgets (and focus) with it instead of rebuilding them. */}
            {pNodes.map((aNode, aIndex) => (
                <Fragment key={aNode.id}>
                    {renderNode(aNode, undefined, aIndex, 0)}
                    {insertBar(aIndex + 1)}
                </Fragment>
            ))}
        </div>
    );
};

/** One widget that fails to draw shows a note in its own tile; the board and the app keep going. */
class WidgetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? <p className="nb-widget-unavailable" data-testid="widget-failed">This widget could not be shown. Check its settings, or remove it.</p> : this.props.children;
    }
}
