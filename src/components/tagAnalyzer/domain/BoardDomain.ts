import type {
    PanelInfo,
    RuntimePanelSampling,
    RuntimePanelXAxis,
} from './PanelDomain';
import type {
    PanelSeriesDefinition,
    SeriesKeyAxisKind,
} from './SeriesDomain';
import type { TazVersion } from '../persistence/TazVersion';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from './time/model/TimeTypes';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelInfo[];
    boardTimeRange: TimeRangeConfig;
    savedCode: string | false;
    version: TazVersion;
};

export type GlobalTimeRangeState = {
    data: TimeRangeMs;
    navigator: TimeRangeMs;
    interval: IntervalOption;
};

export type SetGlobalTimeRangePayload = {
    dataTime: TimeRangeMs;
    navigatorTime: TimeRangeMs;
    interval: IntervalOption;
};

export type OverlapPanelSelection = {
    panelKey: string;
    start: number;
    duration: number;
    isRaw: boolean;
};

export type OverlapPanelInfo = OverlapPanelSelection & {
    label: string;
    series: PanelSeriesDefinition;
    queryLimit: number;
    intervalType: string | undefined;
    xAxis: RuntimePanelXAxis;
    mainChartSampling: RuntimePanelSampling;
    isOrderBy: boolean;
    includeZeroInYAxisRange: boolean;
    axisKind: SeriesKeyAxisKind | undefined;
};

export type OverlapPanelRangeSelectionPayload = {
    panelKey: string;
    start: number;
    end: number;
    isRaw: boolean;
};

export type OverlapPanelSelectionChangePayload =
    | (OverlapPanelRangeSelectionPayload & { changeType: undefined })
    | (OverlapPanelRangeSelectionPayload & { changeType: 'changed' })
    | {
          panelKey: string;
          changeType: 'delete';
      };
