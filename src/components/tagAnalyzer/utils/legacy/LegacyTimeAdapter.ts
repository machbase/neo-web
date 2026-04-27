import type { ValueRange, ValueRangePair } from '../../TagAnalyzerCommonTypes';
import type {
    ResolvedTimeBounds,
    TimeBoundary,
} from '../time/types/TimeTypes';
import {
    normalizeTimeRangeConfig,
    parseTimeRangeInputValue,
} from '../time/TimeBoundaryParsing';
import type {
    LegacyBgnEndTimeRange,
    LegacyTimeRangeSource,
    LegacyTimeRangeInput,
    LegacyTimeValue,
} from './LegacyTypes';

/**
 * Converts legacy boundary pairs into modern range pairs.
 * Intent: Read persisted min/max boundary data into the shared range model.
 * @param {LegacyBgnEndTimeRange | undefined} timeRange - The legacy boundary pair to normalize.
 * @returns {ValueRangePair | undefined} The normalized range pair, or `undefined` when incomplete.
 */
export function normalizeLegacyTimeBoundaryRanges(
    timeRange: LegacyBgnEndTimeRange | undefined,
): ValueRangePair | undefined {
    if (!timeRange) {
        return undefined;
    }

    const sStartRange = legacyMinMaxPairToRange(timeRange.bgn_min, timeRange.bgn_max);
    const sEndRange = legacyMinMaxPairToRange(timeRange.end_min, timeRange.end_max);
    if (!sStartRange || !sEndRange) {
        return undefined;
    }

    return {
        start: sStartRange,
        end: sEndRange,
    };
}

/**
 * Converts legacy start and end values into resolved time bounds.
 * Intent: Centralize legacy time-range parsing and normalization.
 * @param {LegacyTimeValue | undefined} startValue - The legacy start value.
 * @param {LegacyTimeValue | undefined} endValue - The legacy end value.
 * @returns {ResolvedTimeBounds} The resolved time bounds.
 */
export function normalizeLegacyTimeRangeBoundary(
    startValue: LegacyTimeValue | undefined,
    endValue: LegacyTimeValue | undefined,
): ResolvedTimeBounds {
    return normalizeTimeRangeConfig({
        start: normalizeLegacyTimeBoundary(startValue),
        end: normalizeLegacyTimeBoundary(endValue),
    });
}

/**
 * Serializes a time-range source into legacy input fields.
 * Intent: Preserve the legacy boundary shape when saving range data.
 * @param {LegacyTimeRangeSource} source - The time-range source to convert.
 * @returns {LegacyTimeRangeInput} The legacy input payload.
 */
export function toLegacyTimeRangeInput(source: LegacyTimeRangeSource): LegacyTimeRangeInput {
    const sRange = source.range;
    const sRangeConfig = 'rangeConfig' in source ? source.rangeConfig : undefined;

    return 'startTime' in sRange
        ? {
              bgn: sRangeConfig ? toLegacyTimeValue(sRangeConfig.start) : sRange.startTime,
              end: sRangeConfig ? toLegacyTimeValue(sRangeConfig.end) : sRange.endTime,
          }
        : {
              bgn: sRangeConfig ? toLegacyTimeValue(sRangeConfig.start) : sRange.min,
              end: sRangeConfig ? toLegacyTimeValue(sRangeConfig.end) : sRange.max,
          };
}

/**
 * Converts a time boundary into a legacy scalar value.
 * Intent: Encode the active boundary variant back into the storage format.
 * @param {TimeBoundary} boundary - The boundary to convert.
 * @returns {LegacyTimeValue} The legacy time value.
 */
export function toLegacyTimeValue(boundary: TimeBoundary): LegacyTimeValue {
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

/**
 * Converts legacy min and max values into a numeric range.
 * Intent: Reject incomplete range pairs before they reach the parser.
 * @param {string | number | undefined} min - The minimum boundary value.
 * @param {string | number | undefined} max - The maximum boundary value.
 * @returns {ValueRange | undefined} The numeric range, or `undefined` when either bound is invalid.
 */
function legacyMinMaxPairToRange(
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

/**
 * Converts one legacy time value into the shared structured boundary model.
 * Intent: Keep legacy storage parsing isolated inside the legacy adapter layer.
 * @param {LegacyTimeValue | undefined} value - The legacy time value to normalize.
 * @returns {TimeBoundary} The normalized boundary.
 */
function normalizeLegacyTimeBoundary(value: LegacyTimeValue | undefined): TimeBoundary {
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
