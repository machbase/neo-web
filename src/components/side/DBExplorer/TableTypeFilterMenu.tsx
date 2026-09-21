import { Popover } from '@/design-system/components';
import { formatCount, TypeOption } from './explorerFilter';
import { getTableTypeColor } from './utils';

export interface TableTypeFilterMenuProps {
    pIsOpen: boolean;
    pPosition: { x: number; y: number };
    pDbName: string;
    pOptions: TypeOption[];
    pOnToggle: (aType: string) => void;
    pOnSelectAll: () => void;
    pOnClear: () => void;
    pOnClose: () => void;
}

/**
 * Table types present in one database, each with the number of tables it would reveal under
 * the current search. Checking a box does not close the menu — picking three types in a row
 * is the common case — so it closes on Escape or on a click outside.
 */
export const TableTypeFilterMenu = ({ pIsOpen, pPosition, pDbName, pOptions, pOnToggle, pOnSelectAll, pOnClear, pOnClose }: TableTypeFilterMenuProps) => {
    if (!pIsOpen) return null;

    const sSelectableTypes = pOptions.filter((aOption: TypeOption) => !aOption.disabled);
    const sAllChecked = sSelectableTypes.length > 0 && sSelectableTypes.every((aOption: TypeOption) => aOption.checked);
    const sAnyChecked = pOptions.some((aOption: TypeOption) => aOption.checked);

    return (
        <Popover isOpen={pIsOpen} position={pPosition} onClose={pOnClose} closeOnOutsideClick closeOnEscape closeOnScroll={false}>
            <div className="db-explorer-type-menu" onClick={(aEvent) => aEvent.stopPropagation()} onContextMenu={(aEvent) => aEvent.preventDefault()}>
                <div className="db-explorer-type-menu-head">
                    <span className="db-explorer-type-menu-title" title={pDbName}>
                        TABLE TYPES
                    </span>
                    <span className="db-explorer-type-menu-head-actions">
                        <button type="button" className="db-explorer-inline-link" onClick={pOnSelectAll} disabled={sAllChecked || sSelectableTypes.length === 0}>
                            All
                        </button>
                        <button type="button" className="db-explorer-inline-link" onClick={pOnClear} disabled={!sAnyChecked}>
                            None
                        </button>
                    </span>
                </div>
                <div className="db-explorer-type-menu-list">
                    {pOptions.length === 0 && <div className="db-explorer-type-menu-empty">No tables in this database</div>}
                    {pOptions.map((aOption: TypeOption) => {
                        // A checked type stays clickable even at count 0 — otherwise a filter
                        // that hides everything could not be undone from here.
                        const sLocked = aOption.disabled && !aOption.checked;
                        return (
                            <button
                                type="button"
                                key={`${pDbName}-type-${aOption.type}`}
                                className={`db-explorer-type-menu-row ${aOption.checked ? 'is-checked' : ''} ${aOption.disabled ? 'is-dim' : ''}`}
                                disabled={sLocked}
                                aria-pressed={aOption.checked}
                                onClick={() => pOnToggle(aOption.type)}
                            >
                                <span className={`db-explorer-type-check ${aOption.checked ? 'is-checked' : ''}`} aria-hidden="true">
                                    {aOption.checked && (
                                        <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.5 6.3 4.8 8.6 9.5 3.6" />
                                        </svg>
                                    )}
                                </span>
                                <span className="db-explorer-type-swatch" style={{ backgroundColor: getTableTypeColor(aOption.type) }} aria-hidden="true" />
                                <span className="db-explorer-type-name">{aOption.type}</span>
                                <span className="db-explorer-type-count">{formatCount(aOption.count)}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="db-explorer-type-menu-foot">
                    <button type="button" className="db-explorer-inline-link" onClick={pOnClear} disabled={!sAnyChecked}>
                        Reset
                    </button>
                    <span className="db-explorer-type-menu-hint">esc to close</span>
                </div>
            </div>
        </Popover>
    );
};
