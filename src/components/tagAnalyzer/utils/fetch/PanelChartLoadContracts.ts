import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { ChartData, ChartSeriesItem, PanelSeriesConfig } from '../series/seriesTypes';
import type { InputTimeBounds, IntervalOption, TimeRangeMs } from '../time/timeTypes';

export type PanelFetchRequest = {
    panelData: PanelData;
    panelTime: PanelTime;
    panelAxes: PanelAxes;
    boardTime: InputTimeBounds;
    chartWidth: number | undefined;
    isRaw: boolean;
    timeRange: TimeRangeMs | undefined;
    rollupTableList: string[];
};

export type FetchPanelDatasetsParams = {
    seriesConfigSet: PanelSeriesConfig[];
    panelData: PanelData;
    panelTime: PanelTime;
    panelAxes: PanelAxes;
    boardTime: InputTimeBounds;
    chartWidth: number;
    isRaw: boolean;
    timeRange: TimeRangeMs | undefined;
    rollupTableList: string[];
    useSampling: boolean;
    includeColor: boolean;
    isNavigator: boolean | undefined;
};

export type FetchPanelDatasetsResult = {
    datasets: ChartSeriesItem[];
    interval: IntervalOption;
    count: number;
    hasDataLimit: boolean;
    limitEnd: number;
};

export type PanelDataLimitState = {
    hasDataLimit: boolean;
    limitEnd: number;
};

export type PanelChartLoadState = {
    chartData: ChartData;
    rangeOption: IntervalOption;
    overflowRange: TimeRangeMs | undefined;
};
