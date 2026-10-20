/**
 * Search and per-database table-type filtering for the DB Explorer tree.
 *
 * Everything here is pure and works off the tree DBExplorer has already built, because the
 * feature must not send a second catalogue query — the list on screen is the list searched.
 * The React side only holds the query string and the selection map; what to draw, what to
 * count and what to grey out is decided here so it can be tested without a DOM.
 */
import { getUserName } from '@/utils';
import { E_TABLE_INFO, TableTypeOrderList } from './utils';

export type ExplorerTableRow = (string | number)[];

export interface ExplorerUserNode {
    userName: string;
    total: number;
    tableList: Record<string, ExplorerTableRow[]>;
}

export interface ExplorerDbNode {
    dbName: string;
    userList: ExplorerUserNode[];
    tableLen: number;
}

/** `{ MACHBASEDB: ['tag', 'view'] }` — an absent or empty entry means "no filter on this database". */
export type TypeFilterMap = Record<string, string[]>;

export interface MatchRange {
    start: number;
    end: number;
}

export interface TypeOption {
    type: string;
    /** Tables of this type that survive the *search* — what the dropdown shows as its count. */
    count: number;
    checked: boolean;
    /** Nothing to reveal by checking it: greyed out, and only clickable while checked. */
    disabled: boolean;
}

export interface DbFilterStat {
    dbName: string;
    /** Tables the tree would draw for this database with no search and no filter. */
    total: number;
    /** Tables drawn after search and filter. */
    shown: number;
    /** Selected types, in tree order; empty means unfiltered. */
    selectedTypes: string[];
    typeOptions: TypeOption[];
}

export interface ExplorerView {
    dbList: ExplorerDbNode[];
    stats: Record<string, DbFilterStat>;
    hasQuery: boolean;
    /** Tables matching the search across every database — the `12/58` beside the input. */
    matchedTotal: number;
    renderedTotal: number;
    /** Databases carrying a filter, and their combined counts — the summary row. */
    filteredDbCount: number;
    filteredShown: number;
    filteredTotal: number;
}

/**
 * The tree draws a table row only when its FLAG is 0; the rest are a tag table's internal
 * `_*_DATA_n` / `_*_META` objects, which `UserDiv` hides. Counting them would make every
 * `shown / total` on screen disagree with the rows under it.
 */
export const isRenderedTableRow = (aRow: ExplorerTableRow | undefined): boolean => Number(aRow?.[E_TABLE_INFO.TB_FLAG] ?? 0) === 0;

export const normalizeQuery = (aQuery: string): string => String(aQuery ?? '').trim().toLowerCase();

/** First case-insensitive occurrence of `aQuery` in `aText`, for the highlight span. */
export const findMatch = (aText: unknown, aQuery: string): MatchRange | null => {
    if (!aQuery) return null;
    const sText = String(aText ?? '');
    const sIndex = sText.toLowerCase().indexOf(aQuery);
    return sIndex < 0 ? null : { start: sIndex, end: sIndex + aQuery.length };
};

const getTableName = (aRow: ExplorerTableRow): string => String(aRow?.[E_TABLE_INFO.TB_NM] ?? '');

/**
 * Selected types are applied exactly as stored, never intersected with what the database
 * currently holds. A selection that matches nothing is a real state the user can reach —
 * saved filters outlive a DROP — and the tree answers it with the "hidden by filter" line
 * and an unfilter link. Quietly dropping the selection instead would make the filter appear
 * to forget itself.
 */
const isTypeAllowed = (aType: string, aSelected: string[]): boolean => aSelected.length === 0 || aSelected.includes(aType);

const emptyTableList = (): Record<string, ExplorerTableRow[]> => {
    const sList: Record<string, ExplorerTableRow[]> = {};
    TableTypeOrderList.forEach((aType: string) => {
        sList[aType] = [];
    });
    return sList;
};

/**
 * Applies the search and each database's type filter to the built tree, and works out every
 * number the panel puts on screen in the same pass.
 *
 * Search rules: database name, user name and table name all match case-insensitively on a
 * substring, and a hit on a database or user name keeps everything beneath it. The type
 * filter is a separate axis — the two combine with AND.
 */
export const buildExplorerView = ({
    dbList,
    query,
    filters,
}: {
    dbList: ExplorerDbNode[];
    query: string;
    filters: TypeFilterMap;
}): ExplorerView => {
    const sQuery = normalizeQuery(query);
    const sHasQuery = sQuery.length > 0;
    const sStats: Record<string, DbFilterStat> = {};
    const sOutDbList: ExplorerDbNode[] = [];

    let sMatchedTotal = 0;
    let sRenderedTotal = 0;
    let sFilteredDbCount = 0;
    let sFilteredShown = 0;
    let sFilteredTotal = 0;

    (dbList ?? []).forEach((aDb: ExplorerDbNode) => {
        const sSelectedRaw = filters?.[aDb.dbName] ?? [];
        // Stored in tree order rather than click order so the badge count and the dropdown
        // read the same way however the user got there.
        const sSelected = TableTypeOrderList.filter((aType: string) => sSelectedRaw.includes(aType));
        const sHasFilter = sSelected.length > 0;

        let sDbTotal = 0;
        let sDbShown = 0;
        /** Tables per type after the search only — the dropdown counts, which must not be
         *  changed by this database's own filter or checking a box would rewrite the list. */
        const sSearchCountByType: Record<string, number> = {};
        const sPresentTypes = new Set<string>();

        // No query is not "nothing matches" — it is "the search is not narrowing anything",
        // so every row passes and the type filter is left as the only active axis.
        const sDbMatch = !sHasQuery || findMatch(aDb.dbName, sQuery) !== null;
        const sOutUserList: ExplorerUserNode[] = [];

        (aDb.userList ?? []).forEach((aUser: ExplorerUserNode) => {
            const sUserMatch = sDbMatch || findMatch(aUser.userName, sQuery) !== null;
            const sOutTableList = emptyTableList();
            let sUserShown = 0;

            TableTypeOrderList.forEach((aType: string) => {
                const sRows = (aUser.tableList?.[aType] ?? []).filter(isRenderedTableRow);
                if (sRows.length > 0) sPresentTypes.add(aType);
                sDbTotal += sRows.length;

                const sSearchHits = sRows.filter((aRow: ExplorerTableRow) => sUserMatch || findMatch(getTableName(aRow), sQuery) !== null);
                sSearchCountByType[aType] = (sSearchCountByType[aType] ?? 0) + sSearchHits.length;

                const sKept = isTypeAllowed(aType, sSelected) ? sSearchHits : [];
                sOutTableList[aType] = sKept;
                sUserShown += sKept.length;
            });

            sDbShown += sUserShown;
            sOutUserList.push({ userName: aUser.userName, total: sUserShown, tableList: sOutTableList });
        });

        // A selected type the database no longer holds still belongs in the dropdown —
        // it is the only place the user can uncheck it.
        const sOptionTypes = TableTypeOrderList.filter((aType: string) => sPresentTypes.has(aType) || sSelected.includes(aType));
        const sTypeOptions: TypeOption[] = sOptionTypes.map((aType: string) => {
            const sCount = sSearchCountByType[aType] ?? 0;
            const sChecked = sSelected.includes(aType);
            return { type: aType, count: sCount, checked: sChecked, disabled: sCount === 0 && !sChecked };
        });

        sStats[aDb.dbName] = { dbName: aDb.dbName, total: sDbTotal, shown: sDbShown, selectedTypes: sSelected, typeOptions: sTypeOptions };

        sRenderedTotal += sDbTotal;
        // The search count ignores the type filters: it answers "how many tables are named
        // like this", which is what the input is asking. The filters get their own summary.
        sMatchedTotal += Object.values(sSearchCountByType).reduce((aSum: number, aCount: number) => aSum + aCount, 0);
        if (sHasFilter) {
            sFilteredDbCount += 1;
            sFilteredShown += sDbShown;
            sFilteredTotal += sDbTotal;
        }

        sOutDbList.push({ dbName: aDb.dbName, userList: sOutUserList, tableLen: sDbShown });
    });

    return {
        dbList: sOutDbList,
        stats: sStats,
        hasQuery: sHasQuery,
        matchedTotal: sMatchedTotal,
        renderedTotal: sRenderedTotal,
        filteredDbCount: sFilteredDbCount,
        filteredShown: sFilteredShown,
        filteredTotal: sFilteredTotal,
    };
};

/* ------------------------------------------------------------------ persistence */

const FILTER_STORE_KEY = 'neo-web.db-explorer.type-filters';
const ANONYMOUS_USER = '__anonymous__';

/**
 * Per-account, not per-browser-profile: two accounts on one machine keep separate filters,
 * and logging out and back in restores what that account had. There is no server-side user
 * preference store on neo — `targetDatabaseStore` keeps the SQL editor's database recents
 * the same way — so this is the mechanism the rest of the app already uses.
 *
 * Every read and write is guarded: a cleared, full or blocked localStorage degrades to
 * "no saved filters", which is the same as a first visit.
 */
const readStore = (): Record<string, TypeFilterMap> => {
    try {
        const sRaw = localStorage.getItem(FILTER_STORE_KEY);
        if (!sRaw) return {};
        const sParsed = JSON.parse(sRaw);
        return sParsed && typeof sParsed === 'object' && !Array.isArray(sParsed) ? sParsed : {};
    } catch {
        return {};
    }
};

const currentUserKey = (): string => String(getUserName() ?? ANONYMOUS_USER).toUpperCase();

export const readTypeFilters = (): TypeFilterMap => {
    const sMine = readStore()[currentUserKey()];
    if (!sMine || typeof sMine !== 'object' || Array.isArray(sMine)) return {};
    const sClean: TypeFilterMap = {};
    Object.entries(sMine).forEach(([aDbName, aTypes]) => {
        if (!Array.isArray(aTypes)) return;
        // Types the build no longer knows about are dropped here rather than at apply time,
        // so a stale entry cannot hide a whole database with nothing in the dropdown to undo it.
        const sTypes = TableTypeOrderList.filter((aType: string) => aTypes.includes(aType));
        if (sTypes.length > 0) sClean[aDbName] = sTypes;
    });
    return sClean;
};

export const writeTypeFilters = (aFilters: TypeFilterMap) => {
    try {
        const sStore = readStore();
        const sClean: TypeFilterMap = {};
        Object.entries(aFilters ?? {}).forEach(([aDbName, aTypes]) => {
            if (Array.isArray(aTypes) && aTypes.length > 0) sClean[aDbName] = aTypes;
        });
        if (Object.keys(sClean).length > 0) sStore[currentUserKey()] = sClean;
        else delete sStore[currentUserKey()];
        localStorage.setItem(FILTER_STORE_KEY, JSON.stringify(sStore));
    } catch {
        // Storage is full or blocked. The filter still works for this session.
    }
};

/** Check/uncheck one type for one database, keeping the map free of empty entries. */
export const toggleTypeFilter = (aFilters: TypeFilterMap, aDbName: string, aType: string): TypeFilterMap => {
    const sCurrent = aFilters?.[aDbName] ?? [];
    const sNext = sCurrent.includes(aType) ? sCurrent.filter((aItem: string) => aItem !== aType) : TableTypeOrderList.filter((aItem: string) => aItem === aType || sCurrent.includes(aItem));
    return setTypeFilter(aFilters, aDbName, sNext);
};

export const setTypeFilter = (aFilters: TypeFilterMap, aDbName: string, aTypes: string[]): TypeFilterMap => {
    const sNext: TypeFilterMap = { ...(aFilters ?? {}) };
    if (aTypes.length > 0) sNext[aDbName] = aTypes;
    else delete sNext[aDbName];
    return sNext;
};

export const clearAllTypeFilters = (): TypeFilterMap => ({});

export const formatCount = (aValue: number): string => aValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
