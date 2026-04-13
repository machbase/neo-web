import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';
import type { ReactNode } from 'react';
import {
    findTagNameBySearchResultId,
    mapAvailableSearchResultListItems,
    mapSelectedSeriesDraftListItems,
} from './TagSearchModalBodyHelpers';
import type { TagSearchResultRow, TagSelectionDraftItem } from './useTagSearchModalState';

export type PaginationProp = {
    maxPageNum: number;
    tagPagination: number;
    onPageChange: (aPage: number) => void;
    keepPageNum: number | string;
    onPageInputChange: (aValue: number | string) => void;
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
                    <List
                        maxHeight={200}
                        items={mapSelectedSeriesDraftListItems(
                            selectedSeriesDrafts,
                            renderSelectedSeriesDraftLabel,
                        )}
                        onItemClick={(id) => onSelectedSeriesDraftRemove(String(id))}
                        isLoading={undefined}
                        emptyMessage={undefined}
                        className={undefined}
                        style={undefined}
                    />
                    {selectedCountText}
                </div>
            </div>
        </>
    );
};

export default TagSearchModalBody;
