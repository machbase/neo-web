import moment from 'moment';
import {
    formatAbsoluteTime,
    formatTimeUnitShortCode,
} from '../format/timeFormat';
import { isFiniteNumber, isPlainObject } from '../objectGuards';
import { TimeUnit } from '../range/intervalResolver';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import type { AxisRange } from '../range/rangeModel';

export type PersistedAxisRange = {
    startTime: number;
    endTime: number;
};

export type ParsedNumericExpression =
    | { anchor: 'value'; value: number }
    | { anchor: 'data_start'; offset: number }
    | { anchor: 'data_end'; offset: number };

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const RELATIVE_TIME_PATTERN =
    /^([A-Za-z]+)(?:([+-])(\d+)(ms|s|m|h|d|w|M|y))?$/;
const NUMERIC_EXPRESSION_PATTERN =
    /^(first|last)(?:-((?:\d+\.?\d*)|(?:\.\d+)))?$/i;
const TIME_UNIT_BY_PERSISTED_VALUE = new Map<string, TimeUnit>(
    Object.values(TimeUnit).flatMap((unit) => [
        [unit, unit] as const,
        [formatTimeUnitShortCode(unit), unit] as const,
    ]).concat([
        ['second', TimeUnit.Second],
        ['minute', TimeUnit.Minute],
    ]),
);

export function decodePersistedTimeUnit(value: unknown): TimeUnit | undefined {
    return typeof value === 'string'
        ? TIME_UNIT_BY_PERSISTED_VALUE.get(value)
        : undefined;
}

export function decodeAxisRange(value: unknown): AxisRange | undefined {
    if (!isPlainObject(value)) return undefined;

    const { startTime, endTime } = value;
    if (!isFiniteNumber(startTime) || !isFiniteNumber(endTime)) {
        return undefined;
    }

    return createNonEmptyAxisRange(startTime, endTime);
}

export function encodeAxisRange(range: AxisRange): PersistedAxisRange {
    return {
        startTime: range.start,
        endTime: range.end,
    };
}

export function parseNumericExpression(
    value: string,
): ParsedNumericExpression | undefined {
    const text = value.trim();
    if (text === '') return undefined;

    const match = text.match(NUMERIC_EXPRESSION_PATTERN);
    if (match) {
        const amount = match[2] ? Number(match[2]) : 0;
        if (!Number.isFinite(amount) || amount < 0) return undefined;

        return match[1].toLowerCase() === 'first'
            ? { anchor: 'data_start', offset: amount }
            : { anchor: 'data_end', offset: amount };
    }

    const numericValue = Number(text);
    return Number.isFinite(numericValue)
        ? { anchor: 'value', value: numericValue }
        : undefined;
}

export function formatNumericExpression(
    expression: ParsedNumericExpression,
): string {
    switch (expression.anchor) {
        case 'value':
            return formatNumericValue(expression.value);
        case 'data_start':
            return expression.offset === 0
                ? 'first'
                : `first-${formatNumericValue(expression.offset)}`;
        case 'data_end':
            return expression.offset === 0
                ? 'last'
                : `last-${formatNumericValue(expression.offset)}`;
    }
}

export function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) return '';

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

export function parseAbsoluteTime(value: string): number | undefined {
    const parsed = moment(
        value.trim(),
        [DATE_TIME_FORMAT, moment.ISO_8601],
        true,
    );

    return parsed.isValid() ? parsed.valueOf() : undefined;
}

export { formatAbsoluteTime };

export function formatRelativeTime(
    anchor: 'now' | 'first' | 'last',
    amount: number,
    unit: TimeUnit,
): string {
    return amount <= 0
        ? anchor
        : `${anchor}${anchor === 'first' ? '+' : '-'}${amount}${formatTimeUnitShortCode(unit)}`;
}

export function isValidTimeExpression(value: string): boolean {
    const text = value.trim();
    if (text === '') return true;

    const match = text.match(RELATIVE_TIME_PATTERN);
    if (!match) return parseAbsoluteTime(text) !== undefined;

    const anchor = match[1].toLowerCase();
    const operator = match[2];
    const amount = match[3] === undefined ? 0 : Number(match[3]);
    const unit = match[4] === undefined
        ? TimeUnit.Millisecond
        : decodePersistedTimeUnit(match[4]);

    if (
        (anchor !== 'now' && anchor !== 'first' && anchor !== 'last') ||
        !Number.isFinite(amount) ||
        unit === undefined
    ) {
        return false;
    }

    return !(
        (anchor === 'first' && operator === '-') ||
        (anchor !== 'first' && operator === '+')
    );
}
