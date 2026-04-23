import { useCallback, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import useDebounce from '@/hooks/useDebounce';
import { getId } from '@/utils';
import {
    fetchTagSearchColumns,
    fetchTagSearchPage,
} from './TagSelectionSearchRepository';
import { EMPTY_TAG_SELECTION_COLUMNS } from './TagSelectionConstants';
import { withNormalizedSourceTagName } from '../utils/legacy/LegacySeriesAdapter';
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
    const [selectedTable, setSelectedTable] = useState<string>(initialTable ?? tables?.[0] ?? '');
    const [availableTags, setAvailableTags] = useState<TagSearchItem[]>([]);
    const [tagPagination, setTagPagination] = useState(1);
    const [keepPageNum, setKeepPageNum] = useState<number | string>(1);
    const [selectedSeriesDrafts, setSelectedSeriesDrafts] = useState<TagSelectionDraftItem[]>(
        [],
    );
    const [tagInputValue, setTagInputValue] = useState('');
    const [searchText, setSearchText] = useState('');
    const [tagTotal, setTagTotal] = useState(0);
    const [sourceColumns, setSourceColumns] = useState<
        TagSelectionSourceColumns | undefined
    >();
    const [reloadKey, setReloadKey] = useState(0);

    const tableOptions = useMemo(() => {
        return (
            tables?.map((aTable) => ({
                value: aTable,
                label: aTable,
                disabled: undefined,
            })) || []
        );
    }, [tables]);

    /**
     * Resets the local search and pagination controls.
     * Intent: Clear stale search state before a fresh table query or table switch.
     * @returns {void} Nothing.
     */
    const resetPagingAndSearch = useCallback(() => {
        setTagPagination(1);
        setKeepPageNum(1);
        setTagInputValue('');
        setSearchText('');
    }, []);

    /**
     * Updates the cached tag total only when the total changes.
     * Intent: Avoid unnecessary state churn when the fetched total matches the current value.
     * @param {number} aTotal The latest tag total.
     * @returns {void} Nothing.
     */
    const updateTotal = useCallback((aTotal: number) => {
        setTagTotal((aPreviousTotal) =>
            aPreviousTotal === aTotal ? aPreviousTotal : aTotal,
        );
    }, []);

    /**
     * Resets the hook state for a different selected table.
     * Intent: Reinitialize search, selection, and cached data when the table context changes.
     * @param {string | undefined} aNextTable The next table to activate.
     * @returns {void} Nothing.
     */
    const resetState = useCallback(
        (aNextTable: string | undefined) => {
            resetPagingAndSearch();
            setSelectedSeriesDrafts([]);
            updateTotal(0);
            setSourceColumns(undefined);
            setAvailableTags([]);
            setSelectedTable(aNextTable ?? tables?.[0] ?? '');
            setReloadKey((aPreviousReloadKey) => aPreviousReloadKey + 1);
        },
        [resetPagingAndSearch, tables, updateTotal],
    );

    /**
     * Updates the visible tag filter text and pending search text.
     * Intent: Keep the input field and the debounced query string in sync.
     * @param {string} aValue The new tag filter text.
     * @returns {void} Nothing.
     */
    const filterTag = useCallback((aValue: string) => {
        setTagInputValue(aValue);
        setSearchText(aValue);
    }, []);

    /**
     * Loads or reuses the source columns for the selected table.
     * Intent: Share one column lookup path across search and tag creation.
     * @param {boolean} aForceRefresh Whether to ignore cached columns and fetch again.
     * @returns {Promise<{ columns: TagSelectionSourceColumns | undefined; errorMessage: string | undefined; }>} The fetched or cached columns result.
     */
    const ensureColumns = useCallback(
        async (aForceRefresh = false) => {
            if (!selectedTable) {
                return {
                    columns: undefined,
                    errorMessage: undefined,
                };
            }

            if (!aForceRefresh && sourceColumns) {
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
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(undefined);
            return;
        }

        const sColumnsResult = await ensureColumns(searchText === '');
        if (!sColumnsResult.columns) {
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(EMPTY_TAG_SELECTION_COLUMNS);
            if (sColumnsResult.errorMessage) {
                Toast.error(sColumnsResult.errorMessage, undefined);
            }
            return;
        }

        const sTagPage = await fetchTagSearchPage({
            table: selectedTable,
            searchText,
            page: tagPagination,
            columns: sColumnsResult.columns,
        });

        if (sTagPage.errorMessage) {
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(EMPTY_TAG_SELECTION_COLUMNS);
            Toast.error(sTagPage.errorMessage, undefined);
            return;
        }

        setSourceColumns(sTagPage.columns);
        updateTotal(sTagPage.total);
        setAvailableTags(sTagPage.items);
    }, [ensureColumns, searchText, selectedTable, tagPagination, updateTotal]);

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
        async (aTagName: string) => {
            const sColumnsResult = await ensureColumns();
            const sSourceColumns = sColumnsResult.columns;
            if (!sSourceColumns) {
                Toast.error(sColumnsResult.errorMessage ?? '', undefined);
                return false;
            }

            setSelectedSeriesDrafts((aPreviousDrafts) => [
                ...aPreviousDrafts,
                withNormalizedSourceTagName({
                    key: getId(),
                    sourceTagName: aTagName,
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
    const removeSelectedTag = useCallback((aTagId: string) => {
        setSelectedSeriesDrafts((aPreviousDrafts) =>
            aPreviousDrafts.filter((aItem) => aItem.key !== aTagId),
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
        (aValue: string, aTarget: TagSelectionDraftItem) => {
            setSelectedSeriesDrafts((aPreviousDrafts) =>
                aPreviousDrafts.map((aItem) => {
                    return isSameSelectedTag(aItem, aTarget)
                        ? { ...aItem, calculationMode: aValue }
                        : aItem;
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
        (aValue: string) => {
            setSelectedTable(aValue);
            resetPagingAndSearch();
            setAvailableTags([]);
            updateTotal(0);
            setSourceColumns(undefined);
        },
        [resetPagingAndSearch, updateTotal],
    );

    const isAtSelectionLimit = selectedSeriesDrafts.length >= maxSelectedCount;
    const maxPageNum = useMemo(() => {
        return Math.ceil(tagTotal / 10);
    }, [tagTotal]);

    useDebounce([tagPagination, selectedTable, reloadKey], loadTagList, 200, undefined);

    return {
        selectedTable,
        setSelectedTable: changeTable,
        tableOptions: tableOptions as DropdownOption[],
        availableTags,
        tagTotal,
        tagInputValue,
        searchText,
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
