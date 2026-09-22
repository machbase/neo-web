import { Close, Search } from '@/assets/icons/Icon';
import { VscFilterFilled } from 'react-icons/vsc';
import { formatCount } from './explorerFilter';

export interface ExplorerSearchBarProps {
    pQuery: string;
    pOnQueryChange: (aQuery: string) => void;
    /** Tables matching the search, and the tree's full size — the `12/58` beside the input. */
    pMatched: number;
    pTotal: number;
    /** Summary line, rendered only while at least one database carries a type filter. */
    pFilteredDbCount: number;
    pFilteredShown: number;
    pFilteredTotal: number;
    pOnClearFilters: () => void;
}

/**
 * The only permanently visible addition to the panel: one 24px search band, plus a 22px
 * summary row that appears only once a filter is on. Both sit above the DB EXPLORER header
 * so the tree keeps its own scroll.
 */
export const ExplorerSearchBar = ({
    pQuery,
    pOnQueryChange,
    pMatched,
    pTotal,
    pFilteredDbCount,
    pFilteredShown,
    pFilteredTotal,
    pOnClearFilters,
}: ExplorerSearchBarProps) => {
    const sHasQuery = pQuery.trim().length > 0;
    const sHasFilter = pFilteredDbCount > 0;

    const handleKeyDown = (aEvent: React.KeyboardEvent<HTMLInputElement>) => {
        // Escape clears rather than blurs: the tree is the thing to get back, and the input
        // keeps focus so the next query can be typed straight away.
        if (aEvent.key === 'Escape') {
            aEvent.stopPropagation();
            if (sHasQuery) pOnQueryChange('');
        }
    };

    return (
        <div className="db-explorer-search-wrap">
            <div className={`db-explorer-search ${sHasQuery ? 'is-active' : ''}`}>
                <span className="db-explorer-search-icon">
                    <Search size={12} />
                </span>
                <input
                    className="db-explorer-search-input"
                    type="text"
                    value={pQuery}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="Search tables"
                    aria-label="Search databases, users and tables"
                    onChange={(aEvent) => pOnQueryChange(aEvent.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {sHasQuery && (
                    <>
                        <span className="db-explorer-search-count">
                            {formatCount(pMatched)}/{formatCount(pTotal)}
                        </span>
                        <button type="button" className="db-explorer-search-clear" aria-label="Clear search" onClick={() => pOnQueryChange('')}>
                            <Close size={12} />
                        </button>
                    </>
                )}
            </div>
            {sHasFilter && (
                <div className="db-explorer-filter-summary">
                    <span className="db-explorer-filter-summary-icon">
                        <VscFilterFilled size={11} />
                    </span>
                    <span className="db-explorer-filter-summary-text">
                        {pFilteredDbCount} {pFilteredDbCount === 1 ? 'filter' : 'filters'} · {formatCount(pFilteredShown)}/{formatCount(pFilteredTotal)} shown
                    </span>
                    <button type="button" className="db-explorer-inline-link" onClick={pOnClearFilters}>
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};
