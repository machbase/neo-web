import type {
    TimeRangeInput,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../domain/time/TimeRangeUtils';
import { resolveTimeStringToTimestamp } from '../domain/time/TimeRangeInputResolver';

// Resolves the editor's two time-range input strings ("now-1h", "now",
// "YYYY-MM-DD HH:mm:ss", "") into a concrete millisecond range. The expression
// strings are the source of truth; concrete times are derived at runtime.

export type ResolveEditableTimeRangeInputParams = {
    startValue: string;
    endValue: string;
    previousConcreteRange: TimeRangeMs;
    currentTime: number;
    lastDataTime: number;
};

export type EditableTimeRangeInputResolution =
    | {
          status: 'valid' | 'empty';
          rangeInput: TimeRangeInput;
          concreteRange: TimeRangeMs;
      }
    | { status: 'invalid' };

export function resolveEditableTimeRangeInput({
    startValue,
    endValue,
    previousConcreteRange,
    currentTime,
    lastDataTime,
}: ResolveEditableTimeRangeInputParams): EditableTimeRangeInputResolution {
    const sStart = startValue.trim();
    const sEnd = endValue.trim();
    const sStartInput = parseTimeInputToTimestamp(sStart, currentTime, lastDataTime);
    const sEndInput = parseTimeInputToTimestamp(sEnd, currentTime, lastDataTime);

    // Both fields blank: keep the previous concrete range as the fallback.
    if (sStartInput.status === 'empty' && sEndInput.status === 'empty') {
        return {
            status: 'empty',
            rangeInput: { start: '', end: '' },
            concreteRange: normalizeConcreteRange(previousConcreteRange, currentTime),
        };
    }

    // Partial (one side blank) or unparseable input cannot form a range.
    if (sStartInput.status !== 'valid' || sEndInput.status !== 'valid') {
        return { status: 'invalid' };
    }

    // Reject reversed or zero-width ranges (start must precede end).
    const sConcreteRange = createTimeRangeMs(sStartInput.timestamp, sEndInput.timestamp);
    if (!isValidTimeRange(sConcreteRange)) {
        return { status: 'invalid' };
    }

    return {
        status: 'valid',
        rangeInput: { start: sStart, end: sEnd },
        concreteRange: sConcreteRange,
    };
}

type ParsedTimeInput =
    | { status: 'valid'; timestamp: number }
    | { status: 'empty' | 'invalid' };

// Resolves a single, already-trimmed field expression to a timestamp: a blank
// string is 'empty'; an unparseable or non-finite expression is 'invalid'.
function parseTimeInputToTimestamp(
    expression: string,
    currentTime: number,
    lastDataTime: number,
): ParsedTimeInput {
    if (expression === '') {
        return { status: 'empty' };
    }

    try {
        const sResolvedTime = resolveTimeStringToTimestamp(expression, {
            currentTime,
            lastDataTime,
        });

        return Number.isFinite(sResolvedTime)
            ? { status: 'valid', timestamp: sResolvedTime }
            : { status: 'invalid' };
    } catch {
        return { status: 'invalid' };
    }
}

function normalizeConcreteRange(
    range: TimeRangeMs,
    currentTime: number,
): TimeRangeMs {
    if (isValidTimeRange(range)) {
        return range;
    }

    return createTimeRangeMs(currentTime - 1, currentTime);
}
