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

export type TimeBoundaryInputValue = string | number | '';

const RELATIVE_TIME_PATTERN = /^([A-Za-z]+)(?:-(\d+)(ms|s|m|h|d|w|M|y))?$/;

export function parseTimeRangeInputValue(value: string): TimeBoundary | undefined {
    if (value === '') {
        return { kind: 'empty' };
    }

    const sAnchoredBoundary = parseAnchoredTimeBoundary(value);
    if (sAnchoredBoundary) {
        return sAnchoredBoundary;
    }

    const sParsedMoment = moment(value, [DATE_TIME_INPUT_FORMAT, moment.ISO_8601], true);

    return sParsedMoment.isValid()
        ? {
              kind: 'absolute',
              timestamp: sParsedMoment.valueOf(),
          }
        : undefined;
}

export function parseTimeRangeConfigFromBoundaryValues(
    startValue: TimeBoundaryInputValue,
    endValue: TimeBoundaryInputValue,
): TimeRangeConfig {
    return {
        start: parseTimeBoundaryValue(startValue),
        end: parseTimeBoundaryValue(endValue),
    };
}

function parseTimeBoundaryValue(
    value: TimeBoundaryInputValue,
): TimeBoundary {
    if (value === '') {
        return { kind: 'empty' };
    }

    if (typeof value === 'number') {
        return {
            kind: 'absolute',
            timestamp: value,
        };
    }

    return parseTimeRangeInputValue(value) ?? { kind: 'empty' };
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
    const sBaseBoundary = {
        amount: sMatch[2] ? Number.parseInt(sMatch[2], 10) : 0,
        unit: sUnit,
    };

    return sKind === 'now'
        ? {
              kind: 'now',
              ...sBaseBoundary,
          }
        : {
              kind: 'last',
              ...sBaseBoundary,
          };
}

