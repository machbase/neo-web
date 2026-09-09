import { useId, useState, type ReactElement } from 'react';
import { Calendar, VscTrash } from '@/assets/icons/Icon';
import { TagAnalyzerDistanceRangeModal } from './TagAnalyzerDistanceRangeModal';
import {
    Button,
    DatePicker,
    Modal,
    Page,
    TextHighlight,
} from '@/design-system/components';
import { resolveRangeInput } from './rangeInput';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from './rangeModel';
import { TIME_RANGE_PRESETS } from './rangePresets';
import { Text } from '../ui/Presentation';
import { QuickTimeRange } from '../ui/QuickTimeRange';
import styles from './RangeModal.module.scss';

export function RangeModal({
    title = 'Range',
    kind,
    initialRangeInput,
    currentRange,
    fullRange,
    onAxisKindChange,
    allowPartialTimeInput = false,
    onApply,
    onClose,
}: RangeModalProps): ReactElement {
    const [rangeInput, setRangeInput] = useState<RangeExpressionInput>(() => ({
        ...initialRangeInput,
    }));
    const [validationMessage, setValidationMessage] = useState<string>();
    const validationMessageId = useId();

    // A numeric Tag Analyzer axis is a BASE DISTANCE axis. Reuse the same modal, slider,
    // anchored-edge parsing and quick windows as Dashboard and Data Viewer instead of maintaining
    // a second numeric range editor here.
    if (kind === 'numeric') {
        return (
            <TagAnalyzerDistanceRangeModal
                title={title === 'Range' ? 'Distance Range' : title}
                initialRangeInput={initialRangeInput}
                currentRange={currentRange}
                fullRange={fullRange}
                onSwitchToTime={onAxisKindChange
                    ? () => onAxisKindChange('time')
                    : undefined}
                onApply={onApply}
                onClose={onClose}
            />
        );
    }

    function setRangeValue(
        field: keyof RangeExpressionInput,
        value: string,
    ): void {
        setValidationMessage(undefined);
        setRangeInput((current) => ({ ...current, [field]: value }));
    }

    function handleApply(): void {
        if (isRangeExpressionEmpty(rangeInput)) {
            onApply({ ...EMPTY_RANGE_INPUT }, currentRange);
            onClose();
            return;
        }

        if (!allowPartialTimeInput && (rangeInput.start.trim() === '' || rangeInput.end.trim() === '')) {
            setValidationMessage(INVALID_RANGE_INPUT_MESSAGE);
            return;
        }

        const concreteRange = resolveRangeInput(
            rangeInput,
            'time',
            fullRange,
            currentRange,
        );
        if (!concreteRange) {
            setValidationMessage(INVALID_RANGE_INPUT_MESSAGE);
            return;
        }

        onApply({ ...rangeInput }, concreteRange);
        onClose();
    }

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            className={styles.modal}
            data-testid="tag-analyzer-range-dialog"
        >
            <Modal.Header>
                <Modal.Title>
                    <Calendar size={16} />
                    <Text variant="title" data-testid="tag-analyzer-range-title">
                        {title}
                    </Text>
                </Modal.Title>
                <Modal.Close data-testid="close-button" />
            </Modal.Header>
            <Modal.Body>
                {onAxisKindChange && (
                    <>
                        <Button.Group>
                            {RANGE_KINDS.map((rangeKind) => (
                                <Button
                                    key={rangeKind}
                                    data-testid={`tag-analyzer-range-kind-${rangeKind}-button`}
                                    size="sm"
                                    variant={
                                        kind === rangeKind
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    aria-pressed={kind === rangeKind}
                                    onClick={() =>
                                        onAxisKindChange(rangeKind)
                                    }
                                >
                                    {rangeKind === 'time'
                                        ? 'Time'
                                        : 'Numeric'}
                                </Button>
                            ))}
                        </Button.Group>
                        <Page.Space />
                    </>
                )}
                {RANGE_ENDPOINTS.map(([field, label]) => (
                    <div
                        key={field}
                        className={styles.rangeField}
                        role="group"
                        aria-label={`${label} date and time`}
                        aria-invalid={validationMessage !== undefined}
                        aria-describedby={
                            validationMessage
                                ? validationMessageId
                                : undefined
                        }
                    >
                        <DatePicker
                            pTestId={`tag-analyzer-range-${field === 'start' ? 'from' : 'to'}-input`}
                            pLabel={label}
                            labelPosition="left"
                            pTimeValue={rangeInput[field]}
                            pSetApply={(value) => setRangeValue(field, value)}
                            placeholder="now-1h, last-1d, or date/time"
                            onChange={(event) => setRangeValue(field, event.target.value)}
                        />
                    </div>
                ))}
                <Page.Space />
                <QuickTimeRange
                    options={TIME_RANGE_PRESETS}
                    onSelect={(option) => {
                        const [start = '', end = ''] = option.value;
                        setValidationMessage(undefined);
                        setRangeInput({ start, end });
                    }}
                    title="Quick Range"
                />
                {validationMessage && (
                    <>
                        <Page.Space />
                        <Text
                            as="div"
                            variant="caption"
                            id={validationMessageId}
                            role="alert"
                            data-testid="tag-analyzer-range-validation-message"
                        >
                            <TextHighlight variant="error">
                                {validationMessage}
                            </TextHighlight>
                        </Text>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    data-testid="reset-button"
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={() => {
                        setValidationMessage(undefined);
                        setRangeInput({ ...EMPTY_RANGE_INPUT });
                    }}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm
                        data-testid="tag-analyzer-range-apply-button"
                        onClick={handleApply}
                    >
                        Apply
                    </Modal.Confirm>
                    <Modal.Cancel
                        data-testid="tag-analyzer-range-cancel-button"
                    >
                        Cancel
                    </Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

// -------------------- Local --------------------

type RangeModalProps = {
    title?: string;
    kind: AxisKind;
    initialRangeInput: RangeExpressionInput;
    currentRange: AxisRange;
    fullRange: AxisRange;
    onAxisKindChange?: (axisKind: AxisKind) => void;
    allowPartialTimeInput?: boolean;
    onApply: (
        rangeInput: RangeExpressionInput,
        concreteRange: AxisRange,
    ) => void;
    onClose: () => void;
};

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const INVALID_RANGE_INPUT_MESSAGE = 'Invalid input - enter both From and To using now-1h, last-1d, first/last, or date/time values, with From before To.';
const RANGE_KINDS: readonly AxisKind[] = ['time', 'numeric'];
const RANGE_ENDPOINTS = [
    ['start', 'From'],
    ['end', 'To'],
] as const;
