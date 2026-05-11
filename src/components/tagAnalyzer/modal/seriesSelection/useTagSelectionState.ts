import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    fetchJsonColumnPaths,
    fetchTagSearchColumns,
    fetchTagSearchPage,
} from './TagSelectionSearchRepository';
import {
    EMPTY_TAG_SELECTION_COLUMNS,
    TAG_SEARCH_PAGE_LIMIT,
} from './TagSelectionConstants';
import {
    createTagAnalyzerColumnInfo,
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
} from '@/utils/tagAnalyzerFields';
import {
    displayJsonPathLabel,
    isJsonTypeColumn,
    jsonPathInputToStoredPath,
} from '@/utils/dashboardJsonValue';
import type {
    TagSearchItem,
    TagSelectionDraftItem,
    TagSelectionSourceColumns,
    UseTagSelectionStateOptions,
} from './TagSelectionTypes';

export const useTagSelectionState = ({
    tables,
    initialTable,
    maxSelectedCount,
    isSameSelectedTag,
}: UseTagSelectionStateOptions) => {
    const [selectedTable, setSelectedTable] = useState<string>(
        initialTable ?? tables[0] ?? '',
    );
    const [availableTags, setAvailableTags] = useState<TagSearchItem[]>([]);
    const [tagPagination, setTagPagination] = useState(1);
    const [keepPageNum, setKeepPageNum] = useState<number | string>(1);
    const [selectedSeriesDrafts, setSelectedSeriesDrafts] = useState<TagSelectionDraftItem[]>(
        [],
    );
    const [tagInputValue, setTagInputValue] = useState('');
    const [tagTotal, setTagTotal] = useState(0);
    const [sourceColumns, setSourceColumns] = useState<
        TagSelectionSourceColumns | undefined
    >();
    const [tableColumns, setTableColumns] = useState<any[]>([]);
    const [jsonPathOptions, setJsonPathOptions] = useState<Record<string, string[]>>({});
    const [jsonKeyInputDraft, setJsonKeyInputDraft] = useState<string | undefined>();
    const [reloadKey, setReloadKey] = useState(0);

    const tableOptions = useMemo<DropdownOption[]>(() => {
        return tables.map((table) => ({
            value: table,
            label: table,
            disabled: undefined,
        }));
    }, [tables]);
    const resetSearchControls = useCallback(() => {
        setTagPagination(1);
        setKeepPageNum(1);
        setTagInputValue('');
    }, []);
    const updateTotal = useCallback((total: number) => {
        setTagTotal((previousTotal) =>
            previousTotal === total ? previousTotal : total,
        );
    }, []);
    const clearLoadedTagState = useCallback(
        (nextColumns: TagSelectionSourceColumns | undefined) => {
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(nextColumns);
            setTableColumns([]);
            setJsonPathOptions({});
            setJsonKeyInputDraft(undefined);
        },
        [updateTotal],
    );
    const updateSourceColumns = useCallback(
        (nextColumns: TagSelectionSourceColumns) => {
            setSourceColumns(nextColumns);
            setSelectedSeriesDrafts((previousDrafts) =>
                previousDrafts.map((item) =>
                    item.table === selectedTable
                        ? {
                              ...item,
                              sourceColumns: nextColumns,
                          }
                        : item,
                ),
            );
        },
        [selectedTable],
    );
    const resetState = useCallback(
        (nextTable: string | undefined) => {
            resetSearchControls();
            setSelectedSeriesDrafts([]);
            clearLoadedTagState(undefined);
            setSelectedTable(nextTable ?? tables[0] ?? '');
            setReloadKey((previousReloadKey) => previousReloadKey + 1);
        },
        [clearLoadedTagState, resetSearchControls, tables],
    );
    const filterTag = useCallback((value: string) => {
        setTagInputValue(value);
    }, []);
    const ensureColumns = useCallback(
        async (forceRefresh = false) => {
            if (!selectedTable) {
                return {
                    columns: undefined,
                    errorMessage: undefined,
                };
            }

            if (!forceRefresh && sourceColumns) {
                return {
                    columns: sourceColumns,
                    errorMessage: undefined,
                };
            }

            const sResult = await fetchTagSearchColumns(selectedTable, sourceColumns);
            if (sResult.columns) {
                setSourceColumns(sResult.columns);
                setTableColumns(sResult.tableColumns);
            }

            return sResult;
        },
        [selectedTable, sourceColumns],
    );
    const loadTagList = useCallback(async () => {
        if (!selectedTable) {
            clearLoadedTagState(undefined);
            return;
        }

        const sColumnsResult = await ensureColumns(tagInputValue === '');
        if (!sColumnsResult.columns) {
            clearLoadedTagState(EMPTY_TAG_SELECTION_COLUMNS);
            if (sColumnsResult.errorMessage) {
                Toast.error(sColumnsResult.errorMessage, undefined);
            }
            return;
        }

        const sTagPage = await fetchTagSearchPage({
            table: selectedTable,
            searchText: tagInputValue,
            page: tagPagination,
            columns: sColumnsResult.columns,
        });

        if (sTagPage.errorMessage) {
            clearLoadedTagState(EMPTY_TAG_SELECTION_COLUMNS);
            Toast.error(sTagPage.errorMessage, undefined);
            return;
        }

        setSourceColumns(sTagPage.columns);
        updateTotal(sTagPage.total);
        setAvailableTags(sTagPage.items);
    }, [
        clearLoadedTagState,
        ensureColumns,
        selectedTable,
        tagInputValue,
        tagPagination,
        updateTotal,
    ]);
    const handleSearch = useCallback(() => {
        if (tagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
            return;
        }

        void loadTagList();
    }, [loadTagList, tagPagination]);
    const addTag = useCallback(
        async (tagName: string) => {
            const sColumnsResult = await ensureColumns();
            const sSourceColumns = sColumnsResult.columns;
            if (!sSourceColumns) {
                Toast.error(sColumnsResult.errorMessage ?? '', undefined);
                return false;
            }
            if (!sSourceColumns.time) {
                Toast.error('please select time field.', undefined);
                return false;
            }
            if (!sSourceColumns.value) {
                Toast.error('please select value field.', undefined);
                return false;
            }
            if (
                isTagAnalyzerJsonValue(tableColumns, sSourceColumns.value) &&
                !sSourceColumns.jsonKey
            ) {
                Toast.error('please select JSON key.', undefined);
                return false;
            }

            setSelectedSeriesDrafts((previousDrafts) => [
                ...previousDrafts,
                {
                    key: getId(),
                    sourceTagName: tagName,
                    table: selectedTable,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1.0,
                    sourceColumns: sSourceColumns,
                },
            ]);
            return true;
        },
        [ensureColumns, selectedTable, tableColumns],
    );
    const removeSelectedTag = useCallback((tagId: string) => {
        setSelectedSeriesDrafts((previousDrafts) =>
            previousDrafts.filter((item) => item.key !== tagId),
        );
    }, []);
    const setTagMode = useCallback(
        (value: string, target: TagSelectionDraftItem) => {
            setSelectedSeriesDrafts((previousDrafts) =>
                previousDrafts.map((item) => {
                    return isSameSelectedTag(item, target)
                        ? { ...item, calculationMode: value }
                        : item;
                }),
            );
        },
        [isSameSelectedTag],
    );
    const changeTable = useCallback(
        (value: string) => {
            setSelectedTable(value);
            resetSearchControls();
            clearLoadedTagState(undefined);
        },
        [clearLoadedTagState, resetSearchControls],
    );

    const changeTimeColumn = useCallback(
        (value: string) => {
            updateSourceColumns(
                createTagAnalyzerColumnInfo(tableColumns, {
                    ...sourceColumns,
                    time: value,
                }),
            );
        },
        [sourceColumns, tableColumns, updateSourceColumns],
    );
    const changeValueColumn = useCallback(
        (value: string) => {
            const sJsonKey =
                isTagAnalyzerJsonValue(tableColumns, value) &&
                sourceColumns?.value === value
                    ? sourceColumns?.jsonKey ?? ''
                    : '';
            setJsonKeyInputDraft(undefined);
            updateSourceColumns(
                createTagAnalyzerColumnInfo(tableColumns, {
                    ...sourceColumns,
                    value: value,
                    jsonKey: sJsonKey,
                }),
            );
        },
        [sourceColumns, tableColumns, updateSourceColumns],
    );
    const changeJsonKey = useCallback(
        (value: string) => {
            if (!sourceColumns) {
                return;
            }

            const sKnownPaths =
                (sourceColumns.value && jsonPathOptions[sourceColumns.value]) || [];
            updateSourceColumns(
                createTagAnalyzerColumnInfo(tableColumns, {
                    ...sourceColumns,
                    jsonKey: jsonPathInputToStoredPath(value, sKnownPaths),
                }),
            );
        },
        [jsonPathOptions, sourceColumns, tableColumns, updateSourceColumns],
    );
    const commitJsonKeyInput = useCallback(() => {
        if (jsonKeyInputDraft === undefined) {
            return;
        }

        changeJsonKey(jsonKeyInputDraft);
        setJsonKeyInputDraft(undefined);
    }, [changeJsonKey, jsonKeyInputDraft]);

    const isAtSelectionLimit = selectedSeriesDrafts.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / TAG_SEARCH_PAGE_LIMIT);
    }, [tagTotal]);

    const timeColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: item[0],
                value: item[0],
                disabled: undefined,
            })),
        [tableColumns],
    );
    const valueColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => ({
                label: isJsonTypeColumn(item[1]) ? `${item[0]} (JSON)` : item[0],
                value: item[0],
                disabled: undefined,
            })),
        [tableColumns],
    );
    const isJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );
    const selectedJsonKey = sourceColumns?.jsonKey ?? '';
    const jsonKeyOptions = useMemo<DropdownOption[]>(
        () =>
            ((sourceColumns?.value && jsonPathOptions[sourceColumns.value]) || []).map(
                (path) => ({
                    label: displayJsonPathLabel(path),
                    value: path,
                    disabled: undefined,
                }),
            ),
        [jsonPathOptions, sourceColumns?.value],
    );

    useEffect(() => {
        const loadJsonPathOptions = async () => {
            if (
                !selectedTable ||
                !sourceColumns?.value ||
                !isTagAnalyzerJsonValue(tableColumns, sourceColumns.value) ||
                jsonPathOptions[sourceColumns.value]
            ) {
                return;
            }

            const sPaths = await fetchJsonColumnPaths(selectedTable, sourceColumns.value);
            setJsonPathOptions((previousOptions) => ({
                ...previousOptions,
                [sourceColumns.value]: sPaths,
            }));
        };

        void loadJsonPathOptions();
    }, [jsonPathOptions, selectedTable, sourceColumns?.value, tableColumns]);

    useDebounce([tagPagination, selectedTable, reloadKey], loadTagList, 200, undefined);

    return {
        selectedTable,
        setSelectedTable: changeTable,
        tableOptions,
        tableColumns,
        availableTags,
        tagTotal,
        tagInputValue,
        filterTag,
        tagPagination,
        setTagPagination,
        keepPageNum,
        setKeepPageNum,
        selectedSeriesDrafts,
        setSelectedSeriesDrafts,
        sourceColumns,
        timeColumnOptions,
        valueColumnOptions,
        jsonKeyOptions,
        isJsonValue,
        jsonKeyInputValue:
            jsonKeyInputDraft ?? displayJsonPathLabel(selectedJsonKey),
        resetState,
        handleSearch,
        addTag,
        removeSelectedTag,
        setTagMode,
        changeTimeColumn,
        changeValueColumn,
        changeJsonKey,
        setJsonKeyInputDraft,
        commitJsonKeyInput,
        isAtSelectionLimit,
        maxPageNum,
        loadTagList,
    };
};
