import type { PanelSeriesSourceColumns } from './SeriesDomain';

export type ChartRow = [number, number | null];

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

export type FFTSelectionPayload = {
    seriesSummaries: SelectedRangeSeriesSummary[];
    startTime: number;
    endTime: number;
};
