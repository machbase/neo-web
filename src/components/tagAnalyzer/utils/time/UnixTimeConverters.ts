import type {
    TimeRangeMs,
    TimeRangeNs,
    UnixMilliseconds,
    UnixNanoseconds,
} from './types/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from './constants/UnixTimeConstants';

/**
 * Converts one Unix-millisecond timestamp into Unix nanoseconds.
 * Intent: Keep Unix time-unit conversion logic inside the shared time layer.
 * @param {UnixMilliseconds} unixMilliseconds - The millisecond timestamp to convert.
 * @returns {UnixNanoseconds} The converted nanosecond timestamp.
 */
export function convertUnixMillisecondsToNanoseconds(
    unixMilliseconds: UnixMilliseconds,
): UnixNanoseconds {
    return unixMilliseconds * NANOSECONDS_PER_MILLISECOND;
}

/**
 * Converts a Tag Analyzer millisecond time range into nanoseconds.
 * Intent: Keep fetch and boundary callers working from one shared time conversion helper.
 * @param {TimeRangeMs} timeRange - The millisecond time range from the app/chart layer.
 * @returns {TimeRangeNs} The converted nanosecond time range.
 */
export function convertTimeRangeMsToNanoseconds(timeRange: TimeRangeMs): TimeRangeNs {
    return {
        startTime: convertUnixMillisecondsToNanoseconds(timeRange.startTime),
        endTime: convertUnixMillisecondsToNanoseconds(timeRange.endTime),
    };
}
