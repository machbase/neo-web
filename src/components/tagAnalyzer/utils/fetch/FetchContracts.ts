import type { PanelAxes } from '../panelModelTypes';
import type { ChartData, ChartSeriesItem, SeriesConfig } from '../series/seriesTypes';
import type {
    IntervalOption,
    OptionalTimeRange,
    ResolvedTimeBounds,
    ValueRangePair,
} from '../time/timeTypes';
import type { PanelRangeBaseParams } from '../time/timeTypes';

export type PanelFetchRequest = PanelRangeBaseParams & {
    panelAxes: PanelAxes;
    chartWidth: number | undefined;
    isRaw: boolean;
    timeRange: OptionalTimeRange;
    rollupTableList: string[];
};

export type FetchPanelDatasetsParams = Omit<PanelFetchRequest, 'chartWidth'> & {
    seriesConfigSet: SeriesConfig[];
    chartWidth: number;
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

export type TagFetchRow = [number, number, ...unknown[]] | number[];

export type ChartFetchResponse = {
    data:
        | {
              column?: string[] | undefined;
              rows: TagFetchRow[] | undefined;
          }
        | undefined;
};

export type SeriesFetchColumnMap = {
    name: string;
    time: string;
    value: string;
};

export type CalculationFetchRequest = {
    Table: string;
    TagNames: string;
    Start: number;
    End: number;
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    RollupList: string[];
};

export type RawFetchRequest = {
    Table: string;
    TagNames: string;
    Start: number;
    End: number;
    CalculationMode: string;
    IntervalType: string;
    IntervalValue: number;
    columnMap: SeriesFetchColumnMap;
    Count: number;
    isRollup: boolean;
    Direction?: number;
    useSampling: boolean | undefined;
    sampleValue: number | string | undefined;
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

export type TopLevelTimeBoundaryRequest = {
    tagSet: SeriesConfig[];
    boardTime: ResolvedTimeBounds;
};

export type TopLevelTimeBoundaryResponse = ValueRangePair | undefined;
