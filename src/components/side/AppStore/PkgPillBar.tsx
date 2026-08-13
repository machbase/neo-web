// -----------------------------------------------------------------------------
// THE PILL SWITCHER — what the App Store panel is currently showing
// -----------------------------------------------------------------------------
// One fixed catalog chip, then one pill per opened package, in the order they
// were opened. It is a TAB BAR, not a breadcrumb: the pills do not nest, and
// closing one never changes what another one points at.
//
// The catalog chip is deliberately NOT one of the pills. It cannot be closed and
// it is pinned outside the scroller, so giving it a pill's markup would mean
// rendering a close button that must then be suppressed — a conditional to keep
// in sync forever, in exchange for one shared border-radius.

import './PkgPillBar.scss';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VscClose, VscExtensions } from 'react-icons/vsc';
import { pillLabel } from './pkgViews';

export interface PkgPillBarProps {
    /** Opened package names, in open order. */
    pOpen: string[];
    /** Active pill, or `null` for the catalog. */
    pActive: string | null;
    onSelect: (name: string | null) => void;
    onClose: (name: string) => void;
}

export const PkgPillBar = ({ pOpen, pActive, onSelect, onClose }: PkgPillBarProps) => {
    const activeRef = useRef<HTMLButtonElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    // Which sides have pills hidden past the edge. Drives the fade masks — the
    // bar's only signal that it scrolls at all, since its scrollbar is hidden.
    const [sEdges, setEdges] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

    const measure = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        // 1px slack: sub-pixel layout leaves scrollLeft a hair short of `max` at
        // the far right, which would keep the fade painted over nothing.
        setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
    }, []);

    // Opening a package that is already several pills off the right edge would
    // otherwise switch the view to something the user cannot see. `inline:
    // 'nearest'` scrolls the bar only as far as it must and never moves the page.
    //
    // Optional-called because jsdom does not implement scrollIntoView; the guard
    // is what keeps the component renderable under test rather than a courtesy.
    useEffect(() => {
        activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        measure();
    }, [pActive, pOpen.length, measure]);

    // The panel is resizable, so overflow appears and disappears without the pill
    // list changing at all — a width change alone has to re-measure.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure]);

    return (
        <div
            className={`pkg-pill-bar${sEdges.left ? ' pkg-pill-bar--fade-left' : ''}${sEdges.right ? ' pkg-pill-bar--fade-right' : ''}`}
            role="tablist"
            aria-label="Open packages"
        >
            {/* PINNED, AND OUTSIDE THE SCROLLER BELOW. The way back to the catalog
                must not be something the user has to scroll the bar to find — with
                a few packages open it was the first thing to slide out of view,
                which is exactly when it is most needed. */}
            <button
                type="button"
                role="tab"
                ref={pActive === null ? activeRef : undefined}
                aria-selected={pActive === null}
                className={`pkg-pill-bar-catalog${pActive === null ? ' pkg-pill-bar-catalog--active' : ''}`}
                title="Catalog"
                onClick={() => onSelect(null)}
            >
                <VscExtensions size={14} />
            </button>

            {/* THE PINNED / SCROLLING SEAM, MADE VISIBLE.
                The chip does not move and everything to its right does, and with
                nothing between them the bar read as one row of chips that had
                simply been cut off at the left. This rule is where the fixed region
                ends — it is the vertical counterpart of the bar's own bottom
                border. Presentational only, hence aria-hidden. */}
            <span className="pkg-pill-bar-divider" aria-hidden="true" />

            <div
                className="pkg-pill-bar-scroll"
                ref={scrollRef}
                onScroll={measure}
                // A WHEEL OVER A HORIZONTAL-ONLY SCROLLER DOES NOTHING BY DEFAULT.
                // Browsers map wheel deltaY to vertical scrolling, and this element
                // has no vertical overflow, so the gesture fell through to the page
                // and the bar simply refused to move. Same conversion the main-area
                // tab strip already does (MainContent.handleMouseWheel).
                onWheel={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollWidth <= el.clientWidth) return;
                    el.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
                }}
            >
                {pOpen.map((name) => {
                    const isActive = pActive === name;
                    return (
                        <span key={name} className={`pkg-pill${isActive ? ' pkg-pill--active' : ''}`}>
                            <button
                                type="button"
                                role="tab"
                                ref={isActive ? activeRef : undefined}
                                aria-selected={isActive}
                                className="pkg-pill-select"
                                title={name}
                                onClick={() => onSelect(name)}
                            >
                                <span className="pkg-pill-label">{pillLabel(name)}</span>
                            </button>
                            {/* Its own button, outside the selecting one — a <button>
                                inside a <button> is invalid HTML and browsers resolve it
                                by dropping one of them. stopPropagation is still needed
                                for the pill's own click handling. */}
                            <button
                                type="button"
                                className="pkg-pill-close"
                                aria-label={`Close ${name}`}
                                title={`Close ${name}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose(name);
                                }}
                            >
                                <VscClose size={11} />
                            </button>
                        </span>
                    );
                })}
            </div>
        </div>
    );
};
