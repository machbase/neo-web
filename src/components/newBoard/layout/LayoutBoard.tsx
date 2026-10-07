import { useEffect, useRef, useState } from 'react';
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

/** A section's children in grid rows: packed in order, a node that does not fit starts the next row. */
const packRows = (aSection: SectionNode): LayoutNode[][] => {
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

/**
 * How much taller section `aSection` is while editing than once saved: each row holding a widget gets
 * room for the control bars, plus whatever its tallest nested section gains. A section with a set
 * height grows by this while editing, so its widgets keep exactly the height they will have saved.
 */
const editExtra = (aSection: SectionNode): number =>
    (endsWithSection(aSection) ? EDIT_FOOT_ROOM : 0) +
    packRows(aSection).reduce(
        (aSum, aRow) =>
            aSum + (aRow.some((aNode) => aNode.kind === 'widget') ? EDIT_BAR_ROOM : 0) + Math.max(0, ...aRow.map((aNode) => (aNode.kind === 'section' ? editExtra(aNode) + EDIT_NEST_PAD : 0))),
        0
    );

/**
 * Row tracks for a section with a set height. A row holding a nested section is as tall as that
 * section (its set height, or its content); rows of widgets share what is left, and with none the
 * rest stays empty at the bottom. (All rows sharing equally held a nested section to its share: it
 * could not grow into space left under the sections below it, and one without a set height was
 * squeezed until its own sections spilled out.)
 */
const rowTracks = (aSection: SectionNode) =>
    packRows(aSection)
        .map((aRow) => (aRow.some((aNode) => aNode.kind === 'section') ? 'auto' : 'minmax(0, 1fr)'))
        .join(' ');

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
    pOnChange: (aNodes: SectionNode[]) => void;
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
    const [sLive, setLive] = useState<{ id: string; height: number; holders: { id: string; height: number }[] } | undefined>(undefined);
    const sRootRef = useRef<HTMLDivElement>(null);
    useDragAutoScroll(pEditing, sRootRef);

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
            const sTop = Math.round(aEl.getBoundingClientRect().top);
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
            sSlack += Math.max(0, sNode.offsetHeight - sSection.offsetHeight);
            if (sParent.classList.contains('has-height')) return Math.max(SECTION_MIN_HEIGHT, Math.floor(aBody.offsetHeight + sSlack + sParent.clientHeight - usedHeight(sParent)));
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

    const commitResize = (aId: string, aSize: Resize) =>
        pOnChange(updateNode(aSize.holders.reduce((aNodes, aHolder) => updateNode(aNodes, aHolder.id, { height: aHolder.height }), pNodes), aId, { height: aSize.height }));

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

    const dropProps = (aMark: string, aParentId: string | undefined, aIndex: number | undefined, aSection?: SectionNode) =>
        pEditing
            ? {
                  onDragOver: (aEvent: React.DragEvent) => {
                      if (!getLayoutDrag()) return;
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

    const dragProps = (aId: string) =>
        pEditing
            ? {
                  draggable: true,
                  onDragStart: (aEvent: React.DragEvent) => {
                      if ((aEvent.target as HTMLElement).closest('input')) return;
                      aEvent.stopPropagation();
                      setLayoutDrag({ from: 'board', id: aId });
                      aEvent.dataTransfer.effectAllowed = 'move';
                      aEvent.dataTransfer.setData('text/plain', aId);
                  },
                  onDragEnd: () => {
                      setLayoutDrag(undefined);
                      setDropMark(undefined);
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
                        aria-pressed={aNode.size === aSize}
                        title={SIZE_TITLES[aSize]}
                        onClick={() => pOnChange(updateNode(pNodes, aNode.id, { size: aSize }))}
                    >
                        {aSize}
                    </button>
                ))}
            </span>
        ) : null;

    const removeButton = (aNode: LayoutNode, aLabel: string) => (
        <button type="button" className="nb-icon-btn nb-remove" aria-label={`Remove ${aLabel}`} title={aNode.kind === 'section' ? 'Remove this section and what is in it' : 'Remove from the New tab'} onClick={() => pOnRemove(aNode.id)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        </button>
    );

    const renderNode = (aNode: LayoutNode, aParent: SectionNode | undefined, aIndex: number, aDepth: number): React.ReactNode => {
        // `before:x:id`, `after:y:id` ... while something is dragged over this node.
        const sDropSide = sDropMark?.endsWith(`:${aNode.id}`) ? sDropMark.split(':').slice(0, 2).join('-') : '';
        const sDropClass = sDropSide ? ` is-drop-${sDropSide}` : '';
        const sSizeClass = aDepth === 0 ? 4 : aNode.size;

        if (aNode.kind === 'widget') {
            const sLabel = pWidgetLabel(aNode);
            const sSizes = widgetSizes(aNode.type);
            const sUnavailable = pEditing ? pUnavailable?.(aNode) : undefined;
            return (
                <div
                    key={aNode.id}
                    className={`nb-node nb-span-${sSizeClass} nb-widget${sDropClass}${sUnavailable ? ' is-unavailable' : ''}`}
                    data-testid={`new-board-widget-${aNode.type}`}
                    {...dragProps(aNode.id)}
                    {...nodeDropProps(aNode.id, aParent?.id, aIndex)}
                >
                    {pEditing ? (
                        <span className="nb-widget-ctl">
                            <span className="nb-grip" title="Drag onto another widget to put it before that one" aria-hidden="true">
                                ⋮⋮
                            </span>
                            <span className="nb-widget-label">{sLabel}</span>
                            <button type="button" className="nb-icon-btn" aria-label={`Move ${sLabel} earlier`} title="Move earlier in this section" onClick={() => apply(shiftNode(pNodes, aNode.id, -1))}>
                                ←
                            </button>
                            <button type="button" className="nb-icon-btn" aria-label={`Move ${sLabel} later`} title="Move later in this section" onClick={() => apply(shiftNode(pNodes, aNode.id, 1))}>
                                →
                            </button>
                            {sizeControl(aNode, sSizes)}
                            {pOnConfigure && CONFIGURABLE.has(aNode.type) ? (
                                <button type="button" className="nb-icon-btn" aria-label={`Settings for ${sLabel}`} title="Settings" onClick={() => pOnConfigure(aNode)}>
                                    ⚙
                                </button>
                            ) : null}
                            {removeButton(aNode, sLabel)}
                        </span>
                    ) : null}
                    <div className="nb-widget-body" ref={(aEl) => setInert(aEl, pEditing)}>
                        {sUnavailable ? <p className="nb-widget-unavailable">Not shown to this account. {sUnavailable}.</p> : pRenderWidget(aNode)}
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
                    data-testid="new-board-section"
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
                    <div className="nb-section-head">
                        {pEditing ? (
                            <>
                                <span className="nb-grip" title="Drag to move this section" aria-hidden="true">
                                    ⋮⋮
                                </span>
                                <input
                                    className="nb-section-title-input"
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
                                    {aDepth > 0 ? sizeControl(aNode, SECTION_SIZES) : null}
                                    <button type="button" className="nb-icon-btn" aria-label={`Move ${sLabel} up`} title="Move up" onClick={() => apply(shiftNode(pNodes, aNode.id, -1))}>
                                        ↑
                                    </button>
                                    <button type="button" className="nb-icon-btn" aria-label={`Move ${sLabel} down`} title="Move down" onClick={() => apply(shiftNode(pNodes, aNode.id, 1))}>
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
                            className={`nb-section-body${sHeight ? ' has-height' : ''}${aNode.children.length ? '' : ' is-empty'}${endsWithSection(aNode) ? ' ends-with-section' : ''}`}
                            style={sHeight ? { height: sHeight + (pEditing ? editExtra(aNode) : 0), gridTemplateRows: rowTracks(aNode) } : undefined}
                            data-empty-hint={pEditing && !aNode.children.length ? 'Empty section. Drop a widget here, or select it and press + in the panel.' : undefined}
                            {...dropProps(`end:${aNode.id}`, aNode.id, undefined, aNode)}
                        >
                            {aNode.children.map((aChild, aChildIndex) => renderNode(aChild, aNode, aChildIndex, aDepth + 1))}
                        </div>
                        {pEditing ? (
                            <div
                                className={`nb-section-resize${sLive?.id === aNode.id ? ' is-dragging' : ''}`}
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
            <div key={`bar-${aIndex}`} className={`nb-insert${sDropMark === `root:${aIndex}` ? ' is-over' : ''}`} {...dropProps(`root:${aIndex}`, undefined, aIndex)}>
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
        <div ref={sRootRef} className={`nb-board${pEditing ? ' is-editing' : ''}`}>
            {insertBar(0)}
            {pNodes.map((aNode, aIndex) => [renderNode(aNode, undefined, aIndex, 0), insertBar(aIndex + 1)])}
        </div>
    );
};
