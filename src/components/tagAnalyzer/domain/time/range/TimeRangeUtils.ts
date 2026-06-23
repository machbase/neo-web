import {
    createAbsoluteTimeBoundary,
    createEmptyTimeBoundary,
} from '../boundary/TimeBoundaryInput';
import type { TimeRangeMs, TimeRangeConfig } from '../model/TimeTypes';

export function createTimeRangeMs(
    startTime: number,
    endTime: number,
): TimeRangeMs {
    return {
        startTime,
        endTime,
    };
}

export function createTimeRangeConfig(
    rangeStart: TimeRangeConfig['start'],
    rangeEnd: TimeRangeConfig['end'],
): TimeRangeConfig {
    return {
        start: rangeStart,
        end: rangeEnd,
    };
}

export function createEmptyTimeRangeConfig(): TimeRangeConfig {
    return createTimeRangeConfig(
        createEmptyTimeBoundary(),
        createEmptyTimeBoundary(),
    );
}

export function createAbsoluteTimeRangeConfig(
    startTime: number,
    endTime: number,
): TimeRangeConfig {
    return createTimeRangeConfig(
        createAbsoluteTimeBoundary(startTime),
        createAbsoluteTimeBoundary(endTime),
    );
}

export function getTimeRangeWidth(range: TimeRangeMs): number {
    return range.endTime - range.startTime;
}

export function getTimeRangeCenter(range: TimeRangeMs): number {
    return range.startTime + getTimeRangeWidth(range) / 2;
}

export function ensureMinimumTimeRangeWidth(
    range: TimeRangeMs,
    minimumWidthMs: number,
): TimeRangeMs {
    return createTimeRangeMs(
        range.startTime,
        Math.max(range.endTime, range.startTime + minimumWidthMs),
    );
}

function shiftTimestamp(timestamp: number, offsetMs: number): number {
    return timestamp + offsetMs;
}

export function shiftTimeRange(
    range: TimeRangeMs,
    offsetMs: number,
): TimeRangeMs {
    return createTimeRangeMs(
        shiftTimestamp(range.startTime, offsetMs),
        shiftTimestamp(range.endTime, offsetMs),
    );
}

export function isTimeRangeWithinTimeRange(
    innerRange: TimeRangeMs,
    outerRange: TimeRangeMs,
): boolean {
    return (
        innerRange.startTime >= outerRange.startTime &&
        innerRange.endTime <= outerRange.endTime
    );
}

export function clampTimeRangeToBounds(
    range: TimeRangeMs,
    bounds: TimeRangeMs,
): TimeRangeMs {
    const rangeWidth = getTimeRangeWidth(range);
    const boundsWidth = getTimeRangeWidth(bounds);

    if (rangeWidth >= boundsWidth) {
        return bounds;
    }

    if (range.startTime < bounds.startTime) {
        return createTimeRangeMs(bounds.startTime, bounds.startTime + rangeWidth);
    }

    if (range.endTime > bounds.endTime) {
        return createTimeRangeMs(bounds.endTime - rangeWidth, bounds.endTime);
    }

    return range;
}

export function isValidTimeRange(
    timeRange: TimeRangeMs | null | undefined,
): timeRange is TimeRangeMs {
    if (!timeRange) {
        return false;
    }

    const { startTime, endTime } = timeRange;
    return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime > startTime
    );
}

export function isSameTimeRange(
    left: TimeRangeMs,
    right: TimeRangeMs,
    toleranceMs = 0,
): boolean {
    const sToleranceMs = Number.isFinite(toleranceMs)
        ? Math.max(toleranceMs, 0)
        : 0;

    if (sToleranceMs <= 0) {
        return left.startTime === right.startTime && left.endTime === right.endTime;
    }

    return (
        Math.abs(left.startTime - right.startTime) <= sToleranceMs &&
        Math.abs(left.endTime - right.endTime) <= sToleranceMs
    );
}

function getTimeRangeDurationExtremum(
    ranges: TimeRangeMs[],
    selectDuration: (...durations: number[]) => number,
): number {
    const sPositiveDurations = ranges
        .map(getTimeRangeWidth)
        .filter((duration) => Number.isFinite(duration) && duration > 0);

    return sPositiveDurations.length > 0
        ? selectDuration(...sPositiveDurations)
        : ranges[0] ? getTimeRangeWidth(ranges[0]) : 0;
}

export function getSmallestTimeRangeDuration(ranges: TimeRangeMs[]): number {
    return getTimeRangeDurationExtremum(ranges, Math.min);
}

export function getLargestTimeRangeDuration(ranges: TimeRangeMs[]): number {
    return getTimeRangeDurationExtremum(ranges, Math.max);
}

export function hasVisibleTimeRangeChanged(
    nextRequestPanelRange: TimeRangeMs,
    nextRequestNavigatorRange: TimeRangeMs,
    currentRangeState: {
        requestPanelRange: TimeRangeMs;
        requestNavigatorRange: TimeRangeMs;
    },
): boolean {
    return (
        !isSameTimeRange(
            nextRequestPanelRange,
            currentRangeState.requestPanelRange,
        ) ||
        !isSameTimeRange(
            nextRequestNavigatorRange,
            currentRangeState.requestNavigatorRange,
        )
    );
}
