export type ValueRange = {
    min: number;
    max: number;
};

export type ValueRangePair = {
    start: ValueRange;
    end: ValueRange;
};

export const DEFAULT_VALUE_RANGE: ValueRange = { min: 0, max: 0 };
