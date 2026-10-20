import type { AxisRange } from '../rangeExpression/rangeModel';

export const NANOSECONDS_PER_MILLISECOND = 1000000;

export function joinSqlLines(lines: string[]): string {
    return lines
        .filter((line) => line.length > 0)
        .join('\n');
}

export function indentSql(sql: string): string {
    return sql
        .split('\n')
        .map((line) => line.length > 0 ? `    ${line}` : line)
        .join('\n');
}

export function toQueryTimeLiteralSql(
    value: number,
    usesNumericTime: boolean,
): string {
    return usesNumericTime
        ? String(value)
        : `FROM_TIMESTAMP(${millisecondsToNanosecondsSql(value)})`;
}

export function buildTimeRangeConditionSql(
    timeColumnSql: string,
    timeRange: AxisRange,
    usesNumericTime: boolean,
): string {
    return `${timeColumnSql} BETWEEN ${toQueryTimeLiteralSql(
        timeRange.start,
        usesNumericTime,
    )} AND ${toQueryTimeLiteralSql(timeRange.end, usesNumericTime)}`;
}

export function toQueryResultMillisecondsSql(
    dateTimeExpressionSql: string,
): string {
    return `TO_TIMESTAMP(${dateTimeExpressionSql}) / ${NANOSECONDS_PER_MILLISECOND}.0`;
}

// -------------------- Local --------------------

function millisecondsToNanosecondsSql(ms: number): string {
    const wholeMilliseconds: number = Math.trunc(ms);
    const fractionalNanoseconds: number = Math.round(
        (ms - wholeMilliseconds) * NANOSECONDS_PER_MILLISECOND,
    );
    return String(
        BigInt(wholeMilliseconds) * BigInt(NANOSECONDS_PER_MILLISECOND) +
        BigInt(fractionalNanoseconds),
    );
}
