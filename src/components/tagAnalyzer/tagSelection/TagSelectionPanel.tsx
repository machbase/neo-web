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
    tableOptions,
    selectedTable,
    onSelectedTableChange,
    tagTotal,
    tagInputValue,
    onTagInputChange,
    onSearch,
    availableTags,
    onAvailableTagSelect,
    selectedSeriesDrafts,
    onSelectedSeriesDraftRemove,
    renderSelectedSeriesDraftLabel,
    maxSelectedCount,
    paginationProp,
}: TagSelectionPanelProps) => {
    const sSelectedSeriesDraftListItems = mapSelectedSeriesDraftListItems(
        selectedSeriesDrafts,
    );

    /**
     * Handles keyboard removal for a selected draft row.
     * Intent: Allow the selected-tag list to support Enter and Space activation like a button.
     * @param {KeyboardEvent<HTMLDivElement>} aEvent The keyboard event from the selected row.
     * @param {string} aTagId The selected draft id to remove.
     * @returns {void} Nothing.
     */
    const handleSelectedSeriesDraftKeyDown = (
        aEvent: KeyboardEvent<HTMLDivElement>,
        aTagId: string,
    ) => {
        if (aEvent.target !== aEvent.currentTarget) {
            return;
        }

        if (aEvent.key === 'Enter' || aEvent.key === ' ') {
            aEvent.preventDefault();
            onSelectedSeriesDraftRemove(aTagId);
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
                className={undefined}
                style={undefined}
                defaultValue={undefined}
                onOpenChange={undefined}
                disabled={undefined}
                placeholder={undefined}
            >
                <Dropdown.Trigger className={undefined} style={undefined} children={undefined} />
                <Dropdown.Menu className={undefined}>
                    <Dropdown.List children={undefined} className={undefined} />
                </Dropdown.Menu>
            </Dropdown.Root>

            <Input
                label={`Tag (${tagTotal})`}
                labelPosition="left"
                value={tagInputValue}
                onChange={(aEvent) => onTagInputChange(aEvent.target.value)}
                onKeyDown={(aEvent) => aEvent.key === 'Enter' && onSearch()}
                fullWidth
                size="sm"
                rightIcon={
                    <Button
                        variant="ghost"
                        size="icon"
                        icon={<Search size={16} />}
                        onClick={onSearch}
                        aria-label="Search tags"
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                }
                variant={undefined}
                error={undefined}
                helperText={undefined}
                leftIcon={undefined}
            />

            <div style={{ display: 'flex', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
                <div style={{ flex: '1 1 0', minWidth: '120px', maxWidth: '120px' }} />

                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                    <List
                        maxHeight={200}
                        items={mapTagSearchItemsToListItems(availableTags)}
                        onItemClick={(aId) => {
                            const sTag = findTagById(availableTags, aId);
                            if (sTag) {
                                onAvailableTagSelect(sTag.name);
                            }
                        }}
                        isLoading={undefined}
                        emptyMessage={undefined}
                        className={undefined}
                        style={undefined}
                    />
                    <Pagination
                        currentPage={paginationProp.tagPagination}
                        totalPages={paginationProp.maxPageNum}
                        onPageChange={paginationProp.onPageChange}
                        inputValue={String(paginationProp.keepPageNum)}
                        onPageInputChange={paginationProp.onPageInputChange}
                        style={{ marginTop: '8px' }}
                        onPageInputApply={undefined}
                        showTotalPage={undefined}
                        className={undefined}
                        showInputControl={undefined}
                    />
                </div>

                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                    <div className={listStyles.list} style={SELECTED_SERIES_LIST_STYLE}>
                        {sSelectedSeriesDraftListItems.length > 0 ? (
                            <div className={`${listStyles['list__items']} scrollbar-dark`}>
                                {sSelectedSeriesDraftListItems.map((aItem) => (
                                    <div
                                        key={aItem.id}
                                        role="button"
                                        tabIndex={0}
                                        title={aItem.tooltip}
                                        className={listStyles['list__item']}
                                        style={SELECTED_SERIES_ITEM_STYLE}
                                        onClick={() => onSelectedSeriesDraftRemove(aItem.id)}
                                        onKeyDown={(aEvent) =>
                                            handleSelectedSeriesDraftKeyDown(
                                                aEvent,
                                                aItem.id,
                                            )
                                        }
                                    >
                                        <div className={listStyles['list__item-label']}>
                                            {renderSelectedSeriesDraftLabel(
                                                aItem.selectedSeriesDraft,
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
                            color: getTagSelectionCountColor(
                                selectedSeriesDrafts.length,
                                maxSelectedCount,
                            ),
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
