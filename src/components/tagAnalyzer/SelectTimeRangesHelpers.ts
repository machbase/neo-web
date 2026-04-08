export type QuickSelectRangeItem = {
    key: number;
    name: string;
    value: [string, string];
};

export type QuickSelectRow = {
    key: number;
    items: QuickSelectRangeItem[];
};

export const buildQuickSelectRows = (aTimeRange: QuickSelectRangeItem[][]): QuickSelectRow[] => {
    return aTimeRange.map((aItem, aIdx) => ({
        key: aIdx,
        items: aItem,
    }));
};
