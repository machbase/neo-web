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
} from '../domain/time/TimeRangeInputParsing';
import {
    formatAxisInputValue,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../domain/time/TimeInputFormatters';
import type { TimeRangeInput, TimeRangeMs } from '../domain/time/TimeTypes';
import { isValidTimeRange } from '../domain/time/TimeRangeUtils';
import TagAnalyzerDatePicker from '../TagAnalyzerDatePicker';

type BaseRangeModalProps = {
    title: ReactNode;
    onClose: () => void;
};

type TimeRangeModalProps = BaseRangeModalProps & {
    rangeKind: 'time';
    value: TimeRangeInput;
    dataEndTime?: number;
    referenceRange?: TimeRangeMs;
    emptyRange?: boolean | {
        placeholder?: TimeRangeInput;
    };
    onApply: (timeRange: EditableTimeRangeInputResolution) => boolean | void;
};

type NumericRangeModalProps = BaseRangeModalProps & {
    rangeKind: 'numeric';
    value: TimeRangeMs;
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
    value,
    dataEndTime,
    referenceRange,
    emptyRange,
    onApply,
    onClose,
}: TimeRangeModalProps) {
    const [startTimeText, setStartTimeText] = useState(() => value.start);
    const [endTimeText, setEndTimeText] = useState(() => value.end);

    function handleQuickTime(option: QuickTimeRangeOption) {
        setStartTimeText(String(option.value[0] ?? ''));
        setEndTimeText(String(option.value[1] ?? ''));
    }

    function handleApply() {
        const sCurrentTime = Date.now();
        const sResolvedRange = resolveEditableTimeRangeInput({
            startValue: startTimeText,
            endValue: endTimeText,
            previousConcreteRange: resolveReferenceRange(
                referenceRange,
                dataEndTime,
                sCurrentTime,
            ),
            currentTime: sCurrentTime,
            lastDataTime: isFiniteNumber(dataEndTime)
                ? dataEndTime
                : sCurrentTime,
        });

        if (
            sResolvedRange.status === 'invalid' ||
            (!isEmptyRangeAllowed(emptyRange) && sResolvedRange.status !== 'valid')
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
                placeholder={getEmptyRangePlaceholder(emptyRange)?.start}
            />
            <TagAnalyzerDatePicker
                label="To"
                value={String(endTimeText)}
                onChange={setEndTimeText}
                onApply={setEndTimeText}
                placeholder={getEmptyRangePlaceholder(emptyRange)?.end}
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
    value,
    onApply,
    onClose,
}: NumericRangeModalProps) {
    const [startValue, setStartValue] = useState(
        () => formatAxisInputValue(value.startTime, true),
    );
    const [endValue, setEndValue] = useState(
        () => formatAxisInputValue(value.endTime, true),
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

function resolveReferenceRange(
    referenceRange: TimeRangeMs | undefined,
    dataEndTime: number | undefined,
    currentTime: number,
): TimeRangeMs {
    if (isValidTimeRange(referenceRange)) {
        return referenceRange;
    }

    const sEndTime = isFiniteNumber(dataEndTime) ? dataEndTime : currentTime;

    return {
        startTime: sEndTime - 1,
        endTime: sEndTime,
    };
}

function isEmptyRangeAllowed(
    emptyRange: TimeRangeModalProps['emptyRange'],
): boolean {
    return emptyRange !== undefined && emptyRange !== false;
}

function getEmptyRangePlaceholder(
    emptyRange: TimeRangeModalProps['emptyRange'],
): TimeRangeInput | undefined {
    return typeof emptyRange === 'object' ? emptyRange.placeholder : undefined;
}

function isFiniteNumber(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}
