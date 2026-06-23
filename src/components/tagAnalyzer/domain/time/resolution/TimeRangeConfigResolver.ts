import moment from 'moment';
import {
    TimeUnit,
    type NowTimeBoundary,
    type TimeBoundary,
    type TimeRangeConfig,
    type TimeRangeMs,
} from '../model/TimeTypes';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../range/TimeRangeUtils';

export function canResolveTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
    options: { lastAnchorTime?: number } = {},
): boolean {
    try {
        resolveTimeRangeConfig(timeRangeConfig, options);
        return true;
    } catch {
        return false;
    }
}

export function resolveTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
    options: { lastAnchorTime?: number } = {},
): TimeRangeMs {
    if (hasEmptyBoundary(timeRangeConfig)) {
        throw new Error('Time range config cannot resolve to a concrete range.');
    }

    const sLastAnchorTime = Number.isFinite(options.lastAnchorTime)
        ? options.lastAnchorTime
        : undefined;

    if (hasLastBoundary(timeRangeConfig) && sLastAnchorTime === undefined) {
        throw new Error('Time range config cannot resolve to a concrete range.');
    }

    const sCurrentTime = moment().valueOf();
    const sStartTime = resolveTimeBoundaryToTimestamp(
        timeRangeConfig.start,
        sCurrentTime,
        sLastAnchorTime,
    );
    const sEndTime = resolveTimeBoundaryToTimestamp(
        timeRangeConfig.end,
        sCurrentTime,
        sLastAnchorTime,
    );

    const sResolvedRange = createTimeRangeMs(sStartTime, sEndTime);

    if (!isValidTimeRange(sResolvedRange)) {
        throw new Error('Time range config cannot resolve to a concrete range.');
    }

    return sResolvedRange;
}

function resolveTimeBoundaryToTimestamp(
    boundary: TimeBoundary,
    currentTime: number,
    lastAnchorTime: number | undefined,
): number {
    switch (boundary.kind) {
        case 'empty':
            throw new Error('Empty time boundary cannot resolve to a timestamp.');
        case 'absolute':
            return boundary.timestamp;
        case 'last':
            if (lastAnchorTime === undefined) {
                throw new Error('Last time boundary cannot resolve without an anchor.');
            }

            if (boundary.amount <= 0) {
                return lastAnchorTime;
            }

            return subtractTimeUnit(lastAnchorTime, boundary.amount, boundary.unit);
        case 'now':
            if (boundary.amount <= 0) {
                return currentTime;
            }

            return subtractTimeUnit(currentTime, boundary.amount, boundary.unit);
    }
}

function subtractTimeUnit(
    anchorTime: number,
    amount: number,
    unit: NowTimeBoundary['unit'],
): number {
    switch (unit) {
        case TimeUnit.Millisecond:
            return moment(anchorTime).subtract(amount, 'millisecond').valueOf();
        case TimeUnit.Second:
            return moment(anchorTime).subtract(amount, 'second').valueOf();
        case TimeUnit.Minute:
            return moment(anchorTime).subtract(amount, 'minute').valueOf();
        case TimeUnit.Hour:
            return moment(anchorTime).subtract(amount, 'hour').valueOf();
        case TimeUnit.Day:
            return moment(anchorTime).subtract(amount, 'day').valueOf();
        case TimeUnit.Week:
            return moment(anchorTime).subtract(amount, 'week').valueOf();
        case TimeUnit.Month:
            return moment(anchorTime).subtract(amount, 'month').valueOf();
        case TimeUnit.Year:
            return moment(anchorTime).subtract(amount, 'year').valueOf();
    }
}

function hasEmptyBoundary(timeRangeConfig: TimeRangeConfig): boolean {
    return (
        timeRangeConfig.start.kind === 'empty' ||
        timeRangeConfig.end.kind === 'empty'
    );
}

function hasLastBoundary(timeRangeConfig: TimeRangeConfig): boolean {
    return (
        timeRangeConfig.start.kind === 'last' ||
        timeRangeConfig.end.kind === 'last'
    );
}
