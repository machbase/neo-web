import type { AxisRange, PanelRangeState } from './rangeModel';

export function getRangeWidth(range: AxisRange): number {
    return range.endTime - range.startTime;
}

export function getRangeCenter(range: AxisRange): number {
    return range.startTime + getRangeWidth(range) / 2;
}

export function createRangeFromCenterAndWidth(
    center: number,
    width: number,
): AxisRange {
    const halfWidth: number = width / 2;

    return {
        startTime: center - halfWidth,
        endTime: center + halfWidth,
    };
}

export function shiftRange(range: AxisRange, offset: number): AxisRange {
    return {
        startTime: range.startTime + offset,
        endTime: range.endTime + offset,
    };
}

export function isRangeWithin(
    innerRange: AxisRange,
    outerRange: AxisRange,
): boolean {
    return (
        innerRange.startTime >= outerRange.startTime &&
        innerRange.endTime <= outerRange.endTime
    );
}

export function clampRangeToBounds(
    range: AxisRange,
    bounds: AxisRange,
): AxisRange {
    const rangeWidth: number = getRangeWidth(range);
    const boundsWidth: number = getRangeWidth(bounds);

    if (rangeWidth >= boundsWidth) {
        return bounds;
    }

    if (range.startTime < bounds.startTime) {
        return {
            startTime: bounds.startTime,
            endTime: bounds.startTime + rangeWidth,
        };
    }

    if (range.endTime > bounds.endTime) {
        return {
            startTime: bounds.endTime - rangeWidth,
            endTime: bounds.endTime,
        };
    }

    return range;
}

export function getCoveringRange(
    left: AxisRange,
    right: AxisRange,
): AxisRange {
    return {
        startTime: Math.min(left.startTime, right.startTime),
        endTime: Math.max(left.endTime, right.endTime),
    };
}

export function isSameRange(
    left: AxisRange,
    right: AxisRange,
    tolerance = 0,
): boolean {
    const normalizedTolerance: number = Number.isFinite(tolerance)
        ? Math.max(tolerance, 0)
        : 0;

    if (normalizedTolerance <= 0) {
        return left.startTime === right.startTime &&
            left.endTime === right.endTime;
    }

    return (
        Math.abs(left.startTime - right.startTime) <= normalizedTolerance &&
        Math.abs(left.endTime - right.endTime) <= normalizedTolerance
    );
}

export function isValidRange(
    range: AxisRange | null | undefined,
): range is AxisRange {
    return (
        range !== null &&
        range !== undefined &&
        Number.isFinite(range.startTime) &&
        Number.isFinite(range.endTime) &&
        range.endTime > range.startTime
    );
}

export function isValidPanelRangeState(
    rangeState: PanelRangeState | null | undefined,
): rangeState is PanelRangeState {
    return (
        rangeState !== null &&
        rangeState !== undefined &&
        isValidRange(rangeState.panelRange) &&
        isValidRange(rangeState.navigatorRange) &&
        isRangeWithin(rangeState.panelRange, rangeState.navigatorRange)
    );
}
