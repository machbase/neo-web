import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import listStyles from '@/design-system/components/List/index.module.scss';
import type { KeyboardEvent } from 'react';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
} from './tagSelectionPresentation';
import {
    findTagById,
    mapSelectedSeriesDraftListItems,
    mapTagSearchItemsToListItems,
} from './tagSelectionPanelHelpers';
import {
    SELECTED_SERIES_ITEM_STYLE,
    SELECTED_SERIES_LIST_STYLE,
} from './TagSelectionConstants';
import type { TagSelectionPanelProps } from './TagSelectionTypes';

/**
 * Renders the tag selection panel and selected-draft list.
 * Intent: Keep the picker layout and row interactions isolated from the hook state.
 * @param {{ tableOptions: DropdownOption[]; selectedTable: string; onSelectedTableChange: (aValue: string) => void; tagTotal: number; tagInputValue: string; onTagInputChange: (aValue: string) => void; onSearch: () => void; availableTags: TagSearchItem[]; onAvailableTagSelect: (aTagName: string) => void; selectedSeriesDrafts: TagSelectionDraftItem[]; onSelectedSeriesDraftRemove: (aTagId: string) => void; renderSelectedSeriesDraftLabel: (aItem: TagSelectionDraftItem) => ReactNode; maxSelectedCount: number; paginationProp: PaginationProp; }} props The tag-selection panel inputs.
 * @returns {JSX.Element} The rendered tag-selection panel.
 */
const TagSelectionPanel = ({
    viewModel,
}: TagSelectionPanelProps) => {
    const {
        searchControls,
        availableTagList,
        selectedSeriesList,
    } = viewModel;
    const {
        tableOptions,
        selectedTable,
        onSelectedTableChange,
        tagTotal,
        tagInputValue,
        onTagInputChange,
        onSearch,
    } = searchControls;
    const {
        availableTags,
        onAvailableTagSelect,
        pagination,
    } = availableTagList;
    const {
        selectedSeriesDrafts,
        onSelectedSeriesDraftRemove,
        renderSelectedSeriesDraftLabel,
        maxSelectedCount,
    } = selectedSeriesList;
    const sAvailableTagListItems = mapTagSearchItemsToListItems(availableTags);
    const sSelectedSeriesDraftListItems = mapSelectedSeriesDraftListItems(
        selectedSeriesDrafts,
    );
    const sSelectedCountColor = getTagSelectionCountColor(
        selectedSeriesDrafts.length,
        maxSelectedCount,
    );

    /**
     * Handles keyboard removal for a selected draft row.
     * Intent: Allow the selected-tag list to support Enter and Space activation like a button.
     * @param {KeyboardEvent<HTMLDivElement>} event The keyboard event from the selected row.
     * @param {string} tagId The selected draft id to remove.
     * @returns {void} Nothing.
     */
    const handleSelectedSeriesDraftKeyDown = (
        event: KeyboardEvent<HTMLDivElement>,
        tagId: string,
    ) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectedSeriesDraftRemove(tagId);
        }
    };

    return (
        <>
            <Dropdown.Root
                label="Table"
                labelPosition="left"
                options={tableOptions}
                value={selectedTable}
                onChange={onSelectedTableChange}
                fullWidth
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>

            <Input
                label={`Tag (${tagTotal})`}
                labelPosition="left"
                value={tagInputValue}
                onChange={(event) => onTagInputChange(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && onSearch()}
                fullWidth
                size="sm"
                rightIcon={
                    <Button
                        variant="ghost"
                        size="icon"
                        icon={<Search size={16} />}
                        onClick={onSearch}
                        aria-label="Search tags"
                    />
                }
            />

            <div style={{ display: 'flex', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
                <div style={{ flex: '1 1 0', minWidth: '120px', maxWidth: '120px' }} />

                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                    <List
                        maxHeight={200}
                        items={sAvailableTagListItems}
                        onItemClick={(id) => {
                            const sTag = findTagById(availableTags, id);
                            if (sTag) {
                                onAvailableTagSelect(sTag.name);
                            }
                        }}
                    />
                    <Pagination
                        currentPage={pagination.tagPagination}
                        totalPages={pagination.maxPageNum}
                        onPageChange={pagination.onPageChange}
                        inputValue={String(pagination.keepPageNum)}
                        onPageInputChange={pagination.onPageInputChange}
                        style={{ marginTop: '8px' }}
                    />
                </div>

                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                    <div className={listStyles.list} style={SELECTED_SERIES_LIST_STYLE}>
                        {sSelectedSeriesDraftListItems.length > 0 ? (
                            <div className={`${listStyles['list__items']} scrollbar-dark`}>
                                {sSelectedSeriesDraftListItems.map((item) => (
                                    <div
                                        key={item.id}
                                        role="button"
                                        tabIndex={0}
                                        title={item.tooltip}
                                        className={listStyles['list__item']}
                                        style={SELECTED_SERIES_ITEM_STYLE}
                                        onClick={() => onSelectedSeriesDraftRemove(item.id)}
                                        onKeyDown={(event) =>
                                            handleSelectedSeriesDraftKeyDown(
                                                event,
                                                item.id,
                                            )
                                        }
                                    >
                                        <div className={listStyles['list__item-label']}>
                                            {renderSelectedSeriesDraftLabel(
                                                item.selectedSeriesDraft,
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={listStyles['list__empty']}>no-data</div>
                        )}
                    </div>
                    <div
                        style={{
                            marginTop: '8px',
                            textAlign: 'right',
                            fontSize: '12px',
                            color: sSelectedCountColor,
                        }}
                    >
                        {buildTagSelectionCountLabel(
                            selectedSeriesDrafts.length,
                            maxSelectedCount,
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TagSelectionPanel;
