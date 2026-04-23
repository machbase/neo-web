import type { ChartRow } from '../../utils/series/seriesTypes';

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

export type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    toolbarHeight: number;
    sliderTop: number;
    sliderHeight: number;
};
