export const SINGLE_POINT_TIME_WIDTH_MS = 1_000;
export const SINGLE_POINT_NUMERIC_WIDTH = 1;

export type AxisRange = {
    start: number;
    end: number;
};

export type RangeExpressionInput = {
    start: string;
    end: string;
};

export function isRangeExpressionEmpty(range: RangeExpressionInput): boolean {
    return range.start.trim() === '' && range.end.trim() === '';
}

export type AxisKind = 'time' | 'numeric';
