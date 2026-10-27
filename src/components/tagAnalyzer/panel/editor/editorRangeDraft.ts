import type { RangeState } from '../rangeControl/rangeControlModel';
import { formatRangeInputValue } from '../../rangeExpression/expressionFormat';
import { isSameRange } from '../../rangeExpression/rangeArithmetic';
import { resolveRangeInput } from '../../rangeExpression/rangeInput';
import { resolveRangeChange } from '../rangeControl/rangeTransitions';
import { isRangeExpressionEmpty, type AxisKind, type AxisRange, type RangeExpressionInput } from '../../rangeExpression/rangeModel';
import type { PanelInfo } from '../panelModel';

type RangeTarget = 'rangeInput' | 'navigatorRangeInput';

type RangeDraftContext = {
    axisKind: AxisKind;
    dataRange: AxisRange;
    currentRange: RangeState;
    referenceTimeMs: number;
    /** The Nav input this editor filled in by itself to keep a Main edit inside it. */
    autoNavigatorInput: RangeExpressionInput | undefined;
};

/**
 * Couples the editor draft only; the chart receives this configuration on Apply. A Nav input
 * filled in for a Main edit belongs to that edit: clearing Main clears it too, so Main Reset
 * returns both ranges to automatic.
 */
export function updateEditorRangeDraft(
    time: PanelInfo['time'],
    target: RangeTarget,
    input: RangeExpressionInput,
    context: RangeDraftContext,
): { time: PanelInfo['time']; autoNavigatorInput: RangeExpressionInput | undefined } {
    if (target === 'navigatorRangeInput') {
        return { time: coupleEditorRanges(time, target, input, context), autoNavigatorInput: undefined };
    }
    const navigatorBefore = time.navigatorRangeInput;
    const isAutoNavigator = context.autoNavigatorInput !== undefined &&
        navigatorBefore !== undefined &&
        isSameRangeInput(navigatorBefore, context.autoNavigatorInput);
    if (isRangeExpressionEmpty(input)) {
        return {
            time: isAutoNavigator
                ? { ...time, rangeInput: input, navigatorRangeInput: { start: '', end: '' } }
                : { ...time, rangeInput: input },
            autoNavigatorInput: undefined,
        };
    }
    const nextTime = coupleEditorRanges(time, target, input, context);
    const navigatorAfter = nextTime.navigatorRangeInput;
    if (!navigatorAfter || (navigatorBefore && isSameRangeInput(navigatorBefore, navigatorAfter))) {
        return { time: nextTime, autoNavigatorInput: isAutoNavigator ? context.autoNavigatorInput : undefined };
    }
    const wasNavigatorAutomatic = !navigatorBefore || isRangeExpressionEmpty(navigatorBefore) || isAutoNavigator;
    return { time: nextTime, autoNavigatorInput: wasNavigatorAutomatic ? navigatorAfter : undefined };
}

function isSameRangeInput(a: RangeExpressionInput, b: RangeExpressionInput): boolean {
    return a.start === b.start && a.end === b.end;
}

function coupleEditorRanges(
    time: PanelInfo['time'],
    target: RangeTarget,
    input: RangeExpressionInput,
    { axisKind, dataRange, currentRange, referenceTimeMs }: RangeDraftContext,
): PanelInfo['time'] {
    const resolve = (value: RangeExpressionInput | undefined, fallback: AxisRange, emptyRange: AxisRange) => {
        if (!value || isRangeExpressionEmpty(value)) return emptyRange;
        if (axisKind === 'numeric' && (!value.start.trim() || !value.end.trim())) return undefined;
        return resolveRangeInput(value, axisKind, dataRange, fallback, referenceTimeMs);
    };
    const nextTime = { ...time, [target]: input };
    // Clearing Main selects automatic range behavior; it must not impose a full-data constraint on Nav.
    if (isRangeExpressionEmpty(nextTime.rangeInput)) return nextTime;
    const nav = resolve(nextTime.navigatorRangeInput, currentRange.navigatorRange, dataRange);
    const main = resolve(
        nextTime.rangeInput,
        currentRange.mainRange,
        axisKind === 'numeric' ? dataRange : currentRange.mainRange,
    );
    // Keep unfinished fields in the draft; never replace one to repair the other.
    if (!main || !nav) return nextTime;

    const editingMain = target === 'rangeInput';
    const adjusted = resolveRangeChange({ mainRange: main, navigatorRange: nav }, editingMain
        ? { type: 'main', range: main }
        : { type: 'navigator', range: nav });
    const otherKey = editingMain ? 'navigatorRangeInput' : 'rangeInput';
    const original = editingMain ? nav : main;
    const updated = editingMain ? adjusted.navigatorRange : adjusted.mainRange;
    if (isSameRange(original, updated)) return nextTime;

    const changedRange = editingMain ? main : nav;
    const otherInput = time[otherKey];
    const edge = (field: keyof AxisRange) => {
        // Preserve untouched expressions and copy an edited anchor when it is the new limit.
        if (updated[field] === original[field] && otherInput?.[field]) return otherInput[field];
        if (updated[field] === changedRange[field] && input[field]) return input[field];
        return formatRangeInputValue(updated[field], axisKind === 'numeric');
    };
    return { ...nextTime, [otherKey]: { start: edge('start'), end: edge('end') } };
}
