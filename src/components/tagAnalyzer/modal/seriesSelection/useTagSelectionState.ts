import { useEffect, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    fetchJsonColumnPaths,
    fetchTagSearchColumns,
    fetchTagSearchPage,
} from './TagSelectionSearchRepository';
import { fetchRollupMetadata } from '../../fetch/RollupMetadataFetcher';
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
import {
    formatTimeColumnOptionLabel,
    formatValueColumnOptionLabel,
    getTimeColumnKindLabel,
    getValueSummaryLabel,
} from './TagSelectionColumnMetadata';
import { getMixedXAxisValueKindWarning } from '../../domain/SeriesDomain';
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
    existingSeries = [],
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
    const [rollupMetadata, setRollupMetadata] = useState<unknown>(undefined);
    const [reloadKey, setReloadKey] = useState(0);
    const [axisKindWarning, setAxisKindWarning] = useState<string | undefined>(
        getMixedXAxisValueKindWarning(existingSeries),
    );

    const tableOptions = useMemo<DropdownOption[]>(() => {
        return tables.map((table) => ({
            value: table,
            label: table,
            disabled: undefined,
        }));
    }, [tables]);
    const getAxisKindWarningForDrafts = (
        drafts: TagSelectionDraftItem[],
    ): string | undefined =>
        getMixedXAxisValueKindWarning([...existingSeries, ...drafts]);
    const rejectAxisKindMismatch = (warning: string): boolean => {
        setAxisKindWarning(warning);
        Toast.error(warning, undefined);
        return true;
    };
    const resetSearchControls = () => {
        setTagPagination(1);
        setKeepPageNum(1);
        setTagInputValue('');
    };
    const updateTotal = (total: number) => {
        setTagTotal((previousTotal) =>
            previousTotal === total ? previousTotal : total,
        );
    };
    const clearLoadedTagState = (nextColumns: TagSelectionSourceColumns | undefined) => {
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(nextColumns);
            setTableColumns([]);
            setJsonPathOptions({});
            setJsonKeyInputDraft(undefined);
        };
    const updateSourceColumns = (nextColumns: TagSelectionSourceColumns) => {
            const sNextDrafts = selectedSeriesDrafts.map((item) =>
                item.table === selectedTable
                    ? {
                          ...item,
                          sourceColumns: nextColumns,
                      }
                    : item,
            );
            const sAxisKindWarning = getAxisKindWarningForDrafts(sNextDrafts);

            if (sAxisKindWarning) {
                rejectAxisKindMismatch(sAxisKindWarning);
                return;
            }

            setSourceColumns(nextColumns);
            setSelectedSeriesDrafts(sNextDrafts);
            setAxisKindWarning(undefined);
        };
    const resetState = (nextTable: string | undefined) => {
            resetSearchControls();
            setSelectedSeriesDrafts([]);
            setAxisKindWarning(getMixedXAxisValueKindWarning(existingSeries));
            clearLoadedTagState(undefined);
            setSelectedTable(nextTable ?? tables[0] ?? '');
            setReloadKey((previousReloadKey) => previousReloadKey + 1);
        };
    const filterTag = (value: string) => {
        if (tagPagination !== 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        }
        setTagInputValue(value);
    };
    const ensureColumns = async (forceRefresh = false) => {
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
        };
    const loadTagList = async () => {
        if (!selectedTable) {
            clearLoadedTagState(undefined);
            return;
        }

        const sHasLoadedTagState =
            Boolean(sourceColumns) ||
            tableColumns.length > 0 ||
            availableTags.length > 0;
        const sColumnsResult = await ensureColumns(tagInputValue === '');
        if (!sColumnsResult.columns) {
            if (!sHasLoadedTagState) {
                clearLoadedTagState(EMPTY_TAG_SELECTION_COLUMNS);
            }
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
            if (!sHasLoadedTagState) {
                clearLoadedTagState(EMPTY_TAG_SELECTION_COLUMNS);
            }
            Toast.error(sTagPage.errorMessage, undefined);
            return;
        }

        setSourceColumns(sTagPage.columns);
        updateTotal(sTagPage.total);
        setAvailableTags(sTagPage.items);
    };
    const handleSearch = () => {
        if (tagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
            return;
        }

        void loadTagList();
    };
    const addTag = async (tagName: string) => {
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

            const sNextDraft = {
                key: getId(),
                sourceTagName: tagName,
                table: selectedTable,
                calculationMode: 'avg',
                alias: '',
                weight: 1.0,
                sourceColumns: sSourceColumns,
            };
            const sNextDrafts = [...selectedSeriesDrafts, sNextDraft];
            const sAxisKindWarning = getAxisKindWarningForDrafts(sNextDrafts);

            if (sAxisKindWarning) {
                return !rejectAxisKindMismatch(sAxisKindWarning);
            }

            setSelectedSeriesDrafts(sNextDrafts);
            setAxisKindWarning(undefined);
            return true;
        };
    const removeSelectedTag = (tagId: string) => {
        const sNextDrafts = selectedSeriesDrafts.filter((item) => item.key !== tagId);

        setSelectedSeriesDrafts(sNextDrafts);
        setAxisKindWarning(getAxisKindWarningForDrafts(sNextDrafts));
    };
    const setTagMode = (value: string, target: TagSelectionDraftItem) => {
            setSelectedSeriesDrafts((previousDrafts) =>
                previousDrafts.map((item) => {
                    return isSameSelectedTag(item, target)
                        ? { ...item, calculationMode: value }
                        : item;
                }),
            );
        };
    const changeTable = (value: string) => {
            resetSearchControls();
            setAxisKindWarning(getMixedXAxisValueKindWarning(existingSeries));

            if (value === selectedTable) {
                setReloadKey((previousReloadKey) => previousReloadKey + 1);
                return;
            }

            setSelectedTable(value);
            clearLoadedTagState(undefined);
            setReloadKey((previousReloadKey) => previousReloadKey + 1);
        };

    const changeTimeColumn = (value: string) => {
            updateSourceColumns(
                createTagAnalyzerColumnInfo(tableColumns, {
                    ...sourceColumns,
                    time: value,
                }),
            );
        };
    const changeValueColumn = (value: string) => {
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
        };
    const changeJsonKey = (value: string) => {
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
        };
    const commitJsonKeyInput = () => {
        if (jsonKeyInputDraft === undefined) {
            return;
        }

        changeJsonKey(jsonKeyInputDraft);
        setJsonKeyInputDraft(undefined);
    };

    const isAtSelectionLimit = selectedSeriesDrafts.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / TAG_SEARCH_PAGE_LIMIT);
    }, [tagTotal]);

    const timeColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerTimeColumns(tableColumns).map((item) => ({
                label: formatTimeColumnOptionLabel(item[0], item[1]),
                value: item[0],
                disabled: undefined,
            })),
        [tableColumns],
    );
    const valueColumnOptions = useMemo<DropdownOption[]>(
        () =>
            getTagAnalyzerValueColumns(tableColumns).map((item) => {
                const sIsJsonColumn = isJsonTypeColumn(item[1]);
                const sSummaryLabel = sIsJsonColumn
                    ? undefined
                    : getValueSummaryLabel(
                          rollupMetadata,
                          selectedTable,
                          item[0],
                      );

                return {
                    label: sIsJsonColumn
                        ? `${item[0]} (JSON)`
                        : formatValueColumnOptionLabel(item[0], sSummaryLabel),
                    value: item[0],
                    disabled: undefined,
                };
            }),
        [rollupMetadata, selectedTable, tableColumns],
    );
    const isJsonValue = isTagAnalyzerJsonValue(
        tableColumns,
        sourceColumns?.value ?? '',
    );
    const selectedJsonKey = sourceColumns?.jsonKey ?? '';
    const selectedTimeColumnKindLabel = getTimeColumnKindLabel(
        tableColumns,
        sourceColumns?.time ?? '',
    );
    const selectedValueColumnSummaryLabel = isJsonValue
        ? undefined
        : getValueSummaryLabel(
              rollupMetadata,
              selectedTable,
              sourceColumns?.value ?? '',
          );
    const selectedJsonKeySummaryLabel = isJsonValue && selectedJsonKey
        ? getValueSummaryLabel(
              rollupMetadata,
              selectedTable,
              sourceColumns?.value ?? '',
              selectedJsonKey,
          )
        : undefined;
    const jsonKeyOptions = useMemo<DropdownOption[]>(
        () =>
            ((sourceColumns?.value && jsonPathOptions[sourceColumns.value]) || []).map(
                (path) => {
                    const sSummaryLabel = getValueSummaryLabel(
                        rollupMetadata,
                        selectedTable,
                        sourceColumns?.value ?? '',
                        path,
                    );

                    return {
                        label: formatValueColumnOptionLabel(
                            displayJsonPathLabel(path),
                            sSummaryLabel,
                        ),
                        value: path,
                        disabled: undefined,
                    };
                },
            ),
        [jsonPathOptions, rollupMetadata, selectedTable, sourceColumns?.value],
    );

    useEffect(() => {
        let sIsActive = true;

        void (async () => {
            const sRollupMetadata = await fetchRollupMetadata().catch(() => []);
            if (sIsActive) {
                setRollupMetadata(sRollupMetadata);
            }
        })();

        return () => {
            sIsActive = false;
        };
    }, []);

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

    useDebounce(
        [tagInputValue, tagPagination, selectedTable, reloadKey],
        loadTagList,
        200,
        undefined,
    );

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
        axisKindWarning,
        sourceColumns,
        timeColumnOptions,
        valueColumnOptions,
        jsonKeyOptions,
        selectedTimeColumnKindLabel,
        selectedValueColumnSummaryLabel,
        selectedJsonKeySummaryLabel,
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
