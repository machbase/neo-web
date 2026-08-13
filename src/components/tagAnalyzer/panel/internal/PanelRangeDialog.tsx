import { useEffect, useRef, useState } from 'react';
import { formatRangeInputValue } from '../../format/inputFormat';
import { formatAbsoluteTime } from '../../format/timeFormat';
import { isSameRange } from '../../range/rangeArithmetic';
import { RangeModal } from '../../range/RangeModal';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
} from '../../range/rangeModel';

type PanelRangeTarget = 'main' | 'navigator';

type RetainedMainRangeInput = {
    rangeInput: RangeExpressionInput;
    concreteRange: AxisRange;
};

type PanelRangeDialogState = {
    target: PanelRangeTarget;
    kind: AxisKind;
    initialRangeInput: RangeExpressionInput;
    currentRange: AxisRange;
    fullRange: AxisRange;
};

type UsePanelRangeDialogParams = {
    rangeState: ResolvedRangeState | undefined;
    renderRange: RangeState | undefined;
    isNumericXAxis: boolean | undefined;
    onMainRangeChange: (range: AxisRange) => void;
    onNavigatorRangeChange: (
        range: AxisRange,
        rangeInput: RangeExpressionInput,
    ) => void;
};

// eslint-disable-next-line react-refresh/only-export-components -- The hook and renderer form one range-dialog boundary.
export function usePanelRangeDialog({
    rangeState,
    renderRange,
    isNumericXAxis,
    onMainRangeChange,
    onNavigatorRangeChange,
}: UsePanelRangeDialogParams) {
    const [target, setTarget] = useState<PanelRangeTarget>();
    const retainedMainRangeInputRef = useRef<RetainedMainRangeInput>();
    const renderMainRange = renderRange?.mainRange;

    useEffect(() => {
        const retainedInput = retainedMainRangeInputRef.current;
        if (
            renderMainRange !== undefined &&
            retainedInput !== undefined &&
            !isSameRange(retainedInput.concreteRange, renderMainRange)
        ) {
            retainedMainRangeInputRef.current = undefined;
        }
    }, [renderMainRange]);

    const currentRange = target === undefined
        ? undefined
        : target === 'main'
          ? renderMainRange
          : renderRange?.navigatorRange;
    const dialog: PanelRangeDialogState | undefined = target !== undefined &&
        rangeState !== undefined &&
        currentRange !== undefined
        ? {
              target,
              kind: isNumericXAxis ? 'numeric' : 'time',
              initialRangeInput: getInitialRangeInput(
                  target,
                  currentRange,
                  rangeState,
                  retainedMainRangeInputRef.current,
                  isNumericXAxis,
              ),
              currentRange,
              fullRange: rangeState.fullRange,
          }
        : undefined;

    function open(nextTarget: PanelRangeTarget): void {
        if (rangeState !== undefined) setTarget(nextTarget);
    }

    function apply(
        rangeInput: RangeExpressionInput,
        concreteRange: AxisRange,
    ): void {
        if (target === 'navigator') {
            onNavigatorRangeChange(concreteRange, rangeInput);
            return;
        }
        if (target === 'main') {
            retainedMainRangeInputRef.current = {
                rangeInput: { ...rangeInput },
                concreteRange: { ...concreteRange },
            };
            onMainRangeChange(concreteRange);
        }
    }

    return {
        dialog,
        openMain: () => open('main'),
        openNavigator: () => open('navigator'),
        close: () => setTarget(undefined),
        apply,
    };
}

export function PanelRangeDialog({
    dialog,
    apply,
    close,
}: Pick<ReturnType<typeof usePanelRangeDialog>, 'dialog' | 'apply' | 'close'>) {
    if (dialog === undefined) return null;

    return (
        <RangeModal
            key={`${dialog.target}-${dialog.kind}`}
            kind={dialog.kind}
            initialRangeInput={dialog.initialRangeInput}
            fullRange={dialog.fullRange}
            currentRange={dialog.currentRange}
            onApply={apply}
            onClose={close}
        />
    );
}

/**
 * Prefers the expression the user last typed — the navigator's stored input, or
 * the main input retained while it still describes the visible range — and
 * falls back to formatting the concrete range.
 */
function getInitialRangeInput(
    target: PanelRangeTarget,
    currentRange: AxisRange,
    rangeState: ResolvedRangeState,
    retainedMainRangeInput: RetainedMainRangeInput | undefined,
    isNumericXAxis: boolean | undefined,
): RangeExpressionInput {
    if (
        target === 'navigator' &&
        !isRangeExpressionEmpty(rangeState.navigatorRangeInput)
    ) {
        return rangeState.navigatorRangeInput;
    }
    if (
        target === 'main' &&
        retainedMainRangeInput !== undefined &&
        isSameRange(retainedMainRangeInput.concreteRange, currentRange)
    ) {
        return retainedMainRangeInput.rangeInput;
    }

    const formatValue = isNumericXAxis
        ? (value: number) => formatRangeInputValue(value, true)
        : formatAbsoluteTime;
    return {
        start: formatValue(currentRange.start),
        end: formatValue(currentRange.end),
    };
}
