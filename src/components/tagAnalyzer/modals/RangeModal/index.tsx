import { useState } from 'react';
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
    formatAxisInputValue,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';
import {
    resolveEditableTimeRangeInput,
    type EditableTimeRangeInputResolution,
} from '../../domain/time/TimeRangeInputParsing';
import type { TimeRangeInput, TimeRangeMs } from '../../domain/time/TimeTypes';
import { isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import TagAnalyzerDatePicker from '../../TagAnalyzerDatePicker';

type EmptyRangeConfig = boolean | {
    placeholder?: TimeRangeInput;
};

type NumericRangeConfig = {
    initialRange: TimeRangeMs;
    onApply: (range: TimeRangeMs) => boolean | void;
};

type DateTimeRangeConfig = {
    initialRangeInput: TimeRangeInput;
    dataEndTime?: number;
    referenceRange?: TimeRangeMs;
    emptyRange?: EmptyRangeConfig;
    onApply: (timeRange: EditableTimeRangeInputResolution) => boolean | void;
};

type RangeModalProps = {
    title: string;
    isNumeric: boolean;
    numericRange?: NumericRangeConfig;
    timeRange?: DateTimeRangeConfig;
    onClose: () => void;
};

export default function RangeModal({
    title,
    isNumeric,
    numericRange,
    timeRange,
    onClose,
}: RangeModalProps) {
    if (isNumeric) {
        if (!numericRange) {
            throw new Error('Numeric range config is required for numeric range modal.');
        }

        return (
            <NumericRangeDialog
                title={title}
                config={numericRange}
                onClose={onClose}
            />
        );
    }

    if (!timeRange) {
        throw new Error('Time range config is required for time range modal.');
    }

    return (
        <DateTimeRangeDialog
            title={title}
            config={timeRange}
            onClose={onClose}
        />
    );
}

function NumericRangeDialog({
    title,
    config,
    onClose,
}: {
    title: string;
    config: NumericRangeConfig;
    onClose: () => void;
}) {
    const [startValue, setStartValue] = useState(
        () => formatAxisInputValue(config.initialRange.startTime, true),
    );
    const [endValue, setEndValue] = useState(
        () => formatAxisInputValue(config.initialRange.endTime, true),
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

        const sShouldClose = config.onApply({
            startTime: sStart,
            endTime: sEnd,
        });
        if (sShouldClose !== false) {
            onClose();
        }
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
                    onClick={() => {
                        setStartValue('');
                        setEndValue('');
                    }}
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

function DateTimeRangeDialog({
    title,
    config,
    onClose,
}: {
    title: string;
    config: DateTimeRangeConfig;
    onClose: () => void;
}) {
    const [startTimeText, setStartTimeText] = useState(
        () => config.initialRangeInput.start,
    );
    const [endTimeText, setEndTimeText] = useState(
        () => config.initialRangeInput.end,
    );

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
                config.referenceRange,
                config.dataEndTime,
                sCurrentTime,
            ),
            currentTime: sCurrentTime,
            lastDataTime: isFiniteNumber(config.dataEndTime)
                ? config.dataEndTime
                : sCurrentTime,
        });

        if (
            sResolvedRange.status === 'invalid' ||
            (!isEmptyRangeAllowed(config.emptyRange) && sResolvedRange.status !== 'valid')
        ) {
            Toast.error('Please check the entered time.');
            return;
        }

        const sShouldClose = config.onApply(sResolvedRange);
        if (sShouldClose !== false) {
            onClose();
        }
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
                    value={String(startTimeText)}
                    onChange={setStartTimeText}
                    onApply={setStartTimeText}
                    placeholder={getEmptyRangePlaceholder(config.emptyRange)?.start}
                />
                <TagAnalyzerDatePicker
                    label="To"
                    value={String(endTimeText)}
                    onChange={setEndTimeText}
                    onApply={setEndTimeText}
                    placeholder={getEmptyRangePlaceholder(config.emptyRange)?.end}
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
                    onClick={() => {
                        setStartTimeText('');
                        setEndTimeText('');
                    }}
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

function isEmptyRangeAllowed(emptyRange: EmptyRangeConfig | undefined): boolean {
    return emptyRange !== undefined && emptyRange !== false;
}

function getEmptyRangePlaceholder(
    emptyRange: EmptyRangeConfig | undefined,
): TimeRangeInput | undefined {
    return typeof emptyRange === 'object' ? emptyRange.placeholder : undefined;
}

function isFiniteNumber(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}
