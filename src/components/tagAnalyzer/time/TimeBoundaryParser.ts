import moment from 'moment';
import type {
    LastTimeBoundary,
    NowTimeBoundary,
    TimeBoundary,
    TimeRangeConfig,
} from './TimeTypes';
import { DATE_TIME_INPUT_FORMAT } from './TimeInputFormatters';
import { TimeUnit } from './TimeTypes';
import { normalizeTimeUnit } from './TimeUnitUtils';
import {
    createAbsoluteTimeBoundary,
    createAnchoredTimeBoundary,
    createEmptyTimeBoundary,
} from './TimeBoundaryFactories';
import { createTimeRangeConfig } from './TimeRangeUtils';

export type TimeBoundaryInputValue = string | number;

const RELATIVE_TIME_PATTERN = /^([A-Za-z]+)(?:-(\d+)(ms|s|m|h|d|w|M|y))?$/;

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

