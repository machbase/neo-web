import type {
    TimeRangeMs,
    TimeRangeNs,
    UnixNanosecondsSql,
} from '../../domain/time/TimeTypes';
import { NANOSECONDS_PER_MILLISECOND } from '../../domain/time/TimeConstants';

function millisecondsToNanosecondsSql(ms: number): UnixNanosecondsSql {
    return String(BigInt(Math.trunc(ms)) * BigInt(NANOSECONDS_PER_MILLISECOND));
}

export function timeRangeMsToNanosecondsSql(
    timeRange: TimeRangeMs,
): TimeRangeNs {
    return {
        startTime: millisecondsToNanosecondsSql(timeRange.startTime),
        endTime: millisecondsToNanosecondsSql(timeRange.endTime),
    };
}

export function toQueryTimeLiteralSql(
    value: number | string,
    useDateTimeColumn: boolean,
): string {
    return useDateTimeColumn
        ? `FROM_TIMESTAMP(${value})`
        : String(value);
}

export function toQueryResultMillisecondsSql(
    dateTimeExpressionSql: string,
): string {
    return `to_timestamp(${dateTimeExpressionSql}) / ${NANOSECONDS_PER_MILLISECOND}.0`;
}
