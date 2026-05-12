import type { PanelSeriesSourceColumns } from './SeriesModel';

export type ChartRow = [number, number];

export type ChartSeriesData = {
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
    datasets: ChartSeriesData[];
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

export type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

export type FFTSelectionPayload = {
    seriesSummaries: SelectedRangeSeriesSummary[];
    startTime: number;
    endTime: number;
};

export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: ChartSeriesData | undefined;
};
