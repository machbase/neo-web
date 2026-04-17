// Shared types for the TagAnalyzer tag-search flows.
// This keeps UI and utility modules aligned without importing hook implementation details.

export type TagSearchResultRow = [string, string];

export type TagSearchSourceColumns = {
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
    colName: TagSearchSourceColumns;
    [key: string]: unknown;
};

export type UseTagSearchModalStateOptions = {
    tables: string[];
    initialTable: string | undefined;
    maxSelectedCount: number;
    isSameSelectedTag: (aItem: TagSelectionDraftItem, bItem: TagSelectionDraftItem) => boolean;
};
