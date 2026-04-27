import { useCallback, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    fetchTagSearchColumns,
    fetchTagSearchPage,
} from './TagSelectionSearchRepository';
import {
    EMPTY_TAG_SELECTION_COLUMNS,
    TAG_SEARCH_PAGE_LIMIT,
} from './TagSelectionConstants';
import { withNormalizedSourceTagName } from '../../utils/series/PanelSeriesSourceTag';
import type {
    TagSearchItem,
    TagSelectionDraftItem,
    TagSelectionSourceColumns,
    UseTagSelectionStateOptions,
} from './TagSelectionTypes';

/**
 * Manages tag-selection search, pagination, and selected-draft state.
 * Intent: Keep the shared tag-selection workflow reusable across modal and panel screens.
 * @param {UseTagSelectionStateOptions} props The hook options for the current tag-selection session.
 * @returns {object} The tag-selection state and action bundle.
 */
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
    const [reloadKey, setReloadKey] = useState(0);

    const tableOptions = useMemo<DropdownOption[]>(() => {
        return tables.map((table) => ({
            value: table,
            label: table,
            disabled: undefined,
        }));
    }, [tables]);

    /**
     * Resets the local search and pagination controls.
     * Intent: Clear stale search state before a fresh table query or table switch.
     * @returns {void} Nothing.
     */
    const resetSearchControls = useCallback(() => {
        setTagPagination(1);
        setKeepPageNum(1);
        setTagInputValue('');
    }, []);

    /**
     * Updates the cached tag total only when the total changes.
     * Intent: Avoid unnecessary state churn when the fetched total matches the current value.
     * @param {number} aTotal The latest tag total.
     * @returns {void} Nothing.
     */
    const updateTotal = useCallback((total: number) => {
        setTagTotal((previousTotal) =>
            previousTotal === total ? previousTotal : total,
        );
    }, []);

    /**
     * Clears the currently loaded tag page, total, and source-column cache.
     * Intent: Keep all visible tag-search result resets on one explicit path.
     * @param {TagSelectionSourceColumns | undefined} nextColumns The source columns to keep after clearing.
     * @returns {void} Nothing.
     */
    const clearLoadedTagState = useCallback(
        (nextColumns: TagSelectionSourceColumns | undefined) => {
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(nextColumns);
        },
        [updateTotal],
    );

    /**
     * Resets the hook state for a different selected table.
     * Intent: Reinitialize search, selection, and cached data when the table context changes.
     * @param {string | undefined} aNextTable The next table to activate.
     * @returns {void} Nothing.
     */
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

    /**
     * Updates the visible tag filter text.
     * Intent: Keep the input field state on one explicit update path.
     * @param {string} aValue The new tag filter text.
     * @returns {void} Nothing.
     */
    const filterTag = useCallback((value: string) => {
        setTagInputValue(value);
    }, []);

    /**
     * Loads or reuses the source columns for the selected table.
     * Intent: Share one column lookup path across search and tag creation.
     * @param {boolean} aForceRefresh Whether to ignore cached columns and fetch again.
     * @returns {Promise<{ columns: TagSelectionSourceColumns | undefined; errorMessage: string | undefined; }>} The fetched or cached columns result.
     */
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

            const sResult = await fetchTagSearchColumns(selectedTable);
            if (sResult.columns) {
                setSourceColumns(sResult.columns);
            }

            return sResult;
        },
        [selectedTable, sourceColumns],
    );

    /**
     * Loads the current tag page for the selected table.
     * Intent: Keep search, pagination, and error handling in one fetch path.
     * @returns {Promise<void>} A promise that resolves after the tag list refresh completes.
     */
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

    /**
     * Runs the current tag search or resets pagination first.
     * Intent: Reuse one handler for both the search button and the Enter key.
     * @returns {void} Nothing.
     */
    const handleSearch = useCallback(() => {
        if (tagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
            return;
        }

        void loadTagList();
    }, [loadTagList, tagPagination]);

    /**
     * Adds a normalized tag draft after loading its columns.
     * Intent: Ensure new selections always carry the current source-column mapping.
     * @param {string} aTagName The tag name to add.
     * @returns {Promise<boolean>} A promise that resolves to true when the tag is added.
     */
    const addTag = useCallback(
        async (tagName: string) => {
            const sColumnsResult = await ensureColumns();
            const sSourceColumns = sColumnsResult.columns;
            if (!sSourceColumns) {
                Toast.error(sColumnsResult.errorMessage ?? '', undefined);
                return false;
            }

            setSelectedSeriesDrafts((previousDrafts) => [
                ...previousDrafts,
                withNormalizedSourceTagName({
                    key: getId(),
                    sourceTagName: tagName,
                    table: selectedTable,
                    calculationMode: 'avg',
                    alias: '',
                    weight: 1.0,
                    sourceColumns: sSourceColumns,
                }),
            ]);
            return true;
        },
        [ensureColumns, selectedTable],
    );

    /**
     * Removes a selected tag draft by id.
     * Intent: Keep the selected-tag list mutable from both clicks and keyboard actions.
     * @param {string} aTagId The selected draft id to remove.
     * @returns {void} Nothing.
     */
    const removeSelectedTag = useCallback((tagId: string) => {
        setSelectedSeriesDrafts((previousDrafts) =>
            previousDrafts.filter((item) => item.key !== tagId),
        );
    }, []);

    /**
     * Updates the calculation mode for the matching selected draft.
     * Intent: Keep aggregation changes scoped to the targeted selected tag.
     * @param {string} aValue The new aggregation mode value.
     * @param {TagSelectionDraftItem} aTarget The selected draft being updated.
     * @returns {void} Nothing.
     */
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

    /**
     * Switches the active table and clears the current search state.
     * Intent: Reset selection state when the user changes the table context.
     * @param {string} aValue The newly selected table name.
     * @returns {void} Nothing.
     */
    const changeTable = useCallback(
        (value: string) => {
            setSelectedTable(value);
            resetSearchControls();
            clearLoadedTagState(undefined);
        },
        [clearLoadedTagState, resetSearchControls],
    );

    const isAtSelectionLimit = selectedSeriesDrafts.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / TAG_SEARCH_PAGE_LIMIT);
    }, [tagTotal]);

    useDebounce([tagPagination, selectedTable, reloadKey], loadTagList, 200, undefined);

    return {
        selectedTable,
        setSelectedTable: changeTable,
        tableOptions,
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
        resetState,
        handleSearch,
        addTag,
        removeSelectedTag,
        setTagMode,
        isAtSelectionLimit,
        maxPageNum,
        loadTagList,
    };
};
