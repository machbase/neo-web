import type {
    ChartRow,
    SeriesConfig,
} from '../../common/modelTypes';

type LegacySourceTagNameCarrier = {
    sourceTagName: string | undefined;
    tagName: string | undefined;
};

export type LegacyChartPoint = {
    x: number;
    y: number;
};

export type LegacyYn = 'Y' | 'N';

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

export type LegacySourceTagNameInput =
    | Pick<LegacySourceTagNameCarrier, 'sourceTagName'>
    | Pick<LegacySourceTagNameCarrier, 'tagName'>
    | Partial<LegacySourceTagNameCarrier>;

export type LegacyNormalizedSourceTagName<T extends LegacySourceTagNameInput> = Omit<
    T,
    'tagName' | 'sourceTagName'
> & {
    sourceTagName: string;
};

export type LegacyTagNameItem<T extends { sourceTagName: string | undefined }> = Omit<
    T,
    'sourceTagName'
> & {
    tagName: string;
};

export type LegacyCompatibleSeriesConfig = Omit<
    SeriesConfig,
    'sourceTagName' | 'use_y2'
> & {
    sourceTagName?: string;
    tagName?: string;
    use_y2: LegacyYn;
};

export type LegacyBgnEndTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

export type LegacyChartSeries = {
    data: Array<ChartRow | LegacyChartPoint> | undefined;
    xData: number[] | undefined;
    yData: number[] | undefined;
};
