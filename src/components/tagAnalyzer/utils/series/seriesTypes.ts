import type { TimeRangeMs } from '../time/types/TimeTypes';

export type PanelSeriesSourceColumns = {
    name: string;
    time: string;
    value: string;
    [key: string]: unknown;
};

export const DEFAULT_PANEL_SERIES_SOURCE_COLUMNS: PanelSeriesSourceColumns = {
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
};

export type SeriesAnnotation = {
    text: string;
    timeRange: TimeRangeMs;
};

export type PanelSeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    sourceColumns: PanelSeriesSourceColumns;
    annotations: SeriesAnnotation[];
    [key: string]: unknown;
};

export type ChartRow = [number, number];

export type ChartSeriesItem = {
    name: string;
    data: ChartRow[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
    [key: string]: unknown;
};

export type ChartData = {
    datasets: ChartSeriesItem[];
};

export type SelectedRangeSeriesSummary = {
    seriesIndex: number;
    table: string;
    name: string;
    alias: string;
    sourceColumns: PanelSeriesSourceColumns;
    min: string;
    max: string;
    avg: string;
};
