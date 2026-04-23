// Shared types for the TagAnalyzer tag-selection flows.
// These types stay close to the shared UI and hook instead of leaking API tuple shapes.

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
        aItem: TagSelectionDraftItem,
        bItem: TagSelectionDraftItem,
    ) => boolean;
};
