import { Search } from '@/assets/icons/Icon';
import { Button, Dropdown, Input, List, Pagination } from '@/design-system/components';
import type { ReactNode } from 'react';
import type { TagSearchOptionRow, TagSearchSelectionItem } from './useTagSearchModalState';

type TagSearchModalBodyProps = {
    tableOptions: { value: string; label: string }[];
    selectedTable: string;
    onSelectedTableChange: (aValue: string) => void;
    tagTotal: number;
    tagInputValue: string;
    onTagInputChange: (aValue: string) => void;
    onSearch: () => void;
    tagList: TagSearchOptionRow[];
    onAvailableTagSelect: (aTagName: string) => void;
    selectedTags: TagSearchSelectionItem[];
    onSelectedTagRemove: (aTagId: string) => void;
    renderSelectedTagLabel: (aItem: TagSearchSelectionItem) => ReactNode;
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
    tagList,
    onAvailableTagSelect,
    selectedTags,
    onSelectedTagRemove,
    renderSelectedTagLabel,
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
                        items={tagList.map((aItem) => ({
                            id: aItem[0],
                            label: aItem[1],
                            tooltip: aItem[1],
                        }))}
                        onItemClick={(id) => {
                            const item = tagList.find((aTagItem) => aTagItem[0] === id);
                            if (item) onAvailableTagSelect(item[1]);
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
                        items={selectedTags.map((aItem) => ({
                            id: aItem.key,
                            label: renderSelectedTagLabel(aItem),
                            tooltip: aItem.tagName,
                        }))}
                        onItemClick={(id) => onSelectedTagRemove(id)}
                    />
                    {selectedCountText}
                </div>
            </div>
        </>
    );
};

export default TagSearchModalBody;
