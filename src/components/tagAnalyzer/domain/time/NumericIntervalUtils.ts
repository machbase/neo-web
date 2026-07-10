import type { TimeRangeMs } from './TimeTypes';
import { getTimeRangeWidth } from './TimeRangeUtils';

const NUMERIC_INTERVAL_STEPS = [1, 2, 5, 10] as const;

export function resolveNumericIntervalValue(
    rangeWidth: number,
    targetCount: number,
): number {
    if (
        !Number.isFinite(rangeWidth) ||
        !Number.isFinite(targetCount) ||
        rangeWidth <= 0 ||
        targetCount <= 0
    ) {
        return 0;
    }

    return Math.max(1, roundUpToNiceNumericInterval(rangeWidth / targetCount));
}

export function resolveNumericIntervalForRange(
    range: TimeRangeMs,
    targetCount: number,
): number {
    return resolveNumericIntervalValue(getTimeRangeWidth(range), targetCount);
}

export function formatNumericIntervalValue(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return '';
    }

    const sInterval = Math.max(1, value);

    if (Math.abs(sInterval) >= 1000) {
        return `${formatNumericIntervalNumber(sInterval / 1000)}k`;
    }

    return formatNumericIntervalNumber(sInterval);
}

function roundUpToNiceNumericInterval(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    const sMagnitude = 10 ** Math.floor(Math.log10(value));
    const sNormalizedValue = value / sMagnitude;
    const sStep =
        NUMERIC_INTERVAL_STEPS.find((step) => sNormalizedValue <= step) ?? 10;

    return normalizeNumericInterval(sStep * sMagnitude);
}

function normalizeNumericInterval(value: number): number {
    return Number(value.toPrecision(12));
}

function formatNumericIntervalNumber(value: number): string {
    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(6)));
}
