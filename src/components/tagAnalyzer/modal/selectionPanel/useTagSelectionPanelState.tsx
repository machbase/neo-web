import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type {
    TagSelectionPanelViewModel,
    UseTagSelectionStateOptions,
} from '../seriesSelection/TagSelectionTypes';
import { useTagSelectionState } from '../seriesSelection/useTagSelectionState';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../../domain/SeriesModel';

type UseTagSelectionPanelStateOptions = {
    tables: string[];
    initialTable: string | undefined;
    maxSelectedCount: number;
    isSameSelectedTag: UseTagSelectionStateOptions['isSameSelectedTag'];
    modeTriggerStyle: CSSProperties | undefined;
    onSelectionLimitReached?: () => void;
};
export function useTagSelectionPanelState({
    tables,
    initialTable,
    maxSelectedCount,
    isSameSelectedTag,
    modeTriggerStyle,
    onSelectionLimitReached,
}: UseTagSelectionPanelStateOptions) {
    const tagSearch = useTagSelectionState({
        tables,
        initialTable,
        maxSelectedCount,
        isSameSelectedTag,
    });

    const handleAvailableTagSelect = useCallback(
        async (tagName: string) => {
            if (tagSearch.isAtSelectionLimit) {
                onSelectionLimitReached?.();
                return;
            }

            await tagSearch.addTag(tagName);
        },
        [onSelectionLimitReached, tagSearch],
    );

    const viewModel = useMemo<TagSelectionPanelViewModel>(
        () => ({
            searchControls: {
                tableOptions: tagSearch.tableOptions,
                selectedTable: tagSearch.selectedTable,
                onSelectedTableChange: tagSearch.setSelectedTable,
                tagTotal: tagSearch.tagTotal,
                tagInputValue: tagSearch.tagInputValue,
                onTagInputChange: tagSearch.filterTag,
                onSearch: tagSearch.handleSearch,
            },
            columnControls: {
                timeColumnOptions: tagSearch.timeColumnOptions,
                valueColumnOptions: tagSearch.valueColumnOptions,
                jsonKeyOptions: tagSearch.jsonKeyOptions,
                selectedTimeColumn: tagSearch.sourceColumns?.time ?? '',
                selectedValueColumn: tagSearch.sourceColumns?.value ?? '',
                selectedJsonKey: tagSearch.sourceColumns?.jsonKey ?? '',
                jsonKeyInputValue: tagSearch.jsonKeyInputValue,
                isJsonValue: tagSearch.isJsonValue,
                isDisabled: !tagSearch.selectedTable,
                onTimeColumnChange: tagSearch.changeTimeColumn,
                onValueColumnChange: tagSearch.changeValueColumn,
                onJsonKeyInputChange: tagSearch.setJsonKeyInputDraft,
                onJsonKeyInputBlur: tagSearch.commitJsonKeyInput,
                onJsonKeySelect: (value) => {
                    tagSearch.setJsonKeyInputDraft(undefined);
                    tagSearch.changeJsonKey(value);
                },
            },
            availableTagList: {
                availableTags: tagSearch.availableTags,
                onAvailableTagSelect: handleAvailableTagSelect,
                pagination: {
                    maxPageNum: tagSearch.maxPageNum,
                    tagPagination: tagSearch.tagPagination,
                    onPageChange: tagSearch.setTagPagination,
                    keepPageNum: tagSearch.keepPageNum,
                    onPageInputChange: tagSearch.setKeepPageNum,
                },
            },
            selectedSeriesList: {
                selectedSeriesDrafts: tagSearch.selectedSeriesDrafts,
                onSelectedSeriesDraftRemove: tagSearch.removeSelectedTag,
                modeOptions: TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
                modeTriggerStyle: modeTriggerStyle,
                onSelectedSeriesDraftModeChange: tagSearch.setTagMode,
                maxSelectedCount: maxSelectedCount,
            },
        }),
        [handleAvailableTagSelect, maxSelectedCount, modeTriggerStyle, tagSearch],
    );

    return {
        tagSearch,
        viewModel,
    };
}
