import type {
    TagAnalyzerDefaultRange,
    TimeRange,
} from '../../common/CommonType';
import {
    convertTimeToFullDate,
    isLastRelativeTimeValue,
} from '../TagAnalyzerDateUtils';
import type {
    LegacyTimeRange,
    LegacyTimeRangeInput,
    LegacyTimeValue,
} from './LegacyTimeRangeTypes';

type NumericRangeLike = TagAnalyzerDefaultRange | TimeRange;

/**
 * Converts one legacy start/end pair into the strict numeric range used by TagAnalyzer,
 * while preserving the original legacy expression only when it is still needed.
 */
export function normalizeLegacyTimeRangeBoundary(
    aStartValue: LegacyTimeValue | undefined,
    aEndValue: LegacyTimeValue | undefined,
): {
    range: TagAnalyzerDefaultRange;
    legacyRange: LegacyTimeRange | undefined;
} {
    return {
        range: {
            min: normalizeLegacyTimeRangeBoundaryValue(aStartValue),
            max: normalizeLegacyTimeRangeBoundaryValue(aEndValue),
        },
        legacyRange:
            typeof aStartValue === 'number' && typeof aEndValue === 'number'
                ? undefined
                : {
                      range_bgn: aStartValue ?? '',
                      range_end: aEndValue ?? '',
                  },
    };
}

/**
 * Converts one strict numeric range plus optional legacy expression back into the
 * boundary input shape expected by legacy helpers.
 */
export function toLegacyTimeRangeInput(
    aRange: NumericRangeLike,
    aLegacyRange: LegacyTimeRange | undefined,
): LegacyTimeRangeInput {
    return 'startTime' in aRange
        ? {
              bgn: aLegacyRange?.range_bgn ?? aRange.startTime,
              end: aLegacyRange?.range_end ?? aRange.endTime,
          }
        : {
              bgn: aLegacyRange?.range_bgn ?? aRange.min,
              end: aLegacyRange?.range_end ?? aRange.max,
          };
}

function normalizeLegacyTimeRangeBoundaryValue(aValue: LegacyTimeValue | undefined): number {
    if (aValue === '' || aValue === undefined || isLastRelativeTimeValue(aValue)) {
        return 0;
    }

    return convertTimeToFullDate(aValue);
}
