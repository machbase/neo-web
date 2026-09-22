import moment from 'moment';
import {
    isDistanceAnchorEdge,
    resolveDistanceEdge,
} from '@/utils/distanceRange';
import { fitRangeWithinBounds } from './rangeArithmetic';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from './rangeModel';

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

export function parseRangeInputValue(
    value: string,
    axisKind: AxisKind,
): number | undefined {
    const text = value.trim();
    if (text === '') return undefined;

    if (axisKind === 'numeric') {
        const numericValue = Number(text);
        return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    const localDateMatch = LOCAL_DATE_TIME_PATTERN.exec(text);
    if (localDateMatch) {
        const parts = [
            Number(localDateMatch[1]),
            localDateMatch[2] ? Number(localDateMatch[2]) : 1,
            localDateMatch[3] ? Number(localDateMatch[3]) : 1,
            localDateMatch[4] ? Number(localDateMatch[4]) : 0,
            localDateMatch[5] ? Number(localDateMatch[5]) : 0,
            localDateMatch[6] ? Number(localDateMatch[6]) : 0,
            Number((localDateMatch[7] || '0').padEnd(3, '0')),
        ] as const;
        const [year, month, day, hour, minute, second, millisecond] = parts;
        if (
            parts.every(Number.isInteger) &&
            month >= 1 &&
            month <= 12 &&
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59 &&
            second >= 0 &&
            second <= 59 &&
            millisecond >= 0 &&
            millisecond <= 999
        ) {
            const timestamp = new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                millisecond,
            ).getTime();
            const date = new Date(timestamp);
            const resolvedParts = [
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds(),
            ];

            if (resolvedParts.every((part, index) => part === parts[index])) {
                return timestamp;
            }
        }

        return undefined;
    }

    if (INTEGER_TIMESTAMP_PATTERN.test(text)) {
        const timestamp = Number(text);
        return Number.isSafeInteger(timestamp) ? timestamp : undefined;
    }

    const timestamp = moment(text, moment.ISO_8601, true);
    return timestamp.isValid() ? timestamp.valueOf() : undefined;
}

// -------------------- Local --------------------

const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})(?:-(\d{0,2})(?:-(\d{0,2})(?:[ T](\d{0,2})(?::(\d{0,2})(?::(\d{0,2})(?:\.(\d{0,3}))?)?)?)?)?)?$/;
const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

const TIME_EXPRESSION_PATTERN =
    /^([A-Za-z]+)(?:([+-])(\d+)(ms|s|m|h|d|w|M|y))?$/;
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
    const resolvedValue = resolveDistanceEdge(value, {
        min: fullRange.start,
        max: fullRange.end,
    });
    return resolvedValue === null
        ? undefined
        : { value: resolvedValue, anchored: isDistanceAnchorEdge(value) };
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
