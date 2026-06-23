import moment from 'moment';
import {
    TimeUnit,
    type AbsoluteTimeBoundary,
    type EmptyTimeBoundary,
    type LastTimeBoundary,
    type NowTimeBoundary,
    type TimeBoundary,
    type TimeRangeConfig,
} from '../model/TimeTypes';
import { DATE_TIME_INPUT_FORMAT } from '../formatting/TimeInputFormatters';
import { normalizeTimeUnit, formatTimeUnitShortCode } from '../interval/TimeIntervalUtils';
import { createTimeRangeConfig } from '../range/TimeRangeUtils';

// Handles persisted/user time-boundary expressions such as empty, absolute, now, and last-1h.
export type TimeBoundaryInputValue = string | number;

const RELATIVE_TIME_PATTERN = /^([A-Za-z]+)(?:-(\d+)(ms|s|m|h|d|w|M|y))?$/;

export function createEmptyTimeBoundary(): EmptyTimeBoundary {
    return { kind: 'empty' };
}

export function createAbsoluteTimeBoundary(
    timestamp: number,
): AbsoluteTimeBoundary {
    return {
        kind: 'absolute',
        timestamp,
    };
}

export function createAnchoredTimeBoundary(
    kind: NowTimeBoundary['kind'] | LastTimeBoundary['kind'],
    amount: number,
    unit: TimeUnit,
): NowTimeBoundary | LastTimeBoundary {
    return kind === 'now'
        ? {
              kind: 'now',
              amount,
              unit,
          }
        : {
              kind: 'last',
              amount,
              unit,
          };
}

export function formatTimeRangeInputValue(boundary: TimeBoundary): string {
    if (boundary.kind === 'empty') {
        return '';
    }

    if (boundary.kind === 'absolute') {
        return moment.unix(boundary.timestamp / 1000).format(DATE_TIME_INPUT_FORMAT);
    }

    if (boundary.amount <= 0) {
        return boundary.kind;
    }

    return `${boundary.kind}-${boundary.amount}${formatTimeUnitShortCode(boundary.unit)}`;
}

export function formatBoardRangeText(rangeConfig: TimeRangeConfig): string {
    if (
        rangeConfig.start.kind === 'empty' ||
        rangeConfig.end.kind === 'empty'
    ) {
        return '';
    }

    if (
        rangeConfig.start.kind === 'absolute' &&
        rangeConfig.end.kind === 'absolute'
    ) {
        if (
            rangeConfig.start.timestamp <= 0 ||
            rangeConfig.end.timestamp <= 0 ||
            rangeConfig.end.timestamp < rangeConfig.start.timestamp
        ) {
            return '';
        }

        const sStartText = moment(rangeConfig.start.timestamp).format(DATE_TIME_INPUT_FORMAT);
        const sEndText = moment(rangeConfig.end.timestamp).format(DATE_TIME_INPUT_FORMAT);

        return `${sStartText}~${sEndText}`;
    }

    return `${formatTimeRangeInputValue(rangeConfig.start)}~${formatTimeRangeInputValue(rangeConfig.end)}`;
}

export function parseTimeRangeInputValue(value: string): TimeBoundary | undefined {
    if (value === '') {
        return createEmptyTimeBoundary();
    }

    const sAnchoredBoundary = parseAnchoredTimeBoundary(value);
    if (sAnchoredBoundary) {
        return sAnchoredBoundary;
    }

    const sParsedMoment = moment(value, [DATE_TIME_INPUT_FORMAT, moment.ISO_8601], true);

    return sParsedMoment.isValid()
        ? createAbsoluteTimeBoundary(sParsedMoment.valueOf())
        : undefined;
}

export function parseTimeBoundaryInputValue(
    value: TimeBoundaryInputValue,
): TimeBoundary | undefined {
    if (value === '') {
        return createEmptyTimeBoundary();
    }

    if (typeof value === 'number') {
        return createAbsoluteTimeBoundary(value);
    }

    return parseTimeRangeInputValue(value);
}

export function parseTimeRangeConfigFromBoundaryValues(
    startValue: TimeBoundaryInputValue,
    endValue: TimeBoundaryInputValue,
): TimeRangeConfig {
    return createTimeRangeConfig(
        parseTimeBoundaryValue(startValue),
        parseTimeBoundaryValue(endValue),
    );
}

function parseTimeBoundaryValue(
    value: TimeBoundaryInputValue,
): TimeBoundary {
    return parseTimeBoundaryInputValue(value) ?? createEmptyTimeBoundary();
}

function parseAnchoredTimeBoundary(
    value: string,
): NowTimeBoundary | LastTimeBoundary | undefined {
    const sMatch = value.match(RELATIVE_TIME_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    const sKind = sMatch[1].toLowerCase();
    if (sKind !== 'now' && sKind !== 'last') {
        return undefined;
    }

    const sUnit = sMatch[3]
        ? normalizeTimeUnit(sMatch[3]) ?? TimeUnit.Millisecond
        : TimeUnit.Millisecond;
    return createAnchoredTimeBoundary(
        sKind,
        sMatch[2] ? Number.parseInt(sMatch[2], 10) : 0,
        sUnit,
    );
}
