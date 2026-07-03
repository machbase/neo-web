import type { PanelRangeInput, TimeRangeMs } from '../time/TimeTypes';
import { clampTimeRangeToBounds, isValidTimeRange } from '../time/TimeRangeUtils';
import {
    canResolveTimeStringToTimestamp,
    resolveTimeStringToTimestamp,
} from '../time/TimeRangeInputResolver';

function isEmptyPanelRangeExpression(value: string): boolean {
    return value.trim() === '';
}

export function isEmptyPanelRangeInput(rangeInput: PanelRangeInput): boolean {
    return (
        isEmptyPanelRangeExpression(rangeInput.start) &&
        isEmptyPanelRangeExpression(rangeInput.end)
    );
}

// A non-empty expression is valid for its axis kind when it can be interpreted as
// a concrete bound. An empty side is always valid (it means "no constraint").
export function isPanelRangeExpressionValidForAxis(
    value: string,
    isNumericAxis: boolean,
): boolean {
    if (isEmptyPanelRangeExpression(value)) {
        return true;
    }

    return isNumericAxis
        ? parseNumericRangeExpression(value) !== undefined
        : isValidTimestampRangeExpression(value);
}

export function isPanelRangeInputValidForAxis(
    rangeInput: PanelRangeInput,
    isNumericAxis: boolean,
): boolean {
    return (
        isPanelRangeExpressionValidForAxis(rangeInput.start, isNumericAxis) &&
        isPanelRangeExpressionValidForAxis(rangeInput.end, isNumericAxis)
    );
}

export function isValidTimestampRangeExpression(value: string): boolean {
    const sValue = value.trim();
    if (sValue === '') {
        return true;
    }

    return canResolveTimeStringToTimestamp(sValue, {
        currentTime: 0,
        lastDataTime: 0,
    });
}

// --- Numeric (double) x-axis expressions --------------------------------------
// Parsed form is transient (used only to resolve/validate/canonicalize the string
// vocabulary); the persisted source of truth is always the string.

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
    return Number.isFinite(sValue) ? { anchor: 'value', value: sValue } : undefined;
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

// Statically reject inverted same-anchor pairs (e.g. "last" → "last-5"). Mixed
// anchors cannot be ordered without the data range, so they pass here and are
// validated against the resolved concrete range instead.
export function isValidNumericRangeExpressionPair(
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

export function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) {
        return '';
    }

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

// --- Resolving range input strings to a concrete millisecond range ------------

export function resolvePanelRangeInput(
    rangeInput: PanelRangeInput,
    fullRange: TimeRangeMs,
    isNumericAxis: boolean,
): TimeRangeMs | undefined {
    if (isEmptyPanelRangeInput(rangeInput)) {
        return undefined;
    }

    return isNumericAxis
        ? resolveNumericRangeInput(rangeInput, fullRange)
        : resolveTimestampRangeInput(rangeInput, fullRange);
}

// The datetime panel axis shares the board's expression vocabulary: "now"/"now-1h"
// resolve against the current time, "last"/"last-2d" against the data end.
function resolveTimestampRangeInput(
    rangeInput: PanelRangeInput,
    fullRange: TimeRangeMs,
): TimeRangeMs | undefined {
    const sAnchors = {
        currentTime: Date.now(),
        lastDataTime: fullRange.endTime,
    };

    let startTime: number;
    let endTime: number;
    try {
        startTime = isEmptyPanelRangeExpression(rangeInput.start)
            ? fullRange.startTime
            : resolveTimeStringToTimestamp(rangeInput.start, sAnchors);
        endTime = isEmptyPanelRangeExpression(rangeInput.end)
            ? fullRange.endTime
            : resolveTimeStringToTimestamp(rangeInput.end, sAnchors);
    } catch {
        return undefined;
    }

    const sResolvedRange = { startTime, endTime };
    return isValidTimeRange(sResolvedRange) ? sResolvedRange : undefined;
}

function resolveNumericRangeInput(
    rangeInput: PanelRangeInput,
    fullRange: TimeRangeMs,
): TimeRangeMs | undefined {
    const sStart = parseNumericRangeExpression(rangeInput.start);
    const sEnd = parseNumericRangeExpression(rangeInput.end);

    if (!sStart && !isEmptyPanelRangeExpression(rangeInput.start)) {
        return undefined;
    }

    if (!sEnd && !isEmptyPanelRangeExpression(rangeInput.end)) {
        return undefined;
    }

    const sResolvedRange = {
        startTime: sStart
            ? resolveNumericExpression(sStart, fullRange)
            : fullRange.startTime,
        endTime: sEnd
            ? resolveNumericExpression(sEnd, fullRange)
            : fullRange.endTime,
    };
    if (!isValidTimeRange(sResolvedRange)) {
        return undefined;
    }

    if (usesNumericDataAnchor(sStart, sEnd)) {
        return clampTimeRangeToBounds(sResolvedRange, fullRange);
    }

    return sResolvedRange;
}

function resolveNumericExpression(
    parsed: ParsedNumericRangeExpression,
    fullRange: TimeRangeMs,
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

function usesNumericDataAnchor(
    start: ParsedNumericRangeExpression | undefined,
    end: ParsedNumericRangeExpression | undefined,
): boolean {
    return (
        (start !== undefined && start.anchor !== 'value') ||
        (end !== undefined && end.anchor !== 'value')
    );
}
