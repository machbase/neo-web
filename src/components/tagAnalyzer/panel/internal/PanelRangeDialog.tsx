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

export type PanelRangeDialogState = {
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

export type PanelRangeDialogController = {
    dialog: PanelRangeDialogState | undefined;
    openMain: () => void;
    openNavigator: () => void;
    close: () => void;
    apply: (
        rangeInput: RangeExpressionInput,
        concreteRange: AxisRange,
    ) => void;
};

// eslint-disable-next-line react-refresh/only-export-components -- The hook and renderer form one range-dialog boundary.
export function usePanelRangeDialog({
    rangeState,
    renderRange,
    isNumericXAxis,
    onMainRangeChange,
    onNavigatorRangeChange,
}: UsePanelRangeDialogParams): PanelRangeDialogController {
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

    const currentRange = target === 'main'
        ? renderMainRange
        : target === 'navigator'
          ? renderRange?.navigatorRange
          : undefined;
    const initialRangeInput = getInitialRangeInput({
        target,
        currentRange,
        rangeState,
        retainedMainRangeInput: retainedMainRangeInputRef.current,
        isNumericXAxis,
    });
    const dialog: PanelRangeDialogState | undefined = target !== undefined &&
        rangeState !== undefined &&
        currentRange !== undefined
        ? {
              target,
              kind: isNumericXAxis ? 'numeric' : 'time',
              initialRangeInput,
              currentRange,
              fullRange: rangeState.fullRange ?? currentRange,
          }
        : undefined;

    function openMain(): void {
        if (rangeState !== undefined) setTarget('main');
    }

    function openNavigator(): void {
        if (rangeState !== undefined) setTarget('navigator');
    }

    function close(): void {
        setTarget(undefined);
    }

    function apply(
        rangeInput: RangeExpressionInput,
        concreteRange: AxisRange,
    ): void {
        if (target === 'main') {
            retainedMainRangeInputRef.current = {
                rangeInput: { ...rangeInput },
                concreteRange: { ...concreteRange },
            };
            onMainRangeChange(concreteRange);
            return;
        }

        if (target === 'navigator') {
            onNavigatorRangeChange(concreteRange, rangeInput);
        }
    }

    return {
        dialog,
        openMain,
        openNavigator,
        close,
        apply,
    };
}

export function PanelRangeDialog({
    dialog,
    apply,
    close,
}: Pick<PanelRangeDialogController, 'dialog' | 'apply' | 'close'>) {
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

function getInitialRangeInput({
    target,
    currentRange,
    rangeState,
    retainedMainRangeInput,
    isNumericXAxis,
}: {
    target: PanelRangeTarget | undefined;
    currentRange: AxisRange | undefined;
    rangeState: ResolvedRangeState | undefined;
    retainedMainRangeInput: RetainedMainRangeInput | undefined;
    isNumericXAxis: boolean | undefined;
}): RangeExpressionInput {
    if (
        target === 'navigator' &&
        rangeState !== undefined &&
        !isRangeExpressionEmpty(rangeState.navigatorRangeInput)
    ) {
        return rangeState.navigatorRangeInput;
    }

    if (
        target === 'main' &&
        currentRange !== undefined &&
        retainedMainRangeInput !== undefined &&
        isSameRange(retainedMainRangeInput.concreteRange, currentRange)
    ) {
        return retainedMainRangeInput.rangeInput;
    }

    if (currentRange === undefined) {
        return { start: '', end: '' };
    }

    return isNumericXAxis
        ? {
              start: formatRangeInputValue(currentRange.start, true),
              end: formatRangeInputValue(currentRange.end, true),
          }
        : {
              start: formatAbsoluteTime(currentRange.start),
              end: formatAbsoluteTime(currentRange.end),
          };
}
