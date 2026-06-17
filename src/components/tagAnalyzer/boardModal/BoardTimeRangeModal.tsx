import TimeRangeModal from './TimeRangeModal';
import type { TimeRangeConfig } from '../domain/time/model/TimeTypes';

type BoardTimeRangeModalProps = {
    boardTimeRange: TimeRangeConfig;
    onApply: (timeRange: TimeRangeConfig) => void;
    onClose: () => void;
};

export default function BoardTimeRangeModal({
    boardTimeRange,
    onApply,
    onClose,
}: BoardTimeRangeModalProps) {
    return (
        <TimeRangeModal
            rangeKind="time"
            title="Board Time Range"
            timeRange={boardTimeRange}
            onApply={onApply}
            onClose={onClose}
        />
    );
}
