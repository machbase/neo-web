export type EChartGrid = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type EChartXAxis = {
    type: string;
    axisLine: { lineStyle: { color: string } };
    axisLabel: { color: string; fontSize: string };
    splitLine: { show: boolean; lineStyle: { color: string } };
    min?: number;
    max?: number;
};

export type EChartYAxisItem = {
    type: string;
    position: string;
    axisLine: { lineStyle: { color: string } };
    axisLabel: { color: string; fontSize: string };
    splitLine: { show: boolean; lineStyle: { color: string; width: number } };
    min?: number;
    max?: number;
    scale: boolean;
};

export type EChartSeriesItem = {
    name: string;
    type: string;
    data: any[];
    smooth: boolean;
    lineStyle: { width: number };
    showSymbol: boolean;
    symbolSize?: number;
    areaStyle?: { opacity: number };
    yAxisIndex: number;
    color?: string;
};

export type EChartTooltip = {
    trigger: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    textStyle: { color: string };
    confine: boolean;
};

export type EChartLegend = {
    show: boolean;
    textStyle: { color: string; fontSize: string };
    left: string;
    itemGap: number;
};

export type EChartDataZoomItem = {
    type: string;
    start: number;
    end: number;
    handleSize: string;
    fillerColor: string;
    borderColor: string;
};

export type EChartOptionResult = {
    grid: EChartGrid;
    xAxis: EChartXAxis;
    yAxis: EChartYAxisItem[];
    series: EChartSeriesItem[];
    tooltip: EChartTooltip;
    legend: EChartLegend;
    dataZoom: EChartDataZoomItem[];
    backgroundColor: string;
};
