import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import { withNormalizedSourceTagName } from '../TagAnalyzerSeriesNaming';

// Used by TagAnalyzer tag search flows to type tag search result rows.
export type TagSearchResultRow = [string, string];

// Used by TagAnalyzer tag search flows to type tag search source columns.
export type TagSearchSourceColumns = {
    name: string;
    time: string;
    value: string;
};

// Used by TagAnalyzer tag search flows to type tag selection draft item.
export type TagSelectionDraftItem = {
    key: string;
    table: string;
    sourceTagName: string;
    calculationMode: string;
    alias: string;
    weight: number;
    colName: TagSearchSourceColumns;
    [key: string]: unknown;
};

// Used by TagAnalyzer tag search flows to type tag search option rows.
export type TagSearchOptionRow = TagSearchResultRow;
// Used by TagAnalyzer tag search flows to type tag search table column maps.
export type TagSearchTableColumns = TagSearchSourceColumns;
// Used by TagAnalyzer tag search flows to type tag selection draft items.
export type TagSearchSelectionItem = TagSelectionDraftItem;

// Used by TagAnalyzer tag search flows to type tag search page result.
type TagSearchPageResult = {
    rows: TagSearchResultRow[];
    total?: number;
    columns: TagSearchSourceColumns;
    errorMessage?: string;
};

// Used by TagAnalyzer tag search flows to type table name response.
type TableNameResponse = {
    success?: boolean;
    data?: {
        rows?: string[][];
    };
    message?: string;
};

// Used by TagAnalyzer tag search flows to type tag total response.
type TagTotalResponse = {
    data?: {
        rows?: Array<[number]>;
    };
};

// Used by TagAnalyzer tag search flows to type tag pagination response.
type TagPaginationResponse = {
    success?: boolean;
    data?: {
        rows?: TagSearchResultRow[];
    };
};

// Used by TagAnalyzer tag search flows to type use tag search modal state options.
type UseTagSearchModalStateOptions = {
    tables: string[];
    initialTable?: string;
    maxSelectedCount: number;
    isSameSelectedTag: (aItem: TagSelectionDraftItem, bItem: TagSelectionDraftItem) => boolean;
};

const EMPTY_TAG_ANALYZER_TABLE_COLUMNS: TagSearchSourceColumns = {
    name: '',
    time: '',
    value: '',
};

const buildTableColumns = (aRows: string[][] | undefined): TagSearchSourceColumns => {
    return {
        name: aRows?.[0]?.[0] ?? '',
        time: aRows?.[1]?.[0] ?? '',
        value: aRows?.[2]?.[0] ?? '',
    };
};

const getTagTotalFromResponse = (aResponse: TagTotalResponse) => {
    return aResponse.data?.rows?.[0]?.[0] ?? 0;
};

const getTagRowsFromResponse = (aResponse: TagPaginationResponse): TagSearchResultRow[] => {
    return aResponse.success ? aResponse.data?.rows ?? [] : [];
};

export const useTagSearchModalState = ({
    tables,
    initialTable,
    maxSelectedCount,
    isSameSelectedTag,
}: UseTagSearchModalStateOptions) => {
    const [selectedTable, setSelectedTable] = useState<string>(initialTable ?? tables?.[0] ?? '');
    const [availableTagResults, setAvailableTagResults] = useState<TagSearchResultRow[]>([]);
    const [tagPagination, setTagPagination] = useState(1);
    const [keepPageNum, setKeepPageNum] = useState<number | string>(1);
    const [selectedSeriesDrafts, setSelectedSeriesDrafts] = useState<TagSelectionDraftItem[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [searchText, setSearchText] = useState('');
    const [tagTotal, setTagTotal] = useState(0);
    const [skipTagTotal, setSkipTagTotal] = useState(false);
    const [sourceColumns, setSourceColumns] = useState<TagSearchSourceColumns | undefined>();
    const [reloadKey, setReloadKey] = useState(0);

    const tableOptions = useMemo(() => {
        return tables?.map((table: string) => ({ value: table, label: table })) || [];
    }, [tables]);

    const resetPagingAndSearch = useCallback(() => {
        setTagPagination(1);
        setKeepPageNum(1);
        setTagInputValue('');
        setSearchText('');
    }, []);

    const resetState = useCallback(
        (aNextTable?: string) => {
            resetPagingAndSearch();
            setSelectedSeriesDrafts([]);
            setTagTotal(0);
            setSkipTagTotal(false);
            setSourceColumns(undefined);
            setAvailableTagResults([]);
            setSelectedTable(aNextTable ?? tables?.[0] ?? '');
            setReloadKey((aPrev) => aPrev + 1);
        },
        [resetPagingAndSearch, tables],
    );

    const filterTag = useCallback((aValue: string) => {
        setSkipTagTotal(false);
        setTagInputValue(aValue);
        setSearchText(aValue);
    }, []);

    const updateTotal = useCallback((aTotal: number) => {
        setTagTotal((aPrev) => (aPrev === aTotal ? aPrev : aTotal));
    }, []);

    const fetchTableColumns = useCallback(async () => {
        if (!selectedTable) {
            return {
                columns: undefined,
                message: '',
            };
        }

        const sFetchTableInfo = (await fetchTableName(selectedTable)) as TableNameResponse;
        if (!sFetchTableInfo.success) {
            return {
                columns: undefined,
                message: sFetchTableInfo.message ?? '',
            };
        }

        return {
            columns: buildTableColumns(sFetchTableInfo.data.rows),
            message: '',
        };
    }, [selectedTable]);

    const ensureColumns = useCallback(
        async (aForceRefresh = false) => {
            if (!selectedTable) {
                return {
                    columns: undefined,
                    message: '',
                };
            }

            if (!aForceRefresh && sourceColumns) {
                return {
                    columns: sourceColumns,
                    message: '',
                };
            }

            const sTableColumns = await fetchTableColumns();
            if (sTableColumns.columns) {
                setSourceColumns(sTableColumns.columns);
            }
            return sTableColumns;
        },
        [fetchTableColumns, selectedTable, sourceColumns],
    );

    const fetchTagPage = useCallback(async (): Promise<TagSearchPageResult> => {
        if (!selectedTable) {
            return {
                rows: [],
                total: 0,
                columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                errorMessage: undefined,
            };
        }

        const sTableColumns = await ensureColumns(searchText === '');
        if (!sTableColumns.columns) {
            return {
                rows: [],
                total: 0,
                columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                errorMessage: sTableColumns.message,
            };
        }

        const sColumnsToUse = sTableColumns.columns;
        let sTotal: number | undefined;
        if (!skipTagTotal) {
            const sTotalRes = (await getTagTotal(selectedTable, searchText, sColumnsToUse.name)) as TagTotalResponse;
            sTotal = getTagTotalFromResponse(sTotalRes);
        }

        const sResult = (await getTagPagination(selectedTable, searchText, tagPagination, sColumnsToUse.name)) as TagPaginationResponse;

        return {
            rows: getTagRowsFromResponse(sResult),
            total: sTotal,
            columns: sColumnsToUse,
            errorMessage: undefined,
        };
    }, [ensureColumns, searchText, selectedTable, skipTagTotal, tagPagination]);

    const loadTagList = useCallback(async () => {
        const sTagPage = await fetchTagPage();
        if (sTagPage.errorMessage) {
            setAvailableTagResults([]);
            updateTotal(0);
            setSourceColumns(EMPTY_TAG_ANALYZER_TABLE_COLUMNS);
            setSkipTagTotal(false);
            Toast.error(sTagPage.errorMessage);
            return;
        }

        setSourceColumns(sTagPage.columns);
        if (typeof sTagPage.total === 'number' && !skipTagTotal) updateTotal(sTagPage.total);
        setAvailableTagResults(sTagPage.rows);
        setSkipTagTotal(false);
    }, [fetchTagPage, skipTagTotal, updateTotal]);

    const handleSearch = useCallback(() => {
        if (tagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else {
            void loadTagList();
        }
    }, [loadTagList, tagPagination]);

    const addTag = useCallback(
        async (aValue: string) => {
            const sTableColumns = await ensureColumns();
            if (!sTableColumns.columns) {
                Toast.error(sTableColumns.message);
                return false;
            }

            setSelectedSeriesDrafts((aPrev) => [
                ...aPrev,
                withNormalizedSourceTagName({
                    key: getId(),
                    sourceTagName: aValue,
                    table: selectedTable,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1.0,
                    colName: sTableColumns.columns,
                }),
            ]);
            return true;
        },
        [ensureColumns, selectedTable],
    );

    const removeSelectedTag = useCallback((aId: string) => {
        setSelectedSeriesDrafts((aPrev) => aPrev.filter((aItem) => aItem.key !== aId));
    }, []);

    const setTagMode = useCallback(
        (aValue: string, aTarget: TagSelectionDraftItem) => {
            setSelectedSeriesDrafts((aPrev) =>
                aPrev.map((aItem) => {
                    return isSameSelectedTag(aItem, aTarget) ? { ...aItem, calculationMode: aValue } : aItem;
                }),
            );
        },
        [isSameSelectedTag],
    );

    const changeTable = useCallback(
        (aValue: string) => {
            setSelectedTable(aValue);
            resetPagingAndSearch();
            setAvailableTagResults([]);
            setTagTotal(0);
            setSkipTagTotal(false);
            setSourceColumns(undefined);
        },
        [resetPagingAndSearch],
    );

    const isAtSelectionLimit = selectedSeriesDrafts.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / 10);
    }, [tagTotal]);

    useDebounce([tagPagination, selectedTable, reloadKey], loadTagList, 200);

    const setSelectedTags = setSelectedSeriesDrafts as Dispatch<SetStateAction<TagSearchSelectionItem[]>>;

    return {
        selectedTable,
        setSelectedTable: changeTable,
        availableTagResults,
        tagList: availableTagResults,
        tagPagination,
        setTagPagination,
        keepPageNum,
        setKeepPageNum,
        selectedSeriesDrafts,
        selectedTags: selectedSeriesDrafts,
        setSelectedSeriesDrafts,
        setSelectedTags,
        tagInputValue,
        setTagInputValue,
        searchText,
        setSearchText,
        filterTag,
        tagTotal,
        setTagTotal,
        sourceColumns,
        columns: sourceColumns,
        setColumns: setSourceColumns,
        tableOptions,
        maxPageNum,
        resetState,
        handleSearch,
        addTag,
        removeSelectedTag,
        setTagMode,
        isAtSelectionLimit,
        skipTagTotal,
        setSkipTagTotal,
        loadTagList,
    };
};
