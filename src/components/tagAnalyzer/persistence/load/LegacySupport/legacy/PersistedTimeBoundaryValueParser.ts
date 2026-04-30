import moment from 'moment';
import type {
    LastTimeBoundary,
    NowTimeBoundary,
    TimeBoundary,
    TimeRangeConfig,
} from '../../../../time/TimeTypes';
import { TimeUnit } from '../../../../time/TimeTypes';
import { normalizeTimeUnit } from '../../../../time/TimeUnitUtils';

type PersistedTimeBoundaryValue = string | number | '';

const PERSISTED_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const RELATIVE_TIME_PATTERN = /^([A-Za-z]+)(?:-(\d+)(ms|s|m|h|d|w|M|y))?$/;

export function parsePersistedTimeRangeConfigFromBoundaryValues(
    startValue: PersistedTimeBoundaryValue,
    endValue: PersistedTimeBoundaryValue,
): TimeRangeConfig {
    return {
        start: parsePersistedTimeBoundaryValue(startValue),
        end: parsePersistedTimeBoundaryValue(endValue),
    };
}

function parsePersistedTimeBoundaryValue(
    value: PersistedTimeBoundaryValue,
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

    return parsePersistedTimeBoundaryText(value) ?? { kind: 'empty' };
}

function parsePersistedTimeBoundaryText(
    value: string,
): TimeBoundary | undefined {
    const sAnchoredBoundary = parseAnchoredTimeBoundary(value);
    if (sAnchoredBoundary) {
        return sAnchoredBoundary;
    }

    const sParsedMoment = moment(
        value,
        [PERSISTED_TIME_FORMAT, moment.ISO_8601],
        true,
    );

    return sParsedMoment.isValid()
        ? {
              kind: 'absolute',
              timestamp: sParsedMoment.valueOf(),
          }
        : undefined;
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


