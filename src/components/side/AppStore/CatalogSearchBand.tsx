// -----------------------------------------------------------------------------
// THE CATALOG SEARCH BAND
// -----------------------------------------------------------------------------
// A one-line band that is a LABEL until it is wanted and an input after that. It
// replaced a permanently open text box, which cost the same vertical space
// whether or not anyone was searching — in a panel this narrow, that box was the
// difference between seeing two package cards and seeing three.
//
// A NON-EMPTY QUERY PINS IT OPEN. Collapsing back to "Search" while a filter is
// still applied would hide the reason the list is short, and the user would be
// looking at a catalog that is quietly lying about how many packages exist.

import './CatalogSearchBand.scss';
import { useEffect, useRef, useState } from 'react';
import { VscSearch } from 'react-icons/vsc';

export interface CatalogSearchBandProps {
    pValue: string;
    onChange: (value: string) => void;
    /** Enter in the field — the panel uses it to force an immediate re-search. */
    onEnter?: () => void;
}

export const CatalogSearchBand = ({ pValue, onChange, onEnter }: CatalogSearchBandProps) => {
    const [sOpened, setOpened] = useState<boolean>(false);
    const [sFocused, setFocused] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    // Set by the click/keyboard path only, and consumed by the effect below.
    const wantFocusRef = useRef<boolean>(false);

    const isExpanded = sOpened || pValue !== '';

    // HOVER EXPANDS, IT DOES NOT FOCUS — and that is a deliberate departure from
    // "hover/click expands + autofocuses".
    //
    // This panel sits beside the editor. Focusing on hover means a mouse crossing
    // the sidebar on its way somewhere else silently captures the next keystroke,
    // and the character the user meant for their SQL lands in the package filter.
    // Pointing at the band is not a request to type in it; clicking it is.
    useEffect(() => {
        if (isExpanded && wantFocusRef.current) {
            wantFocusRef.current = false;
            inputRef.current?.focus();
        }
    }, [isExpanded]);

    const expandAndFocus = () => {
        wantFocusRef.current = true;
        setOpened(true);
        // Already expanded (hovered, or pinned by a query): the effect will not
        // re-run, so focus here instead.
        inputRef.current?.focus();
    };

    const collapseIfIdle = () => {
        // The guard is the whole contract: only an EMPTY, unfocused band folds up.
        if (!sFocused && pValue === '') setOpened(false);
    };

    if (!isExpanded) {
        return (
            <div className="catalog-search-band" onMouseEnter={() => setOpened(true)}>
                <button type="button" className="catalog-search-band-trigger" onClick={expandAndFocus} aria-label="Search packages">
                    <VscSearch size={13} aria-hidden="true" />
                    <span className="catalog-search-band-hint">Search</span>
                </button>
            </div>
        );
    }

    return (
        <div className="catalog-search-band catalog-search-band--open" onMouseLeave={collapseIfIdle}>
            <VscSearch size={13} className="catalog-search-band-icon" aria-hidden="true" />
            <input
                ref={inputRef}
                type="text"
                className="catalog-search-band-input"
                placeholder="Search"
                aria-label="Search packages"
                value={pValue}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false);
                    if (pValue === '') setOpened(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onEnter?.();
                    if (e.key === 'Escape') {
                        // Escape clears AND folds up in one press. Clearing alone
                        // would leave an empty open field that only collapses once
                        // the pointer happens to leave it.
                        onChange('');
                        setOpened(false);
                        e.currentTarget.blur();
                    }
                }}
            />
        </div>
    );
};
