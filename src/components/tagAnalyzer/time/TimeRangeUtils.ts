import {
    createAbsoluteTimeBoundary,
    createEmptyTimeBoundary,
} from './TimeBoundaryFactories';
import type { ResolvedTimeRangeMs, TimeRangeConfig } from './TimeTypes';

export function createResolvedTimeRange(
    startTime: number,
    endTime: number,
): ResolvedTimeRangeMs {
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
): ResolvedTimeRangeMs {
    return createResolvedTimeRange(
        startTime,
        startTime === endTime ? endTime + paddingMs : endTime,
    );
}

export function getTimeRangeWidth(range: ResolvedTimeRangeMs): number {
    return range.endTime - range.startTime;
}

export function getTimeRangeCenter(range: ResolvedTimeRangeMs): number {
    return range.startTime + getTimeRangeWidth(range) / 2;
}

export function ensureMinimumTimeRangeWidth(
    range: ResolvedTimeRangeMs,
    minimumWidthMs: number,
): ResolvedTimeRangeMs {
    return createResolvedTimeRange(
        range.startTime,
        Math.max(range.endTime, range.startTime + minimumWidthMs),
    );
}

export function shiftTimestamp(timestamp: number, offsetMs: number): number {
    return timestamp + offsetMs;
}

export function shiftTimeRange(
    range: ResolvedTimeRangeMs,
    offsetMs: number,
): ResolvedTimeRangeMs {
    return createResolvedTimeRange(
        shiftTimestamp(range.startTime, offsetMs),
        shiftTimestamp(range.endTime, offsetMs),
    );
}

export function isTimeRangeOutsideBounds(
    range: ResolvedTimeRangeMs,
    bounds: ResolvedTimeRangeMs,
): boolean {
    return range.startTime < bounds.startTime || range.endTime > bounds.endTime;
}

export function clampTimeRangeToBounds(
    range: ResolvedTimeRangeMs,
    bounds: ResolvedTimeRangeMs,
): ResolvedTimeRangeMs {
    const rangeWidth = getTimeRangeWidth(range);
    const boundsWidth = getTimeRangeWidth(bounds);

    if (rangeWidth >= boundsWidth) {
        return bounds;
    }

    if (range.startTime < bounds.startTime) {
        return createResolvedTimeRange(bounds.startTime, bounds.startTime + rangeWidth);
    }

    if (range.endTime > bounds.endTime) {
        return createResolvedTimeRange(bounds.endTime - rangeWidth, bounds.endTime);
    }

    return range;
}

export function isConcreteTimeRange(
    timeRange: ResolvedTimeRangeMs | undefined,
): timeRange is ResolvedTimeRangeMs {
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
    left: ResolvedTimeRangeMs,
    right: ResolvedTimeRangeMs,
): boolean {
    return left.startTime === right.startTime && left.endTime === right.endTime;
}
