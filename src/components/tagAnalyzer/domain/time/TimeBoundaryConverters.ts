import moment from 'moment';
import {
    TimeBoundary,
    LastTimeBoundary,
    NowTimeBoundary,
    TimeRangeConfig,
    TimeRangeMs,
    TimeUnit,
} from './TimeTypes';

export function convertTimeRangeConfigToTimeRangeMs(
    rangeConfig: TimeRangeConfig,
    lastAnchorTime?: number,
): TimeRangeMs {
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

