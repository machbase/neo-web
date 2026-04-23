import type {
    TimeRangeMs,
    TimeRangeNs,
    UnixMilliseconds,
    UnixNanoseconds,
} from '../time/types/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from './FetchConstants';

/**
 * Converts one Unix-millisecond timestamp into Unix nanoseconds.
 * Intent: Keep the fetch boundary unit conversion explicit at the backend IO edge.
 * @param {UnixMilliseconds} aTime - The millisecond timestamp to convert.
 * @returns {UnixNanoseconds} The converted nanosecond timestamp.
 */
export function toUnixNanoseconds(aTime: UnixMilliseconds): UnixNanoseconds {
    return aTime * NANOSECONDS_PER_MILLISECOND;
}

/**
 * Converts a Tag Analyzer millisecond time range into the nanosecond range expected by fetch queries.
 * Intent: Make the app-time to backend-time conversion explicit instead of guessing from raw numbers.
 * @param {TimeRangeMs} aTimeRange - The millisecond time range from the app/chart layer.
 * @returns {TimeRangeNs} The converted nanosecond time range for fetch queries.
 */
export function convertTimeRangeMsToTimeRangeNs(aTimeRange: TimeRangeMs): TimeRangeNs {
    return {
        startTime: toUnixNanoseconds(aTimeRange.startTime),
        endTime: toUnixNanoseconds(aTimeRange.endTime),
    };
}
