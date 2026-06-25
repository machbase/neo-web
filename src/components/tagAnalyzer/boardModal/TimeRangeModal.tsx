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
    resolveEditableTimeRangeInput,
    type EditableTimeRangeInputResolution,
} from '../parsing/TimeRangeInputParsing';
import {
    formatAxisInputValue,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../formatting/TimeInputFormatters';
import type { TimeRangeInput, TimeRangeMs } from '../domain/time/TimeTypes';
import TagAnalyzerDatePicker from '../TagAnalyzerDatePicker';

type BaseRangeModalProps = {
    title: ReactNode;
    onClose: () => void;
};

type TimeRangeModalProps = BaseRangeModalProps & {
    rangeKind: 'time';
    timeRange: TimeRangeInput;
    lastDataTime: number;
    previousConcreteRange?: TimeRangeMs;
    timeRangePlaceholder?: TimeRangeInput;
    allowEmptyTimeRange?: boolean;
    onApply: (timeRange: EditableTimeRangeInputResolution) => boolean | void;
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

function RangeModalShell({
    title,
    onClose,
    onReset,
    onApply,
    children,
}: {
    title: ReactNode;
    onClose: () => void;
    onReset: () => void;
    onApply: () => void;
    children: ReactNode;
}) {
    return (
        <Modal.Root isOpen={true} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={onReset}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm onClick={onApply}>Apply</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

function DateTimeRangeModal({
    title,
    timeRange,
    lastDataTime,
    previousConcreteRange,
    timeRangePlaceholder,
    allowEmptyTimeRange = false,
    onApply,
    onClose,
}: TimeRangeModalProps) {
    const [startTimeText, setStartTimeText] = useState(() => timeRange.start);
    const [endTimeText, setEndTimeText] = useState(() => timeRange.end);

    function handleQuickTime(option: QuickTimeRangeOption) {
        setStartTimeText(String(option.value[0] ?? ''));
        setEndTimeText(String(option.value[1] ?? ''));
    }

    function handleApply() {
        const sCurrentTime = Date.now();
        const sResolvedRange = resolveEditableTimeRangeInput({
            startValue: startTimeText,
            endValue: endTimeText,
            previousConcreteRange: previousConcreteRange ?? {
                startTime: sCurrentTime - 1,
                endTime: sCurrentTime,
            },
            currentTime: sCurrentTime,
            lastDataTime: Number.isFinite(lastDataTime)
                ? lastDataTime
                : sCurrentTime,
        });

        if (
            sResolvedRange.status === 'invalid' ||
            (!allowEmptyTimeRange && sResolvedRange.status !== 'valid')
        ) {
            Toast.error('Please check the entered time.');
            return;
        }

        const sShouldClose = onApply(sResolvedRange);
        if (sShouldClose === false) {
            return;
        }

        onClose();
    }

    return (
        <RangeModalShell
            title={title}
            onClose={onClose}
            onReset={() => {
                setStartTimeText('');
                setEndTimeText('');
            }}
            onApply={handleApply}
        >
            <TagAnalyzerDatePicker
                label="From"
                value={String(startTimeText)}
                onChange={setStartTimeText}
                onApply={setStartTimeText}
                placeholder={timeRangePlaceholder?.start}
            />
            <TagAnalyzerDatePicker
                label="To"
                value={String(endTimeText)}
                onChange={setEndTimeText}
                onApply={setEndTimeText}
                placeholder={timeRangePlaceholder?.end}
            />
            <Page.Space />
            <QuickTimeRange
                options={TIME_RANGE}
                onSelect={handleQuickTime}
                title="Quick Range"
            />
        </RangeModalShell>
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
        <RangeModalShell
            title={title}
            onClose={onClose}
            onReset={() => {
                setStartValue('');
                setEndValue('');
            }}
            onApply={handleApply}
        >
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
        </RangeModalShell>
    );
}
