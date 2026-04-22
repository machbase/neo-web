import type { ChartRow, SeriesConfig } from '../series/seriesTypes';
import type { TimeRange, TimeRangeConfig, ValueRange } from '../time/timeTypes';

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
