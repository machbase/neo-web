import type {
    AxisKind,
    AxisRange,
    RangeExpressionInput,
} from '../../rangeExpression/rangeModel';

export type RangeControlConfig = {
    key: string;
    axisKind: AxisKind | undefined;
    rangeInput: RangeExpressionInput;
    navigatorRangeInput?: RangeExpressionInput;
    restoredRange?: RangeState;
    loadFullRange: () => Promise<AxisRange>;
};

export type RangeState = {
    mainRange: AxisRange;
    navigatorRange: AxisRange;
};

export type ResolvedRangeState = {
    range: RangeState;
    fullRange: AxisRange;
    navigatorRangeInput: RangeExpressionInput;
};
