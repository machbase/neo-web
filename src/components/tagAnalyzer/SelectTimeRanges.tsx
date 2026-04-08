import { TIME_RANGE } from '@/utils/constants';
import { buildQuickSelectRows, type QuickSelectRangeItem } from './SelectTimeRangesHelpers';

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
