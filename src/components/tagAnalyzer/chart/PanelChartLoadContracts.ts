import type { PanelAxes, PanelData, PanelTime } from '../utils/panelModelTypes';
import type { ChartData, ChartSeriesItem, SeriesConfig } from '../utils/series/seriesTypes';
import type { InputTimeBounds, IntervalOption, OptionalTimeRange } from '../utils/time/timeTypes';

export type PanelFetchRequest = {
    panelData: PanelData;
    panelTime: PanelTime;
    panelAxes: PanelAxes;
    boardTime: InputTimeBounds;
    chartWidth: number | undefined;
    isRaw: boolean;
    timeRange: OptionalTimeRange;
    rollupTableList: string[];
};

export type FetchPanelDatasetsParams = {
    seriesConfigSet: SeriesConfig[];
    panelData: PanelData;
    panelTime: PanelTime;
    panelAxes: PanelAxes;
    boardTime: InputTimeBounds;
    chartWidth: number;
    isRaw: boolean;
    timeRange: OptionalTimeRange;
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
    overflowRange: OptionalTimeRange;
};
