import { useCallback, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';

export type TagSearchOptionRow = [string, string];

export type TagSearchTableColumns = {
    name: string;
    time: string;
    value: string;
};

export type TagSearchSelectionItem = {
    key: string;
    table: string;
    tagName: string;
    calculationMode: string;
    alias: string;
    weight: number;
    colName: TagSearchTableColumns;
    [key: string]: unknown;
};

type TagSearchPageResult = {
    rows: TagSearchOptionRow[];
    total?: number;
    columns: TagSearchTableColumns;
    errorMessage?: string;
};

type UseTagSearchModalStateOptions = {
    tables: string[];
    initialTable?: string;
    maxSelectedCount: number;
    isSameSelectedTag: (aItem: TagSearchSelectionItem, bItem: TagSearchSelectionItem) => boolean;
};

const EMPTY_TAG_ANALYZER_TABLE_COLUMNS: TagSearchTableColumns = {
    name: '',
    time: '',
    value: '',
};

const buildTableColumns = (aRows: any[][]): TagSearchTableColumns => {
    return {
        name: aRows?.[0]?.[0] ?? '',
        time: aRows?.[1]?.[0] ?? '',
        value: aRows?.[2]?.[0] ?? '',
    };
};

export const useTagSearchModalState = ({
    tables,
    initialTable,
    maxSelectedCount,
    isSameSelectedTag,
}: UseTagSearchModalStateOptions) => {
    const [selectedTable, setSelectedTable] = useState<string>(initialTable ?? tables?.[0] ?? '');
    const [tagList, setTagList] = useState<TagSearchOptionRow[]>([]);
    const [tagPagination, setTagPagination] = useState(1);
    const [keepPageNum, setKeepPageNum] = useState<number | string>(1);
    const [selectedTags, setSelectedTags] = useState<TagSearchSelectionItem[]>([]);
    const [tagInputValue, setTagInputValue] = useState('');
    const [searchText, setSearchText] = useState('');
    const [tagTotal, setTagTotal] = useState(0);
    const [skipTagTotal, setSkipTagTotal] = useState(false);
    const [columns, setColumns] = useState<TagSearchTableColumns | undefined>();
    const [reloadKey, setReloadKey] = useState(0);

    const tableOptions = useMemo(() => {
        return tables?.map((table: string) => ({ value: table, label: table })) || [];
    }, [tables]);

    const resetState = useCallback(
        (aNextTable?: string) => {
            setTagPagination(1);
            setKeepPageNum(1);
            setSelectedTags([]);
            setTagInputValue('');
            setSearchText('');
            setTagTotal(0);
            setSkipTagTotal(false);
            setColumns(undefined);
            setTagList([]);
            setSelectedTable(aNextTable ?? tables?.[0] ?? '');
            setReloadKey((aPrev) => aPrev + 1);
        },
        [tables],
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

        const sFetchTableInfo: any = await fetchTableName(selectedTable);
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

    const fetchTagPage = useCallback(async (): Promise<TagSearchPageResult> => {
        if (!selectedTable) {
            return {
                rows: [],
                total: 0,
                columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                errorMessage: undefined,
            };
        }

        let sColumnsToUse = columns;
        if (!sColumnsToUse || searchText === '') {
            const sTableColumns = await fetchTableColumns();
            if (!sTableColumns.columns) {
                return {
                    rows: [],
                    total: 0,
                    columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                    errorMessage: sTableColumns.message,
                };
            }
            sColumnsToUse = sTableColumns.columns;
        }

        let sTotal: number | undefined;
        if (!skipTagTotal) {
            const sTotalRes: any = await getTagTotal(selectedTable, searchText, sColumnsToUse.name);
            sTotal = sTotalRes.data.rows[0][0];
        }

        const sResult: any = await getTagPagination(selectedTable, searchText, tagPagination, sColumnsToUse.name);

        return {
            rows: sResult.success ? sResult.data.rows : [],
            total: sTotal,
            columns: sColumnsToUse,
            errorMessage: undefined,
        };
    }, [columns, fetchTableColumns, searchText, selectedTable, skipTagTotal, tagPagination]);

    const loadTagList = useCallback(async () => {
        const sTagPage = await fetchTagPage();
        if (sTagPage.errorMessage) {
            setTagList([]);
            updateTotal(0);
            setColumns(EMPTY_TAG_ANALYZER_TABLE_COLUMNS);
            setSkipTagTotal(false);
            Toast.error(sTagPage.errorMessage);
            return;
        }

        setColumns(sTagPage.columns);
        if (typeof sTagPage.total === 'number' && !skipTagTotal) updateTotal(sTagPage.total);
        setTagList(sTagPage.rows);
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
            let sColumnsToUse = columns;
            if (!sColumnsToUse) {
                const sTableColumns = await fetchTableColumns();
                if (!sTableColumns.columns) {
                    Toast.error(sTableColumns.message);
                    return false;
                }
                sColumnsToUse = sTableColumns.columns;
                setColumns(sColumnsToUse);
            }

            setSelectedTags((aPrev) => [
                ...aPrev,
                {
                    key: getId(),
                    tagName: aValue,
                    table: selectedTable,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1.0,
                    colName: sColumnsToUse,
                },
            ]);
            return true;
        },
        [columns, fetchTableColumns, selectedTable],
    );

    const removeSelectedTag = useCallback((aId: string) => {
        setSelectedTags((aPrev) => aPrev.filter((aItem) => aItem.key !== aId));
    }, []);

    const setTagMode = useCallback(
        (aValue: string, aTarget: TagSearchSelectionItem) => {
            setSelectedTags((aPrev) =>
                aPrev.map((aItem) => {
                    return isSameSelectedTag(aItem, aTarget) ? { ...aItem, calculationMode: aValue } : aItem;
                }),
            );
        },
        [isSameSelectedTag],
    );

    const changeTable = useCallback((aValue: string) => {
        setSelectedTable(aValue);
        setSearchText('');
        setTagInputValue('');
        setTagPagination(1);
        setKeepPageNum(1);
    }, []);

    const isAtSelectionLimit = selectedTags.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / 10);
    }, [tagTotal]);

    useDebounce([tagPagination, selectedTable, reloadKey], loadTagList, 200);

    return {
        selectedTable,
        setSelectedTable: changeTable,
        tagList,
        tagPagination,
        setTagPagination,
        keepPageNum,
        setKeepPageNum,
        selectedTags,
        setSelectedTags,
        tagInputValue,
        setTagInputValue,
        searchText,
        setSearchText,
        filterTag,
        tagTotal,
        setTagTotal,
        columns,
        setColumns,
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
