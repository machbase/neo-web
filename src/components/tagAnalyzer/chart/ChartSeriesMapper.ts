import type { ChartRow, ChartSeriesData } from '../domain/ChartDataModel';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import type { TagFetchRow } from '../fetch/FetchContracts';

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
