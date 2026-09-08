import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Checkmark, Close, GoDatabase, LuDatabaseBackup, VscChevronDown, VscWarning } from '@/assets/icons/Icon';
import { formatUsedAgo } from '@/utils/targetDatabaseStore';
import { isDatabaseNameSafe } from '@/utils/sqlTargetDatabase';
import type { TargetDatabaseEntry } from './useTargetDatabases';
import './TargetDatabaseChip.scss';

const MENU_WIDTH = 286;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * One navigable line in the menu. The three shapes share a list so `↑` / `↓` crosses the Clear row
 * without the caller tracking two indices.
 */
type MenuEntry = { kind: 'session'; name: string; db?: TargetDatabaseEntry } | { kind: 'database'; db: TargetDatabaseEntry } | { kind: 'clear' };

export interface TargetDatabaseChipProps {
    /** The database this session is connected to — what runs when nothing is picked. */
    sessionDatabase: string;
    databases: TargetDatabaseEntry[];
    /** The picked database, or null for "no override, use the session database". */
    value: string | null;
    onChange: (aDatabase: string | null) => void;
    /** Re-read the catalogue. Called on every open so a database created elsewhere shows up. */
    onOpen: () => void;
}

const matches = (aName: string, aQuery: string) => aName.toUpperCase().includes(aQuery.trim().toUpperCase());

const isSameName = (aLeft: string | null | undefined, aRight: string | null | undefined) =>
    !!aLeft && !!aRight && aLeft.toUpperCase() === aRight.toUpperCase();

/**
 * The session row and Clear always apply; a database row only when the value would survive the
 * whole trip. `isDatabaseNameSafe` is the last of the three: `use()` takes an argument position,
 * so `applyTargetDatabase` drops a name that is not a plain identifier — and a row that silently
 * did nothing when picked would be the worst failure this control could have.
 */
const isSelectable = (aEntry: MenuEntry) =>
    aEntry.kind !== 'database' || (aEntry.db.canUse && aEntry.db.hasPrivilege && isDatabaseNameSafe(aEntry.db.name));

export const TargetDatabaseChip = ({ sessionDatabase, databases, value, onChange, onOpen }: TargetDatabaseChipProps) => {
    const [sOpen, setOpen] = useState(false);
    const [sQuery, setQuery] = useState('');
    const [sFocused, setFocused] = useState(0);
    const [sPosition, setPosition] = useState({ top: 0, left: 0 });
    const sChipRef = useRef<HTMLDivElement>(null);
    const sMenuRef = useRef<HTMLDivElement>(null);
    const sInputRef = useRef<HTMLInputElement>(null);

    const sNotFound = !!value && databases.length > 0 && !databases.some((aDb) => isSameName(aDb.name, value));

    /**
     * One flat list, in catalogue order — which already puts the attached backups last, since
     * `V$DATABASES` is read `order by KIND, DATABASE_ID`. The session database leads it because
     * that is where a query goes when nothing is picked.
     */
    const sEntries = useMemo<MenuEntry[]>(() => {
        const sList: MenuEntry[] = [];
        if (sessionDatabase && matches(sessionDatabase, sQuery))
            sList.push({ kind: 'session', name: sessionDatabase, db: databases.find((aDb) => isSameName(aDb.name, sessionDatabase)) });
        databases
            .filter((aDb) => !isSameName(aDb.name, sessionDatabase) && matches(aDb.name, sQuery))
            .forEach((aDb) => sList.push({ kind: 'database', db: aDb }));
        if (value) sList.push({ kind: 'clear' });
        return sList;
    }, [databases, sessionDatabase, sQuery, value]);

    const close = useCallback(() => {
        setOpen(false);
        setQuery('');
    }, []);

    const apply = useCallback(
        (aEntry: MenuEntry | undefined) => {
            if (!aEntry || !isSelectable(aEntry)) return;
            // Picking the session database and pressing Clear are the same act: drop the override.
            if (aEntry.kind === 'session' || aEntry.kind === 'clear') onChange(null);
            else onChange(aEntry.db.name);
            close();
            sChipRef.current?.focus();
        },
        [onChange, close]
    );

    const toggle = useCallback(() => {
        // Refresh outside the state updater: React may run an updater twice, and this one talks to
        // the server.
        if (!sOpen) onOpen();
        setOpen(!sOpen);
        if (sOpen) setQuery('');
    }, [sOpen, onOpen]);

    /** Anchor the menu to the chip's right edge — it is wider than the chip and sits near the pane edge. */
    useLayoutEffect(() => {
        if (!sOpen) return;
        const sRect = sChipRef.current?.getBoundingClientRect();
        if (!sRect) return;
        const sLeft = Math.max(VIEWPORT_MARGIN, Math.min(sRect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN));
        setPosition({ top: sRect.bottom + MENU_GAP, left: sLeft });
        setFocused(0);
        sInputRef.current?.focus();
    }, [sOpen]);

    useEffect(() => {
        if (!sOpen) return;
        const handlePointer = (aEvent: MouseEvent) => {
            const sTarget = aEvent.target as Node;
            if (sChipRef.current?.contains(sTarget) || sMenuRef.current?.contains(sTarget)) return;
            close();
        };
        const handleKey = (aEvent: KeyboardEvent) => {
            if (aEvent.key === 'Escape') {
                aEvent.stopPropagation();
                close();
                sChipRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey, true);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey, true);
        };
    }, [sOpen, close]);

    /** The filter can shrink the list under the cursor. */
    useEffect(() => {
        setFocused((aPrev) => Math.min(aPrev, Math.max(0, sEntries.length - 1)));
    }, [sEntries.length]);

    /** Arrow keys step over the rows the server would refuse, so `enter` is never a dead end. */
    const step = useCallback(
        (aFrom: number, aDirection: 1 | -1) => {
            if (sEntries.length === 0) return 0;
            let sNext = aFrom;
            for (let sHop = 0; sHop < sEntries.length; sHop += 1) {
                sNext = (sNext + aDirection + sEntries.length) % sEntries.length;
                if (isSelectable(sEntries[sNext])) return sNext;
            }
            return aFrom;
        },
        [sEntries]
    );

    const handleMenuKeyDown = (aEvent: React.KeyboardEvent<HTMLInputElement>) => {
        if (aEvent.key === 'ArrowDown') {
            aEvent.preventDefault();
            setFocused((aPrev) => step(aPrev, 1));
        } else if (aEvent.key === 'ArrowUp') {
            aEvent.preventDefault();
            setFocused((aPrev) => step(aPrev, -1));
        } else if (aEvent.key === 'Enter') {
            aEvent.preventDefault();
            apply(sEntries[sFocused]);
        }
    };

    const handleChipKeyDown = (aEvent: React.KeyboardEvent<HTMLDivElement>) => {
        if (aEvent.key === 'Enter' || aEvent.key === ' ' || aEvent.key === 'ArrowDown') {
            aEvent.preventDefault();
            toggle();
        }
    };

    const sLabel = value ?? sessionDatabase;
    const sChipClass = ['target-db__chip', value ? 'target-db__chip--set' : 'target-db__chip--unset', sOpen ? 'target-db__chip--open' : '', sNotFound ? 'target-db__chip--not-found' : '']
        .filter(Boolean)
        .join(' ');

    /**
     * The chip is the last word, not the only one. Precedence, measured against a v8.7 server:
     * a `db.user.table` name in the statement beats `use()` in both directions, and between the
     * two sources of `use()` the statement's own `-- env: use=` beats this control.
     */
    const sChipTitle = sNotFound
        ? `database not found: ${value}`
        : value
          ? `${value} — unless a statement names \`db.user.table\` or carries \`-- env: use=\``
          : `session database ${sessionDatabase} — unless a statement says otherwise`;

    /**
     * The second line only appears when there is something to say about a database — an ordinary
     * active one needs no caption, and inventing one for the sake of even row heights would be
     * noise rather than information.
     */
    const renderMeta = (aEntry: MenuEntry) => {
        if (aEntry.kind === 'clear') return '';
        const sDb = aEntry.db;
        const sParts: string[] = [];
        if (aEntry.kind === 'session') sParts.push('session database');
        // The caption follows `canUse`, not `mounted`, because the server's refusal is temporary:
        // it blocks `use()` on a mounted database to keep DML out, and lifts once DML is handled
        // there. When `CAN_USE` flips to 1 this row starts reading "mounted · read only" and
        // becomes selectable, with nothing here to change.
        else if (sDb?.mounted) sParts.push(sDb.canUse ? 'mounted · read only' : 'mounted · cannot be a target yet');
        else if (sDb && !sDb.canUse) sParts.push('not an active database');
        else if (sDb?.readOnly) sParts.push('read only');
        if (sDb && !sDb.hasPrivilege) sParts.push('no connect privilege');
        if (sDb && !isDatabaseNameSafe(sDb.name)) sParts.push('name cannot be used as a target');
        if (sDb?.lastUsedAt && aEntry.kind !== 'session' && isSelectable(aEntry)) sParts.push(formatUsedAgo(sDb.lastUsedAt));
        return sParts.join(' · ');
    };

    const renderRow = (aEntry: MenuEntry, aIndex: number) => {
        const sName = aEntry.kind === 'session' ? aEntry.name : aEntry.kind === 'database' ? aEntry.db.name : '';
        // The session row is also "selected" when a restored override happens to name it — the
        // session default can move to the database a worksheet was already pointing at.
        const sSelected = aEntry.kind === 'session' ? !value || isSameName(sName, value) : isSameName(sName, value);
        const sUnusable = !isSelectable(aEntry);
        const sMounted = aEntry.kind === 'database' && aEntry.db.mounted;
        const sMeta = renderMeta(aEntry);
        return (
            <div
                key={`${aEntry.kind}-${sName}`}
                role="option"
                aria-selected={sSelected}
                className={[
                    'target-db__row',
                    sSelected ? 'target-db__row--selected' : '',
                    sFocused === aIndex ? 'target-db__row--focused' : '',
                    sUnusable ? 'target-db__row--unusable' : '',
                    sMounted ? 'target-db__row--mounted' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                onMouseEnter={() => setFocused(aIndex)}
                onClick={() => apply(aEntry)}
            >
                <span className="target-db__row-icon">
                    {sUnusable ? <VscWarning size={13} /> : sMounted ? <LuDatabaseBackup size={13} /> : <GoDatabase size={13} />}
                </span>
                <span className="target-db__row-text">
                    <span className="target-db__row-name">{sName}</span>
                    {sMeta ? <span className="target-db__row-meta">{sMeta}</span> : null}
                </span>
                {sSelected ? (
                    <span className="target-db__row-check">
                        <Checkmark size={13} />
                    </span>
                ) : null}
            </div>
        );
    };

    return (
        <div className="target-db">
            <div
                ref={sChipRef}
                role="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={sOpen}
                title={sChipTitle}
                className={sChipClass}
                onClick={toggle}
                onKeyDown={handleChipKeyDown}
            >
                <span className="target-db__chip-icon">{sNotFound ? <VscWarning size={13} /> : <GoDatabase size={13} />}</span>
                <span className="target-db__chip-label">{sLabel}</span>
                {value ? (
                    <button
                        type="button"
                        className="target-db__chip-clear"
                        aria-label="Clear target database"
                        onClick={(aEvent) => {
                            aEvent.stopPropagation();
                            onChange(null);
                            close();
                        }}
                    >
                        <Close size={12} />
                    </button>
                ) : null}
                <span className="target-db__chip-chevron">
                    <VscChevronDown size={12} />
                </span>
            </div>

            {sOpen
                ? createPortal(
                      <div
                          ref={sMenuRef}
                          className="target-db__menu"
                          style={{ top: `${sPosition.top}px`, left: `${sPosition.left}px`, width: `${MENU_WIDTH}px` }}
                          role="listbox"
                      >
                          <div className="target-db__filter">
                              <input
                                  ref={sInputRef}
                                  value={sQuery}
                                  placeholder="Filter databases"
                                  spellCheck={false}
                                  onChange={(aEvent) => setQuery(aEvent.target.value)}
                                  onKeyDown={handleMenuKeyDown}
                              />
                          </div>

                          <div className="target-db__scroll scrollbar-dark">
                              {sEntries.filter((aEntry) => aEntry.kind !== 'clear').length === 0 ? (
                                  <div className="target-db__empty">no database matches</div>
                              ) : null}
                              {sEntries.map((aEntry, aIndex) => (aEntry.kind === 'clear' ? null : renderRow(aEntry, aIndex)))}
                          </div>

                          {value ? <div className="target-db__divider" /> : null}
                          {value ? (
                              <button
                                  type="button"
                                  className={['target-db__clear-row', sFocused === sEntries.length - 1 ? 'target-db__clear-row--focused' : '']
                                      .filter(Boolean)
                                      .join(' ')}
                                  onMouseEnter={() => setFocused(sEntries.length - 1)}
                                  onClick={() => apply({ kind: 'clear' })}
                              >
                                  <Close size={12} />
                                  <span>Clear · use session database</span>
                              </button>
                          ) : null}

                          <div className="target-db__hint">
                              <span>
                                  <kbd>↑↓</kbd> move
                              </span>
                              <span>
                                  <kbd>enter</kbd> apply
                              </span>
                              <span>
                                  <kbd>esc</kbd> cancel
                              </span>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </div>
    );
};
