import type {
    EChartsOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type { ChartRow } from '../../utils/series/seriesTypes';

// ECharts datazoom event params use percentages, with absolute values only when provided by ECharts.
export type EChartDataZoomEventItem = {
    start: number;
    end: number;
    startValue?: number;
    endValue?: number;
};

export type EChartDataZoomEventPayload =
    | EChartDataZoomEventItem
    | {
          batch: EChartDataZoomEventItem[];
      };

// ECharts getOption().dataZoom state follows the dataZoom option shape, where axis values can be typed values.
export type EChartDataZoomOptionStateItem = {
    start?: number;
    end?: number;
    startValue?: number | string | Date;
    endValue?: number | string | Date;
};

export type EChartBrushAreaPayload = {
    coordRange: [number, number] | undefined;
    range: [number, number] | undefined;
};

export type EChartBrushPayload = {
    areas: EChartBrushAreaPayload[] | undefined;
    batch:
        | Array<{
              areas: EChartBrushAreaPayload[] | undefined;
          }>
        | undefined;
};

export type EChartTooltipValue = [number, number] | Array<number | string | undefined>;

export type EChartTooltipParam = Partial<{
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    axisValue: number | string;
    value: EChartTooltipValue;
    color: string;
}>;

export type ThresholdLineOption = {
    silent: true;
    symbol: 'none';
    lineStyle: {
        color: string;
        width: number;
    };
    label: {
        show: false;
    };
    data: Array<{
        yAxis: number;
    }>;
};

export type YAxisValueMap = {
    left: number[];
    right: number[];
};

export type NonEmptyChartSeriesData = [ChartRow, ...ChartRow[]];

export type PanelSeriesOptions = SeriesOption[];
export type PanelYAxisOptions = YAXisComponentOption[];

export type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    toolbarHeight: number;
    sliderTop: number;
    sliderHeight: number;
};

export type PanelChartOption = EChartsOption & {
    noData: {
        style: Record<string, number | string>;
    };
};
