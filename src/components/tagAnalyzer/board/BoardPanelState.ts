import type { ChartSeriesData } from '../domain/ChartDomain';
import type { PanelAxes, PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import type {
    IntervalOption,
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';

export type PanelChartDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    queryLimit: number;
    intervalType: string | undefined;
    isRaw: boolean;
    xAxis: PanelAxes['x_axis'];
    navigatorSampling: PanelAxes['sampling'];
    mainChartSampling: PanelAxes['main_chart_sampling'];
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

export type BoardPanelRecord = {
    rangeState: PanelRangeState;
    chartDataState: PanelChartDataState;
    chartLoadStatus: PanelChartLoadStatus;
    navigatorLoadStatus: PanelChartLoadStatus;
    chartAreaWidth: number | undefined;
};

export type PanelRangeResolutionState = {
    seriesList: PanelSeriesDefinition[];
    rangeConfig: TimeRangeConfig;
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined;
};

export type PanelRangeInitializeOptions = {
    rangeStateOverride?: Partial<PanelRangeResolutionState>;
    dataLoadConfigOverride?: Partial<PanelChartDataLoadConfig>;
};

export type PanelRangeApplyOptions = {
    panelRange: TimeRangeMs;
    navigatorRange?: TimeRangeMs;
    dataLoadConfigOverride?: Partial<PanelChartDataLoadConfig>;
    reloadNavigatorData?: boolean;
    preserveNavigatorRange?: boolean;
    forceRawMainSampling?: boolean;
};

export type PanelRangeRefreshOptions = {
    forceReload?: boolean;
    dataLoadConfigOverride?: Partial<PanelChartDataLoadConfig>;
    preserveNavigatorRange?: boolean;
    forceRawMainSampling?: boolean;
};

export type PanelDataRefreshResult = {
    isStale: boolean;
    panelRange?: TimeRangeMs | undefined;
    navigatorRange?: TimeRangeMs | undefined;
};

export const INITIAL_PANEL_RANGE_STATE: PanelRangeState = {
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
};

export const INITIAL_PANEL_CHART_DATA_STATE: PanelChartDataState = {
    chartData: [],
    navigatorChartData: [],
    resolvedIntervalOption: undefined,
    loadedDataRange: EMPTY_TIME_RANGE,
    loadedNavigatorRange: EMPTY_TIME_RANGE,
};

export function createInitialBoardPanelRecord(): BoardPanelRecord {
    return {
        rangeState: INITIAL_PANEL_RANGE_STATE,
        chartDataState: INITIAL_PANEL_CHART_DATA_STATE,
        chartLoadStatus: PanelChartLoadStatus.Idle,
        navigatorLoadStatus: PanelChartLoadStatus.Idle,
        chartAreaWidth: undefined,
    };
}
