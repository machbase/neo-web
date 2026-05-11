import {
    createAbsoluteTimeBoundary,
    createEmptyTimeBoundary,
} from './TimeBoundaryFactories';
import type { TimeRangeMs, TimeRangeConfig } from './TimeTypes';

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

export function createPaddedTimeRange(
    startTime: number,
    endTime: number,
    paddingMs: number,
): TimeRangeMs {
    return createTimeRangeMs(
        startTime,
        startTime === endTime ? endTime + paddingMs : endTime,
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

export function shiftTimestamp(timestamp: number, offsetMs: number): number {
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

export function isTimeRangeOutsideBounds(
    range: TimeRangeMs,
    bounds: TimeRangeMs,
): boolean {
    return range.startTime < bounds.startTime || range.endTime > bounds.endTime;
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

export function isConcreteTimeRange(
    timeRange: TimeRangeMs | undefined,
): timeRange is TimeRangeMs {
    if (!timeRange) {
        return false;
    }

    const { startTime, endTime } = timeRange;
    return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime > 0 &&
        endTime > 0 &&
        endTime > startTime
    );
}

export function isSameTimeRange(
    left: TimeRangeMs,
    right: TimeRangeMs,
): boolean {
    return left.startTime === right.startTime && left.endTime === right.endTime;
}
