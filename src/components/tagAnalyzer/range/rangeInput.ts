import moment from 'moment';
import { parseRangeInputValue } from '../format/inputFormat';
import { fitRangeWithinBounds } from './rangeArithmetic';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from './rangeModel';

const TIME_EXPRESSION_PATTERN =
    /^([A-Za-z]+)(?:([+-])(\d+)(ms|s|m|h|d|w|M|y))?$/;
const NUMERIC_EXPRESSION_PATTERN =
    /^(first|last)(?:-((?:\d+\.?\d*)|(?:\.\d+)))?$/i;
const TIME_UNIT_BY_SHORT_CODE = {
    ms: 'millisecond',
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
    y: 'year',
} as const;

type ResolvedEndpoint = {
    value: number;
    anchored: boolean;
};

export function resolveRangeInput(
    input: RangeExpressionInput,
    axisKind: AxisKind,
    fullRange: AxisRange,
    currentRange: AxisRange,
    referenceTimeMs = Date.now(),
): AxisRange | undefined {
    if (isRangeExpressionEmpty(input)) {
        return undefined;
    }

    const currentTime = axisKind === 'time' ? referenceTimeMs : 0;
    const start = resolveEndpoint(
        input.start,
        axisKind,
        fullRange,
        currentRange.start,
        currentTime,
    );
    const end = resolveEndpoint(
        input.end,
        axisKind,
        fullRange,
        currentRange.end,
        currentTime,
    );

    if (
        !start ||
        !end ||
        !Number.isFinite(start.value) ||
        !Number.isFinite(end.value) ||
        start.value >= end.value
    ) {
        return undefined;
    }

    const range = { start: start.value, end: end.value };
    return axisKind === 'numeric' && (start.anchored || end.anchored)
        ? fitRangeWithinBounds(range, fullRange)
        : range;
}

function resolveEndpoint(
    value: string,
    axisKind: AxisKind,
    fullRange: AxisRange,
    currentValue: number,
    currentTime: number,
): ResolvedEndpoint | undefined {
    const text = value.trim();
    if (text === '') {
        return { value: currentValue, anchored: false };
    }

    return axisKind === 'numeric'
        ? resolveNumericEndpoint(text, fullRange)
        : resolveTimeEndpoint(text, fullRange, currentTime);
}

function resolveNumericEndpoint(
    value: string,
    fullRange: AxisRange,
): ResolvedEndpoint | undefined {
    const match = value.match(NUMERIC_EXPRESSION_PATTERN);
    if (!match) {
        const parsedValue = parseRangeInputValue(value, 'numeric');
        return parsedValue === undefined
            ? undefined
            : { value: parsedValue, anchored: false };
    }

    const amount = match[2] ? Number(match[2]) : 0;
    const isFirst = match[1].toLowerCase() === 'first';
    return {
        value: isFirst
            ? fullRange.start + amount
            : fullRange.end - amount,
        anchored: true,
    };
}

function resolveTimeEndpoint(
    value: string,
    fullRange: AxisRange,
    currentTime: number,
): ResolvedEndpoint | undefined {
    const match = value.match(TIME_EXPRESSION_PATTERN);
    const anchor = match?.[1].toLowerCase();
    if (!match || (anchor !== 'now' && anchor !== 'first' && anchor !== 'last')) {
        const parsedValue = parseRangeInputValue(value, 'time');
        return parsedValue === undefined
            ? undefined
            : { value: parsedValue, anchored: false };
    }

    const operator = match[2];
    if (
        (anchor === 'first' && operator === '-') ||
        (anchor !== 'first' && operator === '+')
    ) {
        return undefined;
    }

    const anchorValue = anchor === 'now'
        ? currentTime
        : anchor === 'first'
          ? fullRange.start
          : fullRange.end;
    const amount = match[3] ? Number(match[3]) : 0;
    const unit = match[4] as keyof typeof TIME_UNIT_BY_SHORT_CODE | undefined;
    const resolvedValue = unit === undefined
        ? anchorValue
        : anchor === 'first'
          ? moment(anchorValue).add(amount, TIME_UNIT_BY_SHORT_CODE[unit]).valueOf()
          : moment(anchorValue).subtract(amount, TIME_UNIT_BY_SHORT_CODE[unit]).valueOf();

    return { value: resolvedValue, anchored: true };
}
