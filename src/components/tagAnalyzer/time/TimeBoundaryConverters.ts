import moment from 'moment';
import {
    TimeBoundary,
    LastTimeBoundary,
    NowTimeBoundary,
    TimeRangeConfig,
    ResolvedTimeRangeMs,
    TimeUnit,
} from './TimeTypes';
import {
    getTimeUnitMilliseconds,
} from './TimeUnitUtils';

/**
 * Converts a time-range config into a numeric time range.
 * Intent: Derive concrete millisecond bounds only at the call sites that need them.
 * @param {TimeRangeConfig} rangeConfig - The range configuration to resolve.
 * @param {number} [lastAnchorTime] - Optional anchor time used for last-relative boundaries.
 * @returns {ResolvedTimeRangeMs} The numeric time range derived from the config.
 */
export function convertTimeRangeConfigToResolvedTimeRangeMs(
    rangeConfig: TimeRangeConfig,
    lastAnchorTime?: number,
): ResolvedTimeRangeMs {
    const sCurrentTime = moment().valueOf();

    return {
        startTime: convertTimeBoundaryToUnixMilliseconds(
            rangeConfig.start,
            sCurrentTime,
            lastAnchorTime,
        ),
        endTime: convertTimeBoundaryToUnixMilliseconds(
            rangeConfig.end,
            sCurrentTime,
            lastAnchorTime,
        ),
    };
}

/**
 * Checks whether a time range is concrete enough for chart work.
 * Intent: Reuse one shared guard for fetch and range workflows that need an ordered time range.
 * @param {ResolvedTimeRangeMs | undefined} timeRange - The time range candidate to validate.
 * @returns {aTimeRange is ResolvedTimeRangeMs} True when the range is concrete and ordered.
 */
export function isConcreteTimeRange(timeRange: ResolvedTimeRangeMs | undefined): timeRange is ResolvedTimeRangeMs {
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

function subtractTimeUnit(
    anchorTime: number,
    amount: number,
    unit: NowTimeBoundary['unit'],
): number {
    switch (unit) {
        case TimeUnit.Millisecond:
            return anchorTime - getTimeUnitMilliseconds(unit, amount);
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

function convertTimeBoundaryToUnixMilliseconds(
    boundary: TimeBoundary,
    currentTime: number,
    lastAnchorTime: number | undefined,
): number {
    switch (boundary.kind) {
        case 'empty':
            return 0;
        case 'absolute':
            return boundary.timestamp;
        case 'last':
            return resolveLastTimeBoundaryTime(boundary, lastAnchorTime);
        case 'now':
            if (boundary.amount <= 0) {
                return currentTime;
            }

            return subtractTimeUnit(currentTime, boundary.amount, boundary.unit);
    }
}

function resolveLastTimeBoundaryTime(
    boundary: LastTimeBoundary,
    anchorTime: number | undefined,
): number {
    if (anchorTime === undefined) {
        return 0;
    }

    if (boundary.amount <= 0) {
        return anchorTime;
    }

    return subtractTimeUnit(anchorTime, boundary.amount, boundary.unit);
}

