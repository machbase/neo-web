import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import listStyles from '@/design-system/components/List/index.module.scss';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { getSourceTagName } from '../../utils/legacy/LegacySeriesAdapter';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
} from './tagSelectionPresentation';
import type { TagSearchItem, TagSelectionDraftItem } from './tagSelectionTypes';

type TagSearchListItem = {
    id: string;
    label: ReactNode;
    tooltip: string;
};

export type SelectedSeriesDraftListItem = {
    id: string;
    selectedSeriesDraft: TagSelectionDraftItem;
    tooltip: string;
};

export type PaginationProp = {
    maxPageNum: number;
    tagPagination: number;
    onPageChange: (aPage: number) => void;
    keepPageNum: number | string;
    onPageInputChange: (aValue: number | string) => void;
};

const SELECTED_SERIES_LIST_STYLE: CSSProperties = {
    maxHeight: '200px',
};

const SELECTED_SERIES_ITEM_STYLE: CSSProperties = {
    height: 'auto',
};

/**
 * Maps tag search items into list-row view models.
 * Intent: Keep the search result rendering data separate from the fetched tag data.
 * @param {TagSearchItem[]} aAvailableTags The available tags returned from search.
 * @returns {TagSearchListItem[]} The list-row items used by the tag picker.
 */
export function mapTagSearchItemsToListItems(
    aAvailableTags: TagSearchItem[],
): TagSearchListItem[] {
    return aAvailableTags.map((aItem) => ({
        id: aItem.id,
        label: aItem.name,
        tooltip: aItem.name,
    }));
}

/**
 * Finds a tag search item by its list id.
 * Intent: Normalize string and numeric list-click ids before resolving the selected tag.
 * @param {TagSearchItem[]} aAvailableTags The available tags to search.
 * @param {string | number} aId The list id to resolve.
 * @returns {TagSearchItem | undefined} The matching tag item when one exists.
 */
export function findTagById(
    aAvailableTags: TagSearchItem[],
    aId: string | number,
): TagSearchItem | undefined {
    return aAvailableTags.find((aTag) => aTag.id === String(aId));
}

/**
 * Maps selected series drafts into list-row view models.
 * Intent: Keep the selected-tag list rendering data separate from the draft objects.
 * @param {TagSelectionDraftItem[]} aSelectedSeriesDrafts The selected draft items to map.
 * @returns {SelectedSeriesDraftListItem[]} The list-row items used by the selected-tag list.
 */
export function mapSelectedSeriesDraftListItems(
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return aSelectedSeriesDrafts.map((aItem) => ({
        id: aItem.key,
        selectedSeriesDraft: aItem,
        tooltip: getSourceTagName(aItem),
    }));
}

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
}: {
    tableOptions: DropdownOption[];
    selectedTable: string;
    onSelectedTableChange: (aValue: string) => void;
    tagTotal: number;
    tagInputValue: string;
    onTagInputChange: (aValue: string) => void;
    onSearch: () => void;
    availableTags: TagSearchItem[];
    onAvailableTagSelect: (aTagName: string) => void;
    selectedSeriesDrafts: TagSelectionDraftItem[];
    onSelectedSeriesDraftRemove: (aTagId: string) => void;
    renderSelectedSeriesDraftLabel: (aItem: TagSelectionDraftItem) => ReactNode;
    maxSelectedCount: number;
    paginationProp: PaginationProp;
}) => {
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
