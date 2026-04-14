export type TagAnalyzerTimeRangeValue = string | number | '';

export type TagAnalyzerRawTimeRange = {
    range_bgn: TagAnalyzerTimeRangeValue;
    range_end: TagAnalyzerTimeRangeValue;
};

export type TagAnalyzerTimeRangeInput = {
    bgn: TagAnalyzerTimeRangeValue;
    end: TagAnalyzerTimeRangeValue;
};
