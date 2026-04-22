import type { GBoardListType } from '@/recoil/recoil';
import type { ChartRow, SeriesConfig } from '../series/seriesTypes';
import type { TimeRange, TimeRangePair, TimeRangeConfig, ValueRange } from '../time/timeTypes';

type LegacySourceTagNameCarrier = {
    sourceTagName: string | undefined;
    tagName: string | undefined;
};

export type LegacyChartPoint = {
    x: number;
    y: number;
};

export type LegacyTimeValue = string | number | '';

export type LegacyTimeRange = {
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
};

export type LegacyTimeRangeInput = {
    bgn: LegacyTimeValue;
    end: LegacyTimeValue;
};

export type LegacyTimeRangeSource =
    | {
          range: ValueRange | TimeRange;
      }
    | {
          range: ValueRange | TimeRange;
          rangeConfig: TimeRangeConfig;
      };

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

type LegacySeriesConfigCore = Pick<
    SeriesConfig,
    'key' | 'table' | 'alias' | 'calculationMode' | 'color' | 'id' | 'colName'
>;

export type LegacyCompatibleSeriesConfig = LegacySeriesConfigCore & {
    sourceTagName?: string;
    tagName?: string;
    use_y2: 'Y' | 'N';
    onRollup?: boolean;
    [key: string]: unknown;
};

export type LegacyFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: LegacyCompatibleSeriesConfig[];
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
    raw_keeper: boolean | undefined;
    time_keeper: Partial<TimeRangePair> | '' | undefined;
    default_range: ValueRange | undefined;
    count: number | undefined;
    interval_type: string | undefined;
    show_legend: 'Y' | 'N';
    use_zoom: 'Y' | 'N';
    use_normalize: 'Y' | 'N' | undefined;
    use_time_keeper: 'Y' | 'N';
    show_x_tickline: 'Y' | 'N';
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: 'Y' | 'N';
    show_y_tickline: 'Y' | 'N';
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: 'Y' | 'N';
    ucl_value: number | string;
    use_lcl: 'Y' | 'N';
    lcl_value: number | string;
    use_right_y2: 'Y' | 'N';
    zero_base2: 'Y' | 'N';
    show_y_tickline2: 'Y' | 'N';
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: 'Y' | 'N';
    ucl2_value: number | string;
    use_lcl2: 'Y' | 'N';
    lcl2_value: number | string;
    chart_type: string;
    show_point: 'Y' | 'N';
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
    range_config?: TimeRangeConfig | undefined;
    [key: string]: unknown;
};

export type PersistedTazPanelInfo = LegacyFlatPanelInfo | Record<string, unknown>;

// Used at the TagAnalyzer storage/UI boundary before legacy panels are normalized.
export type LegacyBoardSourceInfo = Omit<GBoardListType, 'panels' | 'range_bgn' | 'range_end'> & {
    panels: PersistedTazPanelInfo[];
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
    version?: string | undefined;
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
