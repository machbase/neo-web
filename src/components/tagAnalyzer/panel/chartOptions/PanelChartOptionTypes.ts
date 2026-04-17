import type {
    EChartsOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type { ChartRow } from '../../common/modelTypes';

export type PanelDataZoomBoundaryValue =
    | number
    | string
    | Array<number | string>
    | undefined;

export type PanelDataZoomEventItem = {
    startValue: PanelDataZoomBoundaryValue;
    endValue: PanelDataZoomBoundaryValue;
    start: number | undefined;
    end: number | undefined;
};

export type PanelDataZoomEventPayload = PanelDataZoomEventItem & {
    batch: PanelDataZoomEventItem[] | undefined;
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

export type AxisRange = {
    min: number | undefined;
    max: number | undefined;
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
