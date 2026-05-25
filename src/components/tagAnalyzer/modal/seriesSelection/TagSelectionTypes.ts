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
    jsonKey?: string | undefined;
    timeType?: number | undefined;
    timeBaseTime?: boolean | undefined;
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
    existingSeries?: Array<{
        sourceColumns: Partial<TagSelectionSourceColumns> | undefined;
    }>;
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

export type TagSelectionColumnControls = {
    timeColumnOptions: DropdownOption[];
    valueColumnOptions: DropdownOption[];
    jsonKeyOptions: DropdownOption[];
    selectedTimeColumn: string;
    selectedValueColumn: string;
    selectedJsonKey: string;
    selectedTimeColumnKindLabel: string | undefined;
    selectedValueColumnSummaryLabel: string | undefined;
    selectedJsonKeySummaryLabel: string | undefined;
    jsonKeyInputValue: string;
    isJsonValue: boolean;
    isDisabled: boolean;
    onTimeColumnChange: (value: string) => void;
    onValueColumnChange: (value: string) => void;
    onJsonKeyInputChange: (value: string) => void;
    onJsonKeyInputBlur: () => void;
    onJsonKeySelect: (value: string) => void;
};

export type TagSelectionAvailableTagList = {
    availableTags: TagSearchItem[];
    onAvailableTagSelect: (tagName: string) => void;
    pagination: PaginationProp;
};

export type TagSelectionSelectedSeriesList = {
    selectedSeriesDrafts: TagSelectionDraftItem[];
    onSelectedSeriesDraftRemove: (tagId: string) => void;
    axisKindWarning: string | undefined;
    modeOptions: TagSelectionModeOption[];
    modeTriggerStyle: CSSProperties | undefined;
    onSelectedSeriesDraftModeChange: (
        value: string,
        item: TagSelectionDraftItem,
    ) => void;
    maxSelectedCount: number;
};

export type TagSelectionPanelViewModel = {
    searchControls: TagSelectionSearchControls;
    columnControls: TagSelectionColumnControls;
    availableTagList: TagSelectionAvailableTagList;
    selectedSeriesList: TagSelectionSelectedSeriesList;
};

export type TagSearchListItem = {
    id: string;
    label: ReactNode;
    tooltip: string;
};

export type SelectedSeriesDraftListItem = {
    id: string;
    selectedSeriesDraft: TagSelectionDraftItem;
    sourceSummary: string;
    tooltip: string;
};

export type TableNameResponse = {
    success?: boolean | undefined;
    data?:
        | {
              rows: Array<[string, number, number] | [string, number] | string[]> | undefined;
          }
        | undefined;
    message?: string | undefined;
};

export type TagTotalResponse = {
    success?: boolean | undefined;
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
    tableColumns: unknown[];
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
