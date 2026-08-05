import {
    type AxisRange,
    type RangeExpressionInput,
} from '../rangeModel';
import {
    clampRangeToBounds,
    getRangeWidth,
    isValidRange,
} from '../rangeArithmetic';

const COMPACT_NUMBER_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
] as const;

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});

const NUMERIC_COMPACT_VISIBLE_SPAN_THRESHOLD = 10_000;

const NUMERIC_MAX_FRACTION_DIGITS = 8;

export const NUMERIC_RANGE_EXPRESSION_PLACEHOLDER =
    '20, first, first-10, last-10';

const STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS = new Map<
    number,
    Intl.NumberFormat
>([[4, new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })]]);

const NUMERIC_QUICK_RANGE_SIZES = [
    [10, '10'],
    [100, '100'],
    [1_000, '1000'],
    [10_000, '10k'],
    [100_000, '100k'],
    [1_000_000, '1m'],
    [10_000_000, '10m'],
] as const;

function createNumericQuickRangeOptions(anchor: 'first' | 'last') {
    const namePrefix = anchor === 'first' ? 'First' : 'Last';

    return NUMERIC_QUICK_RANGE_SIZES.map(([size, label]) => {
        const offsetExpression = `${anchor}-${size}`;
        return {
            key: offsetExpression,
            name: `${namePrefix} ${label}`,
            value: anchor === 'first'
                ? [anchor, offsetExpression]
                : [offsetExpression, anchor],
        };
    });
}

export const NUMERIC_QUICK_RANGE_OPTIONS = [
    createNumericQuickRangeOptions('first'),
    createNumericQuickRangeOptions('last'),
];

type ParsedNumericRangeExpression =
    | { anchor: 'value'; value: number }
    | { anchor: 'data_start'; offset: number }
    | { anchor: 'data_end'; offset: number };

const NUMERIC_ANCHORED_EXPRESSION_PATTERN =
    /^(first|last)(?:-((?:\d+\.?\d*)|(?:\.\d+)))?$/i;

export function parseNumericRangeExpression(
    value: string,
): ParsedNumericRangeExpression | undefined {
    const sText = value.trim();
    if (sText === '') {
        return undefined;
    }

    const sMatch = sText.match(NUMERIC_ANCHORED_EXPRESSION_PATTERN);
    if (sMatch) {
        const sAmount = sMatch[2] ? Number(sMatch[2]) : 0;
        if (!Number.isFinite(sAmount) || sAmount < 0) {
            return undefined;
        }

        return sMatch[1].toLowerCase() === 'first'
            ? { anchor: 'data_start', offset: sAmount }
            : { anchor: 'data_end', offset: sAmount };
    }

    const sValue = Number(sText);
    return Number.isFinite(sValue)
        ? { anchor: 'value', value: sValue }
        : undefined;
}

export function formatNumericRangeExpression(
    parsed: ParsedNumericRangeExpression,
): string {
    switch (parsed.anchor) {
        case 'value':
            return formatNumericValue(parsed.value);
        case 'data_start':
            return parsed.offset === 0
                ? 'first'
                : `first-${formatNumericValue(parsed.offset)}`;
        case 'data_end':
            return parsed.offset === 0
                ? 'last'
                : `last-${formatNumericValue(parsed.offset)}`;
    }
}

function isValidNumericRangeExpressionPair(
    start: ParsedNumericRangeExpression,
    end: ParsedNumericRangeExpression,
): boolean {
    if (start.anchor === 'value' && end.anchor === 'value') {
        return start.value < end.value;
    }

    if (start.anchor === 'data_start' && end.anchor === 'data_start') {
        return start.offset < end.offset;
    }

    if (start.anchor === 'data_end' && end.anchor === 'data_end') {
        return start.offset > end.offset;
    }

    return true;
}

export function normalizeNumericRangeInput(
    rangeInput: RangeExpressionInput,
    allowEmpty: boolean,
): RangeExpressionInput | undefined {
    const sStartValue = rangeInput.start.trim();
    const sEndValue = rangeInput.end.trim();

    if (sStartValue === '' && sEndValue === '') {
        return allowEmpty ? { start: '', end: '' } : undefined;
    }

    const sStart = parseNumericRangeExpression(sStartValue);
    const sEnd = parseNumericRangeExpression(sEndValue);
    if (!sStart || !sEnd || !isValidNumericRangeExpressionPair(sStart, sEnd)) {
        return undefined;
    }

    return {
        start: formatNumericRangeExpression(sStart),
        end: formatNumericRangeExpression(sEnd),
    };
}

export function resolveNumericRangeInput(
    rangeInput: RangeExpressionInput,
    fullRange: AxisRange,
): AxisRange | undefined {
    const sStart = parseNumericRangeExpression(rangeInput.start);
    const sEnd = parseNumericRangeExpression(rangeInput.end);

    if (
        (!sStart && rangeInput.start.trim() !== '') ||
        (!sEnd && rangeInput.end.trim() !== '')
    ) {
        return undefined;
    }

    const sResolvedRange: AxisRange = {
        startTime: sStart
            ? resolveNumericExpression(sStart, fullRange)
            : fullRange.startTime,
        endTime: sEnd
            ? resolveNumericExpression(sEnd, fullRange)
            : fullRange.endTime,
    };
    if (!isValidRange(sResolvedRange)) {
        return undefined;
    }

    if (
        [sStart, sEnd].some(
            (expression) =>
                expression !== undefined && expression.anchor !== 'value',
        )
    ) {
        return clampRangeToBounds(sResolvedRange, fullRange);
    }

    return sResolvedRange;
}

function resolveNumericExpression(
    parsed: ParsedNumericRangeExpression,
    fullRange: AxisRange,
): number {
    switch (parsed.anchor) {
        case 'value':
            return parsed.value;
        case 'data_start':
            return fullRange.startTime + parsed.offset;
        case 'data_end':
            return fullRange.endTime - parsed.offset;
    }
}

export function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) {
        return '';
    }

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

export function formatNumericRange(range: AxisRange) {
    return {
        start: formatNumericAxisLabel(range.startTime, range),
        end: formatNumericAxisLabel(range.endTime, range),
    };
}

export function formatNumericInterval(
    numericInterval: number | undefined,
): string {
    if (
        numericInterval === undefined ||
        !Number.isFinite(numericInterval) ||
        numericInterval <= 0
    ) {
        return '';
    }

    const sInterval = Math.max(1, numericInterval);
    const sUsesThousands = Math.abs(sInterval) >= 1000;
    const sDisplayInterval = sUsesThousands
        ? sInterval / 1000
        : sInterval;
    const sFormattedInterval = Number.isInteger(sDisplayInterval)
        ? String(sDisplayInterval)
        : String(Number(sDisplayInterval.toPrecision(6)));

    return sUsesThousands ? `${sFormattedInterval}k` : sFormattedInterval;
}

export function formatNumericAxisLabel(
    value: number | string,
    visibleRange?: AxisRange,
): string {
    const sNumericValue = Number(value);

    if (!Number.isFinite(sNumericValue)) {
        return String(value);
    }

    const sNormalizedValue = Object.is(sNumericValue, -0) ? 0 : sNumericValue;
    const sAbsoluteValue = Math.abs(sNormalizedValue);
    const sUnitIndex = COMPACT_NUMBER_UNITS.findIndex(
        (unit) => sAbsoluteValue >= unit.value,
    );
    const sRangeWidth = visibleRange ? getRangeWidth(visibleRange) : 0;
    const sVisibleSpan =
        Number.isFinite(sRangeWidth) && sRangeWidth > 0
            ? sRangeWidth
            : undefined;

    if (
        sUnitIndex === -1 ||
        (sVisibleSpan !== undefined &&
            sVisibleSpan < NUMERIC_COMPACT_VISIBLE_SPAN_THRESHOLD)
    ) {
        const sFractionDigits = getNumericAxisFractionDigits(sVisibleSpan);
        return getStandardNumberFormatter(sFractionDigits).format(
            sNormalizedValue,
        );
    }

    const sUnit =
        COMPACT_NUMBER_UNITS[
            shouldUseNextLargerNumericUnit(sAbsoluteValue, sUnitIndex)
                ? sUnitIndex - 1
                : sUnitIndex
        ];

    return `${COMPACT_NUMBER_FORMATTER.format(
        sNormalizedValue / sUnit.value,
    )}${sUnit.suffix}`;
}

function shouldUseNextLargerNumericUnit(
    absoluteValue: number,
    unitIndex: number,
): boolean {
    if (unitIndex <= 0) {
        return false;
    }

    const sRoundedScaledValue =
        Math.round(
            (absoluteValue / COMPACT_NUMBER_UNITS[unitIndex].value) * 10,
        ) / 10;

    return sRoundedScaledValue >= 1000;
}

function getStandardNumberFormatter(
    fractionDigits: number,
): Intl.NumberFormat {
    const sExistingFormatter =
        STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS.get(fractionDigits);

    if (sExistingFormatter) {
        return sExistingFormatter;
    }

    const sFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: fractionDigits,
    });
    STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS.set(
        fractionDigits,
        sFormatter,
    );

    return sFormatter;
}

function getNumericAxisFractionDigits(
    visibleSpan: number | undefined,
): number {
    if (visibleSpan === undefined) {
        return 4;
    }

    if (visibleSpan >= 100) {
        return 0;
    }

    if (visibleSpan >= 10) {
        return 1;
    }

    if (visibleSpan >= 1) {
        return 2;
    }

    const sFractionDigits =
        Math.ceil(Math.abs(Math.log10(visibleSpan))) + 2;
    return Math.min(sFractionDigits, NUMERIC_MAX_FRACTION_DIGITS);
}
