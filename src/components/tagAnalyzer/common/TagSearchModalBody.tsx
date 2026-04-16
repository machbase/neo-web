import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import listStyles from '@/design-system/components/List/index.module.scss';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { TagSearchResultRow, TagSelectionDraftItem } from './useTagSearchModalState';
import { getSourceTagName } from '../utils/legacy/LegacyConversion';

export type PaginationProp = {
    maxPageNum: number;
    tagPagination: number;
    onPageChange: (aPage: number) => void;
    keepPageNum: number | string;
    onPageInputChange: (aValue: number | string) => void;
};

type TagSearchListItem = {
    id: string | number;
    label: ReactNode;
    tooltip: string;
};

export type SelectedSeriesDraftListItem = {
    id: string;
    selectedSeriesDraft: TagSelectionDraftItem;
    tooltip: string;
};

const SELECTED_SERIES_LIST_STYLE: CSSProperties = {
    maxHeight: '200px',
};

const SELECTED_SERIES_ITEM_STYLE: CSSProperties = {
    height: 'auto',
};

export const mapAvailableSearchResultListItems = (
    aAvailableTagResults: TagSearchResultRow[],
): TagSearchListItem[] => {
    return aAvailableTagResults.map((aItem) => ({
        id: aItem[0],
        label: aItem[1],
        tooltip: aItem[1],
    }));
};

export const findTagNameBySearchResultId = (
    aAvailableTagResults: TagSearchResultRow[],
    aId: string | number,
): string | undefined => {
    return aAvailableTagResults.find(
        (aTagSearchResult) => String(aTagSearchResult[0]) === String(aId),
    )?.[1];
};

export const mapSelectedSeriesDraftListItems = (
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] => {
    return aSelectedSeriesDrafts.map((aItem) => ({
        id: aItem.key,
        selectedSeriesDraft: aItem,
        tooltip: getSourceTagName(aItem),
    }));
};

const TagSearchModalBody = ({
    tableOptions,
    selectedTable,
    onSelectedTableChange,
    tagTotal,
    tagInputValue,
    onTagInputChange,
    onSearch,
    availableTagResults,
    onAvailableTagSelect,
    selectedSeriesDrafts,
    onSelectedSeriesDraftRemove,
    renderSelectedSeriesDraftLabel,
    selectedCountText,
    paginationProp,
}: {
    tableOptions: DropdownOption[];
    selectedTable: string;
    onSelectedTableChange: (aValue: string) => void;
    tagTotal: number;
    tagInputValue: string;
    onTagInputChange: (aValue: string) => void;
    onSearch: () => void;
    availableTagResults: TagSearchResultRow[];
    onAvailableTagSelect: (aTagName: string) => void;
    selectedSeriesDrafts: TagSelectionDraftItem[];
    onSelectedSeriesDraftRemove: (aTagId: string) => void;
    renderSelectedSeriesDraftLabel: (aItem: TagSelectionDraftItem) => ReactNode;
    selectedCountText: ReactNode;
    paginationProp: PaginationProp;
}) => {
    const sSelectedSeriesDraftListItems = mapSelectedSeriesDraftListItems(
        selectedSeriesDrafts,
    );

    const handleSelectedSeriesDraftKeyDown = (
        aEvent: KeyboardEvent<HTMLDivElement>,
        aTagId: string,
    ) => {
        if (aEvent.target !== aEvent.currentTarget) return;

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
                onChange={(e) => onTagInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
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
                        items={mapAvailableSearchResultListItems(availableTagResults)}
                        onItemClick={(id) => {
                            const sTagName = findTagNameBySearchResultId(availableTagResults, id);
                            if (sTagName) onAvailableTagSelect(sTagName);
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
                    {selectedCountText}
                </div>
            </div>
        </>
    );
};

export default TagSearchModalBody;
