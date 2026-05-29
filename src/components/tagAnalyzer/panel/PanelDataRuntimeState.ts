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

export type PanelDataRefreshPolicy = {
    dataLoadConfigOverride?: Partial<PanelChartDataLoadConfig>;
    forceReload: boolean;
    preserveNavigatorRange: boolean;
    forceRawMainSampling: boolean;
    clampPanelRangeToLoadedDataRange: boolean;
};

type PanelRangeMutationOptions = Partial<PanelDataRefreshPolicy> & {
    skipDataRefresh?: boolean;
};

export type PanelRangeApplyOptions = PanelRangeMutationOptions & {
    panelRange: TimeRangeMs;
    navigatorRange?: TimeRangeMs;
};

export type PanelRangeRefreshOptions = PanelRangeMutationOptions;

export type PanelDataRefreshResult = {
    isStale: boolean;
    panelRange?: TimeRangeMs | undefined;
    navigatorRange?: TimeRangeMs | undefined;
};

export const DEFAULT_PANEL_DATA_REFRESH_POLICY: PanelDataRefreshPolicy = {
    forceReload: false,
    preserveNavigatorRange: false,
    forceRawMainSampling: false,
    clampPanelRangeToLoadedDataRange: false,
};

export const INITIAL_PANEL_CHART_DATA_STATE: PanelChartDataState = {
    chartData: [],
    navigatorChartData: [],
    resolvedIntervalOption: undefined,
    loadedDataRange: EMPTY_TIME_RANGE,
    loadedNavigatorRange: EMPTY_TIME_RANGE,
};

export function createPanelDataRefreshPolicy(
    options: PanelRangeRefreshOptions = {},
): PanelDataRefreshPolicy {
    return {
        ...DEFAULT_PANEL_DATA_REFRESH_POLICY,
        ...(options.dataLoadConfigOverride
            ? { dataLoadConfigOverride: options.dataLoadConfigOverride }
            : {}),
        forceReload: options.forceReload === true,
        preserveNavigatorRange: options.preserveNavigatorRange === true,
        forceRawMainSampling: options.forceRawMainSampling === true,
        clampPanelRangeToLoadedDataRange:
            options.clampPanelRangeToLoadedDataRange === true,
    };
}
