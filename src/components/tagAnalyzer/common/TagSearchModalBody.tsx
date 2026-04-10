import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import type { ReactNode } from 'react';
import {
    findTagNameBySearchResultId,
    mapAvailableSearchResultListItems,
    mapSelectedSeriesDraftListItems,
} from './TagSearchModalBodyHelpers';
import type { TagSearchResultRow, TagSelectionDraftItem } from './useTagSearchModalState';

// Used by TagSearchModalBody to type component props.
type TagSearchModalBodyProps = {
    tableOptions: { value: string; label: string }[];
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
    maxPageNum,
    tagPagination,
    onPageChange,
    keepPageNum,
    onPageInputChange,
}: TagSearchModalBodyProps) => {
    return (
        <>
            <Dropdown.Root label="Table" labelPosition="left" options={tableOptions} value={selectedTable} onChange={onSelectedTableChange} fullWidth>
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
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
                rightIcon={<Button variant="ghost" size="icon" icon={<Search size={16} />} onClick={onSearch} aria-label="Search tags" />}
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
                    />
                    <Pagination
                        currentPage={tagPagination}
                        totalPages={maxPageNum}
                        onPageChange={onPageChange}
                        inputValue={String(keepPageNum)}
                        onPageInputChange={onPageInputChange}
                        style={{ marginTop: '8px' }}
                    />
                </div>

                <div style={{ flex: '2 1 0', minWidth: 0 }}>
                    <List
                        maxHeight={200}
                        items={mapSelectedSeriesDraftListItems(selectedSeriesDrafts, renderSelectedSeriesDraftLabel)}
                        onItemClick={(id) => onSelectedSeriesDraftRemove(id)}
                    />
                    {selectedCountText}
                </div>
            </div>
        </>
    );
};

export default TagSearchModalBody;
