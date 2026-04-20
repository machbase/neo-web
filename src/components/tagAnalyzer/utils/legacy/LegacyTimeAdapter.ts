import type {
    ResolvedTimeBounds,
    TimeBoundary,
    ValueRange,
    ValueRangePair,
} from '../time/timeTypes';
import {
    parseTimeRangeInputValue,
} from '../time/TimeRangeParsing';
import { normalizeTimeRangeConfig } from '../time/PanelTimeRangeResolver';
import type {
    LegacyBgnEndTimeRange,
    LegacyTimeRangeSource,
    LegacyTimeRangeInput,
    LegacyTimeValue,
} from './LegacyTypes';

/**
 * Converts legacy boundary pairs into modern range pairs.
 * Intent: Read persisted min/max boundary data into the shared range model.
 * @param {LegacyBgnEndTimeRange | undefined} aTimeRange - The legacy boundary pair to normalize.
 * @returns {ValueRangePair | undefined} The normalized range pair, or `undefined` when incomplete.
 */
export function normalizeLegacyTimeBoundaryRanges(
    aTimeRange: LegacyBgnEndTimeRange | undefined,
): ValueRangePair | undefined {
    if (!aTimeRange) {
        return undefined;
    }

    const sStartRange = legacyMinMaxPairToRange(aTimeRange.bgn_min, aTimeRange.bgn_max);
    const sEndRange = legacyMinMaxPairToRange(aTimeRange.end_min, aTimeRange.end_max);
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
 * @param {LegacyTimeValue | undefined} aStartValue - The legacy start value.
 * @param {LegacyTimeValue | undefined} aEndValue - The legacy end value.
 * @returns {ResolvedTimeBounds} The resolved time bounds.
 */
export function normalizeLegacyTimeRangeBoundary(
    aStartValue: LegacyTimeValue | undefined,
    aEndValue: LegacyTimeValue | undefined,
): ResolvedTimeBounds {
    return normalizeTimeRangeConfig({
        start: normalizeLegacyTimeBoundary(aStartValue),
        end: normalizeLegacyTimeBoundary(aEndValue),
    });
}

/**
 * Serializes a time-range source into legacy input fields.
 * Intent: Preserve the legacy boundary shape when saving range data.
 * @param {LegacyTimeRangeSource} aSource - The time-range source to convert.
 * @returns {LegacyTimeRangeInput} The legacy input payload.
 */
export function toLegacyTimeRangeInput(aSource: LegacyTimeRangeSource): LegacyTimeRangeInput {
    const sRange = aSource.range;
    const sRangeConfig = 'rangeConfig' in aSource ? aSource.rangeConfig : undefined;

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
 * @param {TimeBoundary} aBoundary - The boundary to convert.
 * @returns {LegacyTimeValue} The legacy time value.
 */
export function toLegacyTimeValue(aBoundary: TimeBoundary): LegacyTimeValue {
    switch (aBoundary.kind) {
        case 'empty':
            return '';
        case 'absolute':
            return aBoundary.timestamp;
        case 'relative':
            return aBoundary.expression;
        case 'raw':
            return aBoundary.value;
    }
}

/**
 * Converts legacy min and max values into a numeric range.
 * Intent: Reject incomplete range pairs before they reach the parser.
 * @param {string | number | undefined} aMin - The minimum boundary value.
 * @param {string | number | undefined} aMax - The maximum boundary value.
 * @returns {ValueRange | undefined} The numeric range, or `undefined` when either bound is invalid.
 */
function legacyMinMaxPairToRange(
    aMin: string | number | undefined,
    aMax: string | number | undefined,
): ValueRange | undefined {
    if (typeof aMin !== 'number' || typeof aMax !== 'number') {
        return undefined;
    }

    return {
        min: aMin,
        max: aMax,
    };
}

/**
 * Converts one legacy time value into the shared structured boundary model.
 * Intent: Keep legacy storage parsing isolated inside the legacy adapter layer.
 * @param {LegacyTimeValue | undefined} aValue - The legacy time value to normalize.
 * @returns {TimeBoundary} The normalized boundary.
 */
function normalizeLegacyTimeBoundary(aValue: LegacyTimeValue | undefined): TimeBoundary {
    if (aValue === '' || aValue === undefined) {
        return { kind: 'empty' };
    }

    if (typeof aValue === 'number') {
        return {
            kind: 'absolute',
            timestamp: aValue,
        };
    }

    const sParsedBoundary = parseTimeRangeInputValue(aValue);
    if (sParsedBoundary) {
        return sParsedBoundary;
    }

    return {
        kind: 'raw',
        value: aValue,
    };
}
