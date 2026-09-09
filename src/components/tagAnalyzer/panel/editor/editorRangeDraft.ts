import type { RangeState } from '../rangeControl/rangeControlModel';
import { formatRangeInputValue } from '../../rangeExpression/expressionFormat';
import { isSameRange } from '../../rangeExpression/rangeArithmetic';
import { resolveRangeInput } from '../../rangeExpression/rangeInput';
import { resolveRangeChange } from '../rangeControl/rangeTransitions';
import { isRangeExpressionEmpty, type AxisKind, type AxisRange, type RangeExpressionInput } from '../../rangeExpression/rangeModel';
import type { PanelInfo } from '../panelModel';

type RangeTarget = 'rangeInput' | 'navigatorRangeInput';

/** Couples the editor draft only; the chart receives this configuration on Apply. */
export function updateEditorRangeDraft(
    time: PanelInfo['time'],
    target: RangeTarget,
    input: RangeExpressionInput,
    { axisKind, dataRange, currentRange, referenceTimeMs }: {
        axisKind: AxisKind;
        dataRange: AxisRange;
        currentRange: RangeState;
        referenceTimeMs: number;
    },
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
