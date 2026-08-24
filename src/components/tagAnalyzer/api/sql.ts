import type { AxisRange } from '../range/rangeModel';
import type { SqlIdentifierPath } from '../seriesModel';

export const NANOSECONDS_PER_MILLISECOND = 1000000;

export function buildSqlStringLiteral(value: string | number): string {
    return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildTqlDoubleQuotedString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

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

export function toQueryTimeLiteralSql(
    value: number,
    usesNumericTime: boolean,
): string {
    return usesNumericTime
        ? String(value)
        : `FROM_TIMESTAMP(${millisecondsToNanosecondsSql(value)})`;
}

export function buildTimeRangeConditionSql(
    timeColumn: SqlIdentifierPath,
    timeRange: AxisRange,
    usesNumericTime: boolean,
): string {
    return `${timeColumn} BETWEEN ${toQueryTimeLiteralSql(
        timeRange.start,
        usesNumericTime,
    )} AND ${toQueryTimeLiteralSql(timeRange.end, usesNumericTime)}`;
}

export function toQueryResultMillisecondsSql(
    dateTimeExpressionSql: string,
): string {
    return `TO_TIMESTAMP(${dateTimeExpressionSql}) / ${NANOSECONDS_PER_MILLISECOND}.0`;
}
