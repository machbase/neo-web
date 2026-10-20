import moment from 'moment';
import { parseDistanceAnchor, parseDistanceValue } from '@/utils/distanceRange';
import { formatNumericValue, formatTimeUnitShortCode } from './expressionFormat';
import { TimeUnit } from './intervalResolver';

export type ParsedNumericExpression =
    | { anchor: 'value'; value: number }
    | { anchor: 'data_start'; offset: number }
    | { anchor: 'data_end'; offset: number };

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const RELATIVE_TIME_PATTERN =
    /^([A-Za-z]+)(?:([+-])(\d+)(ms|s|m|h|d|w|M|y))?$/;
const TIME_UNIT_BY_SHORT_CODE = new Map(
    Object.values(TimeUnit).map((unit) => [formatTimeUnitShortCode(unit), unit]),
);

export function parseNumericExpression(
    value: string,
): ParsedNumericExpression | undefined {
    const text = value.trim();
    if (text === '') return undefined;

    const anchored = parseDistanceAnchor(text);
    if (anchored) {
        return {
            anchor: anchored.anchor === 'first' ? 'data_start' : 'data_end',
            offset: anchored.offset,
        };
    }

    const numericValue = parseDistanceValue(text);
    return numericValue !== null
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
                : `first${formatNumericOffset(expression.offset)}`;
        case 'data_end':
            return expression.offset === 0
                ? 'last'
                : `last${formatNumericOffset(expression.offset)}`;
    }
}

function formatNumericOffset(offset: number): string {
    return `${offset < 0 ? '-' : '+'}${formatNumericValue(Math.abs(offset))}`;
}

export function parseAbsoluteTime(value: string): number | undefined {
    const parsed = moment(
        value.trim(),
        [DATE_TIME_FORMAT, moment.ISO_8601],
        true,
    );

    return parsed.isValid() ? parsed.valueOf() : undefined;
}

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
        : TIME_UNIT_BY_SHORT_CODE.get(match[4]);

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
