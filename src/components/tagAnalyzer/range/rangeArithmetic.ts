import type { AxisRange } from './rangeModel';

export function getRangeWidth(range: AxisRange): number {
    return range.end - range.start;
}

export function getRangeCenter(range: AxisRange): number {
    return range.start + getRangeWidth(range) / 2;
}

export function createRangeFromCenterAndWidth(
    center: number,
    width: number,
): AxisRange {
    const halfWidth = width / 2;

    return {
        start: center - halfWidth,
        end: center + halfWidth,
    };
}

export function shiftRange(range: AxisRange, offset: number): AxisRange {
    return {
        start: range.start + offset,
        end: range.end + offset,
    };
}

export function isRangeWithin(
    innerRange: AxisRange,
    outerRange: AxisRange,
): boolean {
    return (
        innerRange.start >= outerRange.start &&
        innerRange.end <= outerRange.end
    );
}

export function fitRangeWithinBounds(
    rangeToFit: AxisRange,
    containingRange: AxisRange,
): AxisRange {
    const rangeWidth = getRangeWidth(rangeToFit);
    const containingWidth = getRangeWidth(containingRange);

    if (rangeWidth >= containingWidth) {
        return containingRange;
    }

    if (rangeToFit.start < containingRange.start) {
        return {
            start: containingRange.start,
            end: containingRange.start + rangeWidth,
        };
    }

    if (rangeToFit.end > containingRange.end) {
        return {
            start: containingRange.end - rangeWidth,
            end: containingRange.end,
        };
    }

    return rangeToFit;
}

export function getEnclosingRange(
    firstRange: AxisRange,
    secondRange: AxisRange,
): AxisRange {
    return {
        start: Math.min(firstRange.start, secondRange.start),
        end: Math.max(firstRange.end, secondRange.end),
    };
}

export function isSameRange(
    left: AxisRange,
    right: AxisRange,
): boolean {
    return left.start === right.start && left.end === right.end;
}
