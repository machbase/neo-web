import { TIME_RANGE } from '@/utils/constants';

interface TimeRangesProps {
    onClick: any;
}

export const SelectTimeRanges = ({ onClick }: TimeRangesProps) => {
    const sTimeRange: any = TIME_RANGE;

    return sTimeRange.map((aItem: any, aIdx: number) => {
        return (
            <div key={aIdx} className="quick-select-form">
                {aItem.map((bItem: any) => {
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
