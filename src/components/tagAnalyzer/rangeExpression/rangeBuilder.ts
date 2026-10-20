import type { AxisRange } from './rangeModel';

export function createNonEmptyAxisRange(
    first: number,
    second: number,
): AxisRange | undefined {
    if (
        !Number.isFinite(first) ||
        !Number.isFinite(second) ||
        first === second
    ) {
        return undefined;
    }

    return {
        start: Math.min(first, second),
        end: Math.max(first, second),
    };
}
