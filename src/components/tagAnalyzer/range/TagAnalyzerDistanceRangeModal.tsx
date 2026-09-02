import { useState, type ReactElement } from 'react';
import MaterialIcon from '@/components/common/MaterialIcon';
import DistanceRangeTab from '@/components/modal/DistanceRangeTab';
import { Button, Modal, Toast } from '@/design-system/components';
import { resolveDistanceRange } from '@/utils/distanceRange';
import type { AxisRange, RangeExpressionInput } from './rangeModel';

type Props = {
    title: string;
    initialRangeInput: RangeExpressionInput;
    currentRange: AxisRange;
    fullRange: AxisRange;
    onSwitchToTime?: () => void;
    onApply: (rangeInput: RangeExpressionInput, concreteRange: AxisRange) => void;
    onClose: () => void;
};

const EMPTY_RANGE_INPUT: RangeExpressionInput = { start: '', end: '' };
const INVALID_RANGE_MESSAGE = 'Invalid input - enter both From and To using numbers or first/last expressions, with From less than To.';

export function TagAnalyzerDistanceRangeModal({
    title,
    initialRangeInput,
    currentRange,
    fullRange,
    onSwitchToTime,
    onApply,
    onClose,
}: Props): ReactElement {
    const bounds = fullRange.end === Number.MAX_SAFE_INTEGER
        ? null
        : { min: fullRange.start, max: fullRange.end };
    const [from, setFrom] = useState<number | string>(initialRangeInput.start);
    const [to, setTo] = useState<number | string>(initialRangeInput.end);
    const [notice, setNotice] = useState('');

    const reset = () => {
        onApply({ ...EMPTY_RANGE_INPUT }, currentRange);
        onClose();
    };

    const apply = () => {
        if (from === '' && to === '') {
            reset();
            return;
        }
        if (notice) {
            Toast.error(notice);
            return;
        }
        const resolved = resolveDistanceRange(from, to, bounds);
        if (resolved.from === null || resolved.to === null || resolved.from >= resolved.to) {
            Toast.error(INVALID_RANGE_MESSAGE);
            return;
        }
        onApply(
            { start: String(from), end: String(to) },
            { start: resolved.from, end: resolved.to },
        );
        onClose();
    };

    return (
        <Modal.Root isOpen onClose={onClose} onKeyDown={(event) => {
            if (event.key !== 'Enter' || (event.target as HTMLElement)?.tagName === 'BUTTON') return;
            event.preventDefault();
            apply();
        }}>
            <Modal.Header>
                <Modal.Title>
                    <MaterialIcon name="straighten" size={16} />
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                {onSwitchToTime && (
                    <Button.Group>
                        <Button size="sm" variant="ghost" onClick={onSwitchToTime}>Time</Button>
                        <Button size="sm" variant="secondary" aria-pressed="true">Distance</Button>
                    </Button.Group>
                )}
                <DistanceRangeTab
                    pBounds={bounds ?? { min: 0, max: 0 }}
                    pFrom={from}
                    pTo={to}
                    pOnChange={(nextFrom, nextTo) => {
                        setFrom(nextFrom);
                        setTo(nextTo);
                    }}
                    pOnResetToFull={reset}
                    pResetLabel="Reset"
                    pOnValidityChange={setNotice}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={apply}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}
