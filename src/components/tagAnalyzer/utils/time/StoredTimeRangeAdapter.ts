import type { ValueRange, ValueRangePair } from '../../TagAnalyzerCommonTypes';
import type {
    ResolvedTimeBounds,
    TimeBoundary,
    TimeRangeConfig,
    TimeRangeMs,
} from './types/TimeTypes';
import {
    normalizeTimeRangeConfig,
    parseTimeRangeInputValue,
} from './TimeBoundaryParsing';

export type StoredTimeValue = string | number | '';

export type StoredTimeRangeInput = {
    bgn: StoredTimeValue;
    end: StoredTimeValue;
};

export type StoredTimeRangeSource =
    | {
          range: ValueRange | TimeRangeMs;
      }
    | {
          range: ValueRange | TimeRangeMs;
          rangeConfig: TimeRangeConfig;
      };

export type StoredTimeBoundaryRanges = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

export function normalizeStoredTimeBoundaryRanges(
    timeRange: StoredTimeBoundaryRanges | undefined,
): ValueRangePair | undefined {
    if (!timeRange) {
        return undefined;
    }

    const sStartRange = storedMinMaxPairToRange(timeRange.bgn_min, timeRange.bgn_max);
    const sEndRange = storedMinMaxPairToRange(timeRange.end_min, timeRange.end_max);
    if (!sStartRange || !sEndRange) {
        return undefined;
    }

    return {
        start: sStartRange,
        end: sEndRange,
    };
}

export function normalizeStoredTimeRangeBoundary(
    startValue: StoredTimeValue | undefined,
    endValue: StoredTimeValue | undefined,
): ResolvedTimeBounds {
    return normalizeTimeRangeConfig({
        start: normalizeStoredTimeBoundary(startValue),
        end: normalizeStoredTimeBoundary(endValue),
    });
}

export function toStoredTimeRangeInput(source: StoredTimeRangeSource): StoredTimeRangeInput {
    const sRange = source.range;
    const sRangeConfig = 'rangeConfig' in source ? source.rangeConfig : undefined;

    return 'startTime' in sRange
        ? {
              bgn: sRangeConfig ? toStoredTimeValue(sRangeConfig.start) : sRange.startTime,
              end: sRangeConfig ? toStoredTimeValue(sRangeConfig.end) : sRange.endTime,
          }
        : {
              bgn: sRangeConfig ? toStoredTimeValue(sRangeConfig.start) : sRange.min,
              end: sRangeConfig ? toStoredTimeValue(sRangeConfig.end) : sRange.max,
          };
}

export function toStoredTimeValue(boundary: TimeBoundary): StoredTimeValue {
    switch (boundary.kind) {
        case 'empty':
            return '';
        case 'absolute':
            return boundary.timestamp;
        case 'relative':
            return boundary.expression;
        case 'raw':
            return boundary.value;
    }
}

function storedMinMaxPairToRange(
    min: string | number | undefined,
    max: string | number | undefined,
): ValueRange | undefined {
    if (typeof min !== 'number' || typeof max !== 'number') {
        return undefined;
    }

    return {
        min: min,
        max: max,
    };
}

function normalizeStoredTimeBoundary(value: StoredTimeValue | undefined): TimeBoundary {
    if (value === '' || value === undefined) {
        return { kind: 'empty' };
    }

    if (typeof value === 'number') {
        return {
            kind: 'absolute',
            timestamp: value,
        };
    }

    const sParsedBoundary = parseTimeRangeInputValue(value);
    if (sParsedBoundary) {
        return sParsedBoundary;
    }

    return {
        kind: 'raw',
        value: value,
    };
}
