import type {
    TimeRangeMs,
    TimeRangeNs,
    UnixMilliseconds,
    UnixNanoseconds,
} from './TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from './TimeConstants';

export function convertUnixMillisecondsToNanoseconds(
    unixMilliseconds: UnixMilliseconds,
): UnixNanoseconds {
    return unixMilliseconds * NANOSECONDS_PER_MILLISECOND;
}

export function convertTimeRangeMsToNanoseconds(timeRange: TimeRangeMs): TimeRangeNs {
    return {
        startTime: convertUnixMillisecondsToNanoseconds(timeRange.startTime),
        endTime: convertUnixMillisecondsToNanoseconds(timeRange.endTime),
    };
}
