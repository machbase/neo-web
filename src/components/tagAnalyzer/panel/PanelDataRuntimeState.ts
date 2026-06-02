import type { ChartSeriesData } from '../domain/ChartDomain';
import type { RuntimePanelAxes } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import type { IntervalOption, TimeRangeMs } from '../domain/time/TimeTypes';

export type PanelChartDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    queryLimit: number;
    intervalType: string | undefined;
    isRaw: boolean;
    xAxis: RuntimePanelAxes['x_axis'];
    mainChartSampling: RuntimePanelAxes['main_chart_sampling'];
};

export type PanelChartDataState = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    loadedDataRange: TimeRangeMs;
    loadedNavigatorRange: TimeRangeMs;
};

export enum PanelChartLoadStatus {
    Idle = 'idle',
    Loading = 'loading',
    Ready = 'ready',
    Failed = 'failed',
}

export type PanelRangeApplyOptions = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    fullRange?: TimeRangeMs;
    preserveNavigatorRange?: boolean;
    reloadData?: boolean;
};

export type PanelRangeStateApplyOptions = {
    fullRange?: TimeRangeMs;
    preserveNavigatorRange?: boolean;
    reloadData?: boolean;
};

export const INITIAL_PANEL_CHART_DATA_STATE: PanelChartDataState = {
    chartData: [],
    navigatorChartData: [],
    resolvedIntervalOption: undefined,
    loadedDataRange: EMPTY_TIME_RANGE,
    loadedNavigatorRange: EMPTY_TIME_RANGE,
};
