import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WidgetSize } from '../layout/layoutModel';
import { Group, GroupItem, itemKey } from './groupModel';
import { findMissingItems } from './groupResources';
import { AppIcon } from './AppIcon';
import { useOpenGroupItem } from './useOpenGroupItem';

/** Rows of icons a folder shows before it scrolls, and the fixed cell they are laid out in. */
const FOLDER_ROWS: Record<WidgetSize, number> = { 1: 2, 2: 3, 3: 3, 4: 4 };
// A row with a timer is its tallest (icon, one-line name, switch); sizing by it keeps visible rows whole.
const APP_CELL_HEIGHT = 96;
const APP_ROW_GAP = 4;
const FOLDER_PADDING = 10;

interface GroupWidgetProps {
    pGroup?: Group;
    /** Some groups could not be read, so a group not found is unknown rather than deleted. */
    pPartial?: boolean;
    pSize: WidgetSize;
    pActive: boolean;
    pOnEdit: (aGroup: Group, aMissing: Set<string>) => void;
    pOnAddItems: (aGroup: Group) => void;
}

const LockIcon = () => (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" />
        <path d="M4 5.5V4a2 2 0 014 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
);
const PeopleIcon = () => (
    <svg width="13" height="11" viewBox="0 0 14 12" aria-hidden="true">
        <circle cx="5" cy="4" r="2.3" fill="currentColor" />
        <circle cx="10" cy="4.5" r="1.8" fill="currentColor" opacity=".7" />
        <path d="M.8 11c.4-2.3 2.1-3.6 4.2-3.6S8.8 8.7 9.2 11z" fill="currentColor" />
    </svg>
);
export const GroupGlyph = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".55" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" fill="currentColor" opacity=".55" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
    </svg>
);

export const GroupWidget = ({ pGroup, pPartial, pSize, pActive, pOnEdit, pOnAddItems }: GroupWidgetProps) => {
    const openItem = useOpenGroupItem();
    const [sMissing, setMissing] = useState<Set<string>>(new Set());
    /** The folded actions' menu (a tile too narrow for + and ⋯ side by side shows one ⋯; index.scss decides). */
    // Where the menu opens: under its button, drawn on the page (a portal) so a short tile, which
    // scrolls its content, does not cut it off.
    const [sMenuAt, setMenuAt] = useState<{ top: number; right: number } | undefined>(undefined);
    const sMenuOpen = !!sMenuAt;
    const sMoreRef = useRef<HTMLSpanElement>(null);
    const sMenuRef = useRef<HTMLSpanElement>(null);
    const moreButton = () => sMoreRef.current?.querySelector<HTMLElement>('.nb-group-more-btn') ?? null;
    const closeMenu = (aRefocus = false) => {
        setMenuAt(undefined);
        if (aRefocus) moreButton()?.focus();
    };
    const toggleMenu = () => {
        if (sMenuOpen) return closeMenu();
        const sRect = moreButton()?.getBoundingClientRect();
        if (sRect) setMenuAt({ top: sRect.bottom + 4, right: window.innerWidth - sRect.right });
    };
    /** A choice opens a dialog; focus is put back on ⋯ first, so the dialog gives it back there. */
    const choose = (aAction: () => void) => {
        closeMenu(true);
        aAction();
    };

    useEffect(() => {
        if (!sMenuOpen) return;
        const close = (aEvent: Event) => {
            const sTarget = aEvent.target as Node;
            if (!sMoreRef.current?.contains(sTarget) && !sMenuRef.current?.contains(sTarget)) setMenuAt(undefined);
        };
        // Fixed on the page, it follows its button while the board scrolls (or the tile scrolls the
        // button into view on focus), and closes once the button is out of sight.
        const follow = () => {
            const sButton = moreButton();
            const sRect = sButton?.getBoundingClientRect();
            // Closed once its button cannot be seen: hidden (a wider tile), scrolled out of the board or
            // of a nested section, or under the page header.
            const sSeen = !!sRect && sRect.width > 0 && sButton!.contains(document.elementFromPoint(sRect.left + sRect.width / 2, sRect.top + sRect.height / 2));
            if (!sSeen) return setMenuAt(undefined);
            setMenuAt({ top: sRect.bottom + 4, right: window.innerWidth - sRect.right });
        };
        document.addEventListener('pointerdown', close, true);
        window.addEventListener('scroll', follow, true);
        window.addEventListener('resize', follow);
        // A tile that gets wide enough hides ⋯ (index.scss) without any resize of the window itself.
        const sButton = moreButton();
        const sWatch = typeof ResizeObserver !== 'undefined' && sButton ? new ResizeObserver(follow) : undefined;
        if (sWatch && sButton) sWatch.observe(sButton);
        sMenuRef.current?.querySelector<HTMLElement>('button')?.focus();
        return () => {
            document.removeEventListener('pointerdown', close, true);
            window.removeEventListener('scroll', follow, true);
            window.removeEventListener('resize', follow);
            sWatch?.disconnect();
        };
    }, [sMenuOpen]);
    const sItemsKey = pGroup?.items.map(itemKey).join('|') ?? '';

    // Check the shortcuts against the server whenever the group changes or the tab comes back.
    useEffect(() => {
        if (!pGroup || !pActive) return;
        let sAlive = true;
        findMissingItems(pGroup.items).then((aMissing) => sAlive && setMissing(aMissing));
        return () => {
            sAlive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sItemsKey, pActive]);

    if (!pGroup && pPartial) {
        return (
            <div className="nb-tile nb-group nb-group--gone" data-testid="new-board-group-unread">
                This group could not be read right now. Reload the page to try again.
            </div>
        );
    }
    if (!pGroup) {
        return <div className="nb-tile nb-group nb-group--gone">This group was deleted.</div>;
    }

    // Every item is drawn; the size sets how many rows of icons show before the folder scrolls.
    const sVisibleRows = FOLDER_ROWS[pSize];
    const sGridHeight = sVisibleRows * APP_CELL_HEIGHT + (sVisibleRows - 1) * APP_ROW_GAP + 2 * FOLDER_PADDING;
    const sMissingCount = pGroup.items.filter((aItem) => sMissing.has(itemKey(aItem))).length;

    const open = async (aItem: GroupItem) => {
        const sFound = await openItem(aItem);
        if (!sFound) setMissing((aPrev) => new Set(aPrev).add(itemKey(aItem)));
    };

    return (
        <div className="nb-tile nb-group" style={{ ['--nb-group-color' as string]: pGroup.color }} data-testid="new-board-group">
            <div className="nb-group-head">
                <span className="nb-group-mark">
                    <GroupGlyph />
                </span>
                <span className="nb-group-name">
                    <b>{pGroup.name}</b>
                    {/* The caption shares the count's line, so a captioned group's items start where any other group's do. */}
                    <small title={pGroup.caption}>
                        {pGroup.items.length} item{pGroup.items.length === 1 ? '' : 's'}
                        {sMissingCount ? <span className="nb-warn"> · {sMissingCount} not found</span> : null}
                        {pGroup.caption ? <span className="nb-group-caption"> · {pGroup.caption}</span> : null}
                    </small>
                </span>
                <span className="nb-vis" title={pGroup.visibility === 'shared' ? 'Every account on this server can use this group' : 'Only your account sees this group'}>
                    {pGroup.visibility === 'shared' ? <PeopleIcon /> : <LockIcon />}
                    <span className="nb-vis-text">{pGroup.visibility === 'shared' ? 'Shared' : 'Only me'}</span>
                </span>
                <span className="nb-group-actions">
                    <button type="button" className="nb-icon-btn" title="Add items" aria-label={`Add items to ${pGroup.name}`} data-testid="new-board-group-add" onClick={() => pOnAddItems(pGroup)}>
                        +
                    </button>
                    <button type="button" className="nb-icon-btn" title="Edit group" aria-label={`Edit ${pGroup.name}`} data-testid="new-board-group-edit" onClick={() => pOnEdit(pGroup, sMissing)}>
                        ⋯
                    </button>
                </span>
                <span ref={sMoreRef} className={`nb-group-more${sMenuOpen ? ' is-open' : ''}`}>
                    <button
                        type="button"
                        className="nb-icon-btn nb-group-more-btn"
                        title="Group actions"
                        aria-label={`Actions for ${pGroup.name}`}
                        aria-haspopup="menu"
                        aria-expanded={sMenuOpen}
                        data-testid="new-board-group-more"
                        onClick={toggleMenu}
                    >
                        ⋯
                    </button>
                    {sMenuAt
                        ? createPortal(
                              <span
                                  ref={sMenuRef}
                                  className="nb-group-menu"
                                  role="menu"
                                  aria-label={`Actions for ${pGroup.name}`}
                                  data-testid="new-board-group-menu"
                                  style={{ position: 'fixed', top: sMenuAt.top, right: sMenuAt.right }}
                                  onKeyDown={(aEvent) => {
                                      if (aEvent.key === 'Escape' || aEvent.key === 'Tab') {
                                          aEvent.preventDefault();
                                          aEvent.stopPropagation();
                                          closeMenu(true);
                                          return;
                                      }
                                      if (aEvent.key !== 'ArrowDown' && aEvent.key !== 'ArrowUp') return;
                                      aEvent.preventDefault();
                                      const sItems = [...aEvent.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
                                      const sAt = sItems.indexOf(document.activeElement as HTMLElement);
                                      sItems[(sAt + (aEvent.key === 'ArrowDown' ? 1 : -1) + sItems.length) % sItems.length]?.focus();
                                  }}
                              >
                                  <button type="button" role="menuitem" data-testid="new-board-group-add" onClick={() => choose(() => pOnAddItems(pGroup))}>
                                      Add items
                                  </button>
                                  <button type="button" role="menuitem" data-testid="new-board-group-edit" onClick={() => choose(() => pOnEdit(pGroup, sMissing))}>
                                      Edit group
                                  </button>
                              </span>,
                              document.body
                          )
                        : null}
                </span>
            </div>
            {pGroup.items.length ? (
                <div
                    className="nb-folder"
                    // A tile stretched by a taller neighbour shows more rows before it scrolls.
                    style={{ flexBasis: sGridHeight, height: sGridHeight }}
                    data-testid="new-board-group-items"
                >
                    {pGroup.items.map((aItem) => (
                        <AppIcon
                            key={itemKey(aItem)}
                            pItem={aItem}
                            pMissing={sMissing.has(itemKey(aItem))}
                            pActive={pActive}
                            pOnOpen={() => open(aItem)}
                        />
                    ))}
                    <button type="button" className="nb-app nb-app--add" title="Add items" onClick={() => pOnAddItems(pGroup)}>
                        <span className="nb-app-icon">+</span>
                        <span className="nb-app-label">Add</span>
                    </button>
                </div>
            ) : (
                <button type="button" className="nb-group-empty" onClick={() => pOnAddItems(pGroup)}>
                    <span className="nb-app-icon nb-app-icon--ghost">+</span>
                    Add files, folders, packages, timers and more
                </button>
            )}
        </div>
    );
};
