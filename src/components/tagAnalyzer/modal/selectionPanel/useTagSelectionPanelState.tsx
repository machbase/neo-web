import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import TagSelectionModeRow from '../seriesSelection/TagSelectionModeRow';
import type {
    TagSelectionPanelViewModel,
    UseTagSelectionStateOptions,
} from '../seriesSelection/TagSelectionTypes';
import { useTagSelectionState } from '../seriesSelection/useTagSelectionState';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../../utils/series/PanelSeriesAggregationConstants';

type UseTagSelectionPanelStateOptions = {
    tables: string[];
    initialTable: string | undefined;
    maxSelectedCount: number;
    isSameSelectedTag: UseTagSelectionStateOptions['isSameSelectedTag'];
    modeTriggerStyle: CSSProperties | undefined;
    onSelectionLimitReached?: () => void;
};

/**
 * Builds the shared tag-selection hook state plus the panel view-model used by selection modals.
 * Intent: Keep create-chart and add-tags modals from duplicating tag-selection wiring.
 * @param options The table, selection-limit, comparison, and presentation options for the current selection modal.
 * @returns The shared tag-selection hook state and the view-model consumed by TagSelectionPanel.
 */
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
                renderSelectedSeriesDraftLabel: (selectedSeriesDraft) => (
                    <TagSelectionModeRow
                        selectedSeriesDraft={selectedSeriesDraft}
                        options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                        onModeChange={(value) =>
                            tagSearch.setTagMode(value, selectedSeriesDraft)
                        }
                        triggerStyle={modeTriggerStyle}
                    />
                ),
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
