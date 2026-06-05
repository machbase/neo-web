import type { TagFetchRow } from '../fetch/FetchContracts';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from './SeriesDomain';

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

export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: ChartSeriesData | undefined;
};

export function mapRowsToChartData(rows: TagFetchRow[] | undefined): ChartRow[] {
    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map(([aTime, aValue]) => [aTime, aValue]);
}

export function buildChartSeriesData(
    seriesConfig: PanelSeriesDefinition,
    rows: ChartRow[],
    useRawLabel = false,
    includeColor = true,
): ChartSeriesData {
    const sSeriesName =
        seriesConfig.alias ||
        `${seriesConfig.sourceTagName}(${
            useRawLabel ? 'raw' : seriesConfig.calculationMode.toLowerCase()
        })`;

    return {
        name: sSeriesName,
        data: rows,
        yAxis: seriesConfig.useSecondaryAxis ? 1 : 0,
        marker: {
            symbol: 'circle',
            lineColor: undefined,
            lineWidth: 1,
        },
        color: includeColor ? seriesConfig.color : undefined,
    };
}
