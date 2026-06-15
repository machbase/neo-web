import { useState, type ReactNode } from 'react';
import { Calendar, VscTrash } from '@/assets/icons/Icon';
import {
    Button,
    Input,
    Modal,
    Page,
    QuickTimeRange,
    Toast,
    type QuickTimeRangeOption,
} from '@/design-system/components';
import { TIME_RANGE } from '@/utils/constants';
import {
    formatTimeRangeInputValue,
    parseTimeBoundaryInputValue,
    parseTimeRangeConfigFromBoundaryValues,
    type TimeBoundaryInputValue,
} from '../domain/time/TimeBoundaryInput';
import {
    formatAxisInputValue,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../domain/time/TimeInputFormatters';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import TagAnalyzerDatePicker from '../datePicker/TagAnalyzerDatePicker';

type BaseRangeModalProps = {
    title: ReactNode;
    onClose: () => void;
};

type TimeRangeModalProps = BaseRangeModalProps & {
    rangeKind: 'time';
    timeRange: TimeRangeConfig;
    onApply: (timeRange: TimeRangeConfig) => boolean | void;
};

type NumericRangeModalProps = BaseRangeModalProps & {
    rangeKind: 'numeric';
    numericRange: TimeRangeMs;
    onApply: (range: TimeRangeMs) => boolean | void;
};

type RangeModalProps = TimeRangeModalProps | NumericRangeModalProps;

export default function TimeRangeModal(props: RangeModalProps) {
    if (props.rangeKind === 'numeric') {
        return <NumericRangeModal {...props} />;
    }

    return <DateTimeRangeModal {...props} />;
}

function DateTimeRangeModal({
    title,
    timeRange,
    onApply,
    onClose,
}: TimeRangeModalProps) {
    const [startTimeText, setStartTimeText] = useState<TimeBoundaryInputValue>(
        () => formatTimeRangeInputValue(timeRange.start),
    );
    const [endTimeText, setEndTimeText] = useState<TimeBoundaryInputValue>(
        () => formatTimeRangeInputValue(timeRange.end),
    );

    function handleQuickTime(option: QuickTimeRangeOption) {
        setStartTimeText(String(option.value[0] ?? ''));
        setEndTimeText(String(option.value[1] ?? ''));
    }

    function handleReset() {
        setStartTimeText('');
        setEndTimeText('');
    }

    function handleApply() {
        if (
            !isValidTimeBoundaryInput(startTimeText) ||
            !isValidTimeBoundaryInput(endTimeText)
        ) {
            Toast.error('Please check the entered time.');
            return;
        }

        const sShouldClose = onApply(
            parseTimeRangeConfigFromBoundaryValues(startTimeText, endTimeText),
        );
        if (sShouldClose === false) {
            return;
        }

        onClose();
    }

    return (
        <Modal.Root isOpen={true} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <TagAnalyzerDatePicker
                    label="From"
                    topPixel={32}
                    value={String(startTimeText)}
                    onChange={setStartTimeText}
                    onApply={setStartTimeText}
                />
                <TagAnalyzerDatePicker
                    label="To"
                    topPixel={32}
                    value={String(endTimeText)}
                    onChange={setEndTimeText}
                    onApply={setEndTimeText}
                />
                <Page.Space />
                <QuickTimeRange
                    options={TIME_RANGE}
                    onSelect={handleQuickTime}
                    title="Quick Range"
                />
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={handleReset}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm onClick={handleApply}>Apply</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

function NumericRangeModal({
    title,
    numericRange,
    onApply,
    onClose,
}: NumericRangeModalProps) {
    const [startValue, setStartValue] = useState(
        () => formatAxisInputValue(numericRange.startTime, true),
    );
    const [endValue, setEndValue] = useState(
        () => formatAxisInputValue(numericRange.endTime, true),
    );

    function handleReset() {
        setStartValue('');
        setEndValue('');
    }

    function handleApply() {
        const sStart = parseAxisInputValue(startValue, true);
        const sEnd = parseAxisInputValue(endValue, true);

        if (sStart === undefined || sEnd === undefined) {
            Toast.error('Please enter valid numeric values.');
            return;
        }

        if (sStart >= sEnd) {
            Toast.error('Start must be before end.');
            return;
        }

        const sShouldClose = onApply({
            startTime: sStart,
            endTime: sEnd,
        });
        if (sShouldClose === false) {
            return;
        }

        onClose();
    }

    return (
        <Modal.Root isOpen={true} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Input
                    label="From"
                    labelPosition="left"
                    value={startValue}
                    placeholder={NUMERIC_AXIS_INPUT_FORMAT}
                    onChange={(event) => setStartValue(event.target.value)}
                />
                <Input
                    label="To"
                    labelPosition="left"
                    value={endValue}
                    placeholder={NUMERIC_AXIS_INPUT_FORMAT}
                    onChange={(event) => setEndValue(event.target.value)}
                />
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={handleReset}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm onClick={handleApply}>Apply</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

function isValidTimeBoundaryInput(value: TimeBoundaryInputValue): boolean {
    return parseTimeBoundaryInputValue(value) !== undefined;
}
