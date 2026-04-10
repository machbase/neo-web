import { TIME_RANGE } from '@/utils/constants';

export const SelectTimeRanges = ({ onClick }: { onClick: (aItem: QuickSelectRangeItem) => void }) => {
    const sTimeRange = buildQuickSelectRows(TIME_RANGE as QuickSelectRangeItem[][]);

    return sTimeRange.map((aItem) => {
        return (
            <div key={aItem.key} className="quick-select-form">
                {aItem.items.map((bItem) => {
                    return (
                        <div key={bItem.name} className="btn">
                            <span onClick={() => onClick(bItem)}>{bItem.name}</span>
                        </div>
                    );
                })}
            </div>
        );
    });
};

// Used by SelectTimeRanges to type one quick-select option.
export type QuickSelectRangeItem = {
    key: number;
    name: string;
    value: [string, string];
};

// Used by SelectTimeRanges to type one rendered quick-select row.
export type QuickSelectRow = {
    key: number;
    items: QuickSelectRangeItem[];
};

/**
 * Groups the saved quick-select options into keyed rows for rendering.
 * @param aTimeRange The saved quick-select option groups.
 * @returns The keyed quick-select rows used by the component.
 */
export function buildQuickSelectRows(aTimeRange: QuickSelectRangeItem[][]): QuickSelectRow[] {
    return aTimeRange.map((aItem, aIdx) => ({
        key: aIdx,
        items: aItem,
    }));
}
