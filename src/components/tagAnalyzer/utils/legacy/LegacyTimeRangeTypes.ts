export type LegacyTimeValue = string | number | '';

export type LegacyTimeRange = {
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
};

export type LegacyTimeRangeInput = {
    bgn: LegacyTimeValue;
    end: LegacyTimeValue;
};

/**
 * Backwards-compatible aliases kept in the legacy folder only.
 * Active TagAnalyzer code should prefer the LegacyTime* names at adapter boundaries
 * and strict numeric TimeRange/TagAnalyzerDefaultRange models elsewhere.
 */
export type TagAnalyzerTimeRangeValue = LegacyTimeValue;

export type TagAnalyzerRawTimeRange = LegacyTimeRange;

export type TagAnalyzerTimeRangeInput = LegacyTimeRangeInput;
