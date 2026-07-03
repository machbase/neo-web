import type {
    TimeRangeMs,
    TimeRangeNs,
    UnixNanosecondsSql,
} from '../../domain/time/TimeTypes';

function millisecondsToNanosecondsSql(ms: number): UnixNanosecondsSql {
    return String(BigInt(Math.trunc(ms)) * 1_000_000n);
}

export function timeRangeMsToNanosecondsSql(
    timeRange: TimeRangeMs,
): TimeRangeNs {
    return {
        startTime: millisecondsToNanosecondsSql(timeRange.startTime),
        endTime: millisecondsToNanosecondsSql(timeRange.endTime),
    };
}
