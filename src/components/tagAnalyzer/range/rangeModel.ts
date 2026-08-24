export type AxisRange = {
    start: number;
    end: number;
};

export type RangeState = {
    mainRange: AxisRange;
    navigatorRange: AxisRange;
};

export type RangeExpressionInput = {
    start: string;
    end: string;
};

export type ResolvedRangeState = {
    range: RangeState;
    fullRange: AxisRange;
    navigatorRangeInput: RangeExpressionInput;
};

export function isRangeExpressionEmpty(range: RangeExpressionInput): boolean {
    return range.start.trim() === '' && range.end.trim() === '';
}

export type AxisKind = 'time' | 'numeric';
