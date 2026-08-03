import { useState, type ReactElement } from 'react';
import { Calendar, VscTrash } from '@/assets/icons/Icon';
import {
    Button,
    Input,
    Modal,
    Page,
    QuickTimeRange,
    Toast,
} from '@/design-system/components';
import { resolveRangeInput } from './rangeInput';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from './rangeModel';
import {
    NUMERIC_RANGE_PRESETS,
    TIME_RANGE_PRESETS,
} from './rangePresets';

type RangeModalProps = {
    kind: AxisKind;
    initialRangeInput: RangeExpressionInput;
    currentRange: AxisRange;
    fullRange: AxisRange;
    onAxisKindChange?: (axisKind: AxisKind) => void;
    onApply: (
        rangeInput: RangeExpressionInput,
        concreteRange: AxisRange,
    ) => void;
    onClose: () => void;
};

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const RANGE_KINDS: readonly AxisKind[] = ['time', 'numeric'];
const RANGE_ENDPOINTS = [
    ['start', 'From'],
    ['end', 'To'],
] as const;
export function RangeModal({
    kind,
    initialRangeInput,
    currentRange,
    fullRange,
    onAxisKindChange,
    onApply,
    onClose,
}: RangeModalProps): ReactElement {
    const [rangeInput, setRangeInput] = useState<RangeExpressionInput>(() => ({
        ...initialRangeInput,
    }));

    function setRangeValue(
        field: keyof RangeExpressionInput,
        value: string,
    ): void {
        setRangeInput((current) => ({ ...current, [field]: value }));
    }

    function handleApply(): void {
        if (isRangeExpressionEmpty(rangeInput)) {
            onApply({ ...EMPTY_RANGE_INPUT }, currentRange);
            onClose();
            return;
        }

        if (rangeInput.start.trim() === '' || rangeInput.end.trim() === '') {
            Toast.error('Enter both range boundaries.');
            return;
        }

        const concreteRange = resolveRangeInput(
            rangeInput,
            kind,
            fullRange,
            currentRange,
        );
        if (!concreteRange) {
            Toast.error('Enter a valid range.');
            return;
        }

        onApply({ ...rangeInput }, concreteRange);
        onClose();
    }

    return (
        <Modal.Root isOpen onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Calendar />
                    Range
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                {onAxisKindChange && (
                    <>
                        <Button.Group>
                            {RANGE_KINDS.map((rangeKind) => (
                                <Button
                                    key={rangeKind}
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
                    <Input
                        key={field}
                        fullWidth
                        label={label}
                        labelPosition="left"
                        value={rangeInput[field]}
                        placeholder={
                            kind === 'time'
                                ? 'now-1h, last-1d, or date/time'
                                : '20, first, first-10, last-10'
                        }
                        onChange={(event) =>
                            setRangeValue(field, event.target.value)
                        }
                    />
                ))}
                <Page.Space />
                <QuickTimeRange
                    options={
                        kind === 'time'
                            ? TIME_RANGE_PRESETS
                            : NUMERIC_RANGE_PRESETS
                    }
                    onSelect={(option) => {
                        const [start = '', end = ''] = option.value;
                        setRangeInput({ start, end });
                    }}
                    title="Quick Range"
                />
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<VscTrash size={16} />}
                    onClick={() => setRangeInput({ ...EMPTY_RANGE_INPUT })}
                >
                    Reset
                </Button>
                <Button.Group>
                    <Modal.Confirm onClick={handleApply}>
                        Apply
                    </Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}
