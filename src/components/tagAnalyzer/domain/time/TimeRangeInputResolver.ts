import moment from 'moment';
import {
    TimeUnit,
    type TimeRangeInput,
    type TimeRangeMs,
} from './TimeTypes';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from './TimeRangeUtils';
import { DATE_TIME_INPUT_FORMAT } from './TimeConstants';
import {
    formatTimeUnitShortCode,
    normalizeTimeUnit,
} from './TimeIntervalUtils';

export type TimeRangeInputResolutionOptions = {
    currentTime?: number;
    lastDataTime?: number;
};

export type TimeResolutionAnchors = {
    currentTime: number;
    lastDataTime: number | undefined;
};

const RELATIVE_TIME_PATTERN = /^([A-Za-z]+)(?:-(\d+)(ms|s|m|h|d|w|M|y))?$/;

/**
 * Resolve a board time range (raw expression strings) to a concrete millisecond
 * range, using the current time and the data anchor. Returns undefined when
 * either side is empty, references the data anchor without one, or is otherwise
 * unresolvable.
 */
export function resolveBoardTimeRangeInput(
    timeRangeInput: TimeRangeInput,
    options: TimeRangeInputResolutionOptions = {},
): TimeRangeMs | undefined {
    const sAnchors: TimeResolutionAnchors = {
        currentTime: normalizeTime(options.currentTime, moment().valueOf()),
        lastDataTime: normalizeOptionalTime(options.lastDataTime),
    };

    let sResolvedRange: TimeRangeMs;
    try {
        sResolvedRange = createTimeRangeMs(
            resolveTimeStringToTimestamp(timeRangeInput.start, sAnchors),
            resolveTimeStringToTimestamp(timeRangeInput.end, sAnchors),
        );
    } catch {
        return undefined;
    }

    return isValidTimeRange(sResolvedRange) ? sResolvedRange : undefined;
}

export function canResolveTimeStringToTimestamp(
    timeString: string,
    anchors: TimeResolutionAnchors,
): boolean {
    try {
        resolveTimeStringToTimestamp(timeString, anchors);
        return true;
    } catch {
        return false;
    }
}

export function resolveTimeStringToTimestamp(
    timeString: string,
    anchors: TimeResolutionAnchors,
): number {
    const sValue = timeString.trim();

    if (sValue === '') {
        throw new Error('Empty time expression cannot resolve to a timestamp.');
    }

    const sRelativeTimestamp = resolveRelativeTimeStringToTimestamp(
        sValue,
        anchors,
    );
    if (sRelativeTimestamp !== undefined) {
        return sRelativeTimestamp;
    }

    const sAbsolute = parseAbsoluteTimeExpression(sValue);
    if (sAbsolute === undefined) {
        throw new Error(`Invalid time expression: ${timeString}`);
    }

    return sAbsolute;
}

function resolveRelativeTimeStringToTimestamp(
    timeString: string,
    anchors: TimeResolutionAnchors,
): number | undefined {
    const sMatch = timeString.match(RELATIVE_TIME_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    const sAnchor = sMatch[1].toLowerCase();
    if (sAnchor !== 'now' && sAnchor !== 'last') {
        return undefined;
    }

    const sAmount = sMatch[2] ? Number(sMatch[2]) : 0;
    if (!Number.isFinite(sAmount)) {
        return undefined;
    }

    const sUnit = sMatch[3]
        ? normalizeTimeUnit(sMatch[3])
        : TimeUnit.Millisecond;
    if (!sUnit) {
        return undefined;
    }

    if (sAnchor === 'now') {
        return sAmount <= 0
            ? anchors.currentTime
            : subtractTimeUnit(anchors.currentTime, sAmount, sUnit);
    }

    if (anchors.lastDataTime === undefined) {
        throw new Error('Last time expression cannot resolve without a data time.');
    }

    return sAmount <= 0
        ? anchors.lastDataTime
        : subtractTimeUnit(anchors.lastDataTime, sAmount, sUnit);
}

function subtractTimeUnit(
    time: number,
    amount: number,
    unit: TimeUnit,
): number {
    switch (unit) {
        case TimeUnit.Millisecond:
            return moment(time).subtract(amount, 'millisecond').valueOf();
        case TimeUnit.Second:
            return moment(time).subtract(amount, 'second').valueOf();
        case TimeUnit.Minute:
            return moment(time).subtract(amount, 'minute').valueOf();
        case TimeUnit.Hour:
            return moment(time).subtract(amount, 'hour').valueOf();
        case TimeUnit.Day:
            return moment(time).subtract(amount, 'day').valueOf();
        case TimeUnit.Week:
            return moment(time).subtract(amount, 'week').valueOf();
        case TimeUnit.Month:
            return moment(time).subtract(amount, 'month').valueOf();
        case TimeUnit.Year:
            return moment(time).subtract(amount, 'year').valueOf();
    }
}

function normalizeTime(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeOptionalTime(value: number | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// --- Low-level time expression string formatting/parsing ----------------------
// Persisted source-of-truth strings: an absolute "YYYY-MM-DD HH:mm:ss" / ISO
// timestamp, or a "now"/"last" relative expression (resolved above).

export function parseAbsoluteTimeExpression(value: string): number | undefined {
    const sParsed = moment(
        value.trim(),
        [DATE_TIME_INPUT_FORMAT, moment.ISO_8601],
        true,
    );

    return sParsed.isValid() ? sParsed.valueOf() : undefined;
}

export function formatAbsoluteTimeExpression(timestamp: number): string {
    return moment(timestamp).format(DATE_TIME_INPUT_FORMAT);
}

export function formatRelativeTimeExpression(
    anchor: 'now' | 'last',
    amount: number,
    unit: TimeUnit,
): string {
    return amount <= 0
        ? anchor
        : `${anchor}-${amount}${formatTimeUnitShortCode(unit)}`;
}
