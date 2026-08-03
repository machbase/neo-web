import { getRangeWidth } from '../range/rangeArithmetic';
import type { AxisRange } from '../range/rangeModel';

const COMPACT_VISIBLE_SPAN_THRESHOLD = 10_000;
const MAX_FRACTION_DIGITS = 8;
const COMPACT_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
] as const;
const COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});
const STANDARD_FORMATTERS = new Map<number, Intl.NumberFormat>([
    [4, new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })],
]);

export function formatCompactNumber(
    value: number | string,
    visibleRange?: AxisRange,
): string {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return String(value);

    const normalizedValue = Object.is(numericValue, -0) ? 0 : numericValue;
    const absoluteValue = Math.abs(normalizedValue);
    const unitIndex = COMPACT_UNITS.findIndex(
        (unit) => absoluteValue >= unit.value,
    );
    const width = visibleRange ? getRangeWidth(visibleRange) : 0;
    const visibleSpan = Number.isFinite(width) && width > 0 ? width : undefined;

    if (
        unitIndex === -1 ||
        (visibleSpan !== undefined &&
            visibleSpan < COMPACT_VISIBLE_SPAN_THRESHOLD)
    ) {
        return getStandardFormatter(
            getFractionDigits(visibleSpan),
        ).format(normalizedValue);
    }

    const unit = COMPACT_UNITS[
        shouldUseLargerUnit(absoluteValue, unitIndex)
            ? unitIndex - 1
            : unitIndex
    ];
    return `${COMPACT_FORMATTER.format(normalizedValue / unit.value)}${unit.suffix}`;
}

export function formatNumericInterval(interval: number | undefined): string {
    if (interval === undefined || !Number.isFinite(interval) || interval <= 0) {
        return '';
    }

    const normalized = Math.max(1, interval);
    const usesThousands = Math.abs(normalized) >= 1000;
    const displayValue = usesThousands ? normalized / 1000 : normalized;
    const formatted = Number.isInteger(displayValue)
        ? String(displayValue)
        : String(Number(displayValue.toPrecision(6)));

    return usesThousands ? `${formatted}k` : formatted;
}

function shouldUseLargerUnit(
    absoluteValue: number,
    unitIndex: number,
): boolean {
    if (unitIndex <= 0) return false;

    const rounded = Math.round(
        (absoluteValue / COMPACT_UNITS[unitIndex].value) * 10,
    ) / 10;
    return rounded >= 1000;
}

function getStandardFormatter(fractionDigits: number): Intl.NumberFormat {
    const existing = STANDARD_FORMATTERS.get(fractionDigits);
    if (existing) return existing;

    const formatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: fractionDigits,
    });
    STANDARD_FORMATTERS.set(fractionDigits, formatter);
    return formatter;
}

function getFractionDigits(visibleSpan: number | undefined): number {
    if (visibleSpan === undefined) return 4;
    if (visibleSpan >= 100) return 0;
    if (visibleSpan >= 10) return 1;
    if (visibleSpan >= 1) return 2;

    return Math.min(
        Math.ceil(Math.abs(Math.log10(visibleSpan))) + 2,
        MAX_FRACTION_DIGITS,
    );
}
