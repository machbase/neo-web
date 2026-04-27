import type { CSSProperties, ReactNode } from 'react';
import type { DropdownOption } from '@/design-system/hooks/useDropdown';

export type TagSearchItem = {
    id: string;
    name: string;
};

export type TagSelectionSourceColumns = {
    name: string;
    time: string;
    value: string;
};

export type TagSelectionDraftItem = {
    key: string;
    table: string;
    sourceTagName: string;
    calculationMode: string;
    alias: string;
    weight: number;
    sourceColumns: TagSelectionSourceColumns;
    [key: string]: unknown;
};

export type UseTagSelectionStateOptions = {
    tables: string[];
    initialTable: string | undefined;
    maxSelectedCount: number;
    isSameSelectedTag: (
        item: TagSelectionDraftItem,
        bItem: TagSelectionDraftItem,
    ) => boolean;
};

export type TagSelectionModeOption = {
    label: string;
    value: string;
    disabled: boolean | undefined;
};

export type TagSelectionModeRowProps = {
    selectedSeriesDraft: TagSelectionDraftItem;
    options: TagSelectionModeOption[];
    onModeChange: (value: string) => void;
    triggerStyle: CSSProperties | undefined;
};

export type PaginationProp = {
    maxPageNum: number;
    tagPagination: number;
    onPageChange: (page: number) => void;
    keepPageNum: number | string;
    onPageInputChange: (value: number | string) => void;
};

export type TagSelectionSearchControls = {
    tableOptions: DropdownOption[];
    selectedTable: string;
    onSelectedTableChange: (value: string) => void;
    tagTotal: number;
    tagInputValue: string;
    onTagInputChange: (value: string) => void;
    onSearch: () => void;
};

export type TagSelectionAvailableTagList = {
    availableTags: TagSearchItem[];
    onAvailableTagSelect: (tagName: string) => void;
    pagination: PaginationProp;
};

export type TagSelectionSelectedSeriesList = {
    selectedSeriesDrafts: TagSelectionDraftItem[];
    onSelectedSeriesDraftRemove: (tagId: string) => void;
    renderSelectedSeriesDraftLabel: (item: TagSelectionDraftItem) => ReactNode;
    maxSelectedCount: number;
};

export type TagSelectionPanelViewModel = {
    searchControls: TagSelectionSearchControls;
    availableTagList: TagSelectionAvailableTagList;
    selectedSeriesList: TagSelectionSelectedSeriesList;
};

export type TagSelectionPanelProps = {
    viewModel: TagSelectionPanelViewModel;
};

export type TagSearchListItem = {
    id: string;
    label: ReactNode;
    tooltip: string;
};

export type SelectedSeriesDraftListItem = {
    id: string;
    selectedSeriesDraft: TagSelectionDraftItem;
    tooltip: string;
};

export type TableNameResponse = {
    success?: boolean | undefined;
    data?:
        | {
              rows: string[][] | undefined;
          }
        | undefined;
    message?: string | undefined;
};

export type TagTotalResponse = {
    data?:
        | {
              rows: Array<[number]> | undefined;
          }
        | undefined;
};

export type TagPaginationRow = [string | number, string];

export type TagPaginationResponse = {
    success?: boolean | undefined;
    data:
        | {
              rows: TagPaginationRow[] | undefined;
          }
        | undefined;
};

export type TagSearchColumnsResult = {
    columns: TagSelectionSourceColumns | undefined;
    errorMessage: string | undefined;
};

export type TagSearchPageParams = {
    table: string;
    searchText: string;
    page: number;
    columns: TagSelectionSourceColumns;
};

export type TagSearchPageResult = {
    items: TagSearchItem[];
    total: number;
    columns: TagSelectionSourceColumns;
    errorMessage: string | undefined;
};
