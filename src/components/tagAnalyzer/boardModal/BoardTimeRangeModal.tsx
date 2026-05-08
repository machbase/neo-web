import { useState } from 'react';
import { Calendar } from '@/assets/icons/Icon';
import {
    DatePicker,
    Modal,
    Page,
    QuickTimeRange,
    Toast,
    type QuickTimeRangeOption,
} from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';
import { formatTimeRangeInputValue } from '../time/TimeBoundaryFormatter';
import {
    parseTimeBoundaryInputValue,
    parseTimeRangeConfigFromBoundaryValues,
    type TimeBoundaryInputValue,
} from '../time/TimeBoundaryParser';
import type { TimeRangeConfig } from '../time/TimeTypes';

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
    const [startTimeText, setStartTimeText] = useState<TimeBoundaryInputValue>(
        () => formatTimeRangeInputValue(boardTimeRange.start),
    );
    const [endTimeText, setEndTimeText] = useState<TimeBoundaryInputValue>(
        () => formatTimeRangeInputValue(boardTimeRange.end),
    );

    function handleQuickTime(option: QuickTimeRangeOption) {
        setStartTimeText(String(option.value[0] ?? ''));
        setEndTimeText(String(option.value[1] ?? ''));
    }

    function handleApply() {
        if (
            !isValidTimeBoundaryInput(startTimeText) ||
            !isValidTimeBoundaryInput(endTimeText)
        ) {
            Toast.error('Please check the entered time.');
            return;
        }

        onApply(parseTimeRangeConfigFromBoundaryValues(startTimeText, endTimeText));
        onClose();
    }

    return (
        <Modal.Root isOpen={true} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    Time Range
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <DatePicker
                    pLabel="From"
                    pTopPixel={32}
                    pTimeValue={String(startTimeText)}
                    onChange={(event: { target: { value: string } }) =>
                        setStartTimeText(event.target.value)
                    }
                    pSetApply={(date: TimeBoundaryInputValue) => setStartTimeText(date)}
                />
                <DatePicker
                    pLabel="To"
                    pTopPixel={32}
                    pTimeValue={String(endTimeText)}
                    onChange={(event: { target: { value: string } }) =>
                        setEndTimeText(event.target.value)
                    }
                    pSetApply={(date: TimeBoundaryInputValue) => setEndTimeText(date)}
                />
                <Page.Space />
                <QuickTimeRange
                    options={TIME_RANGE}
                    onSelect={handleQuickTime}
                    title="Quick Range"
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleApply}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

function isValidTimeBoundaryInput(value: TimeBoundaryInputValue): boolean {
    return parseTimeBoundaryInputValue(value) !== undefined;
}
