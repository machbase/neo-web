import { getSeriesName } from '../series/PanelSeriesUtils';
import type { ChartRow, ChartSeriesData } from '../chart/ChartDataTypes';
import type { PanelSeriesDefinition } from '../series/PanelSeriesTypes';
import type { TagFetchRow } from './FetchTypes';

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
    return {
        name: getSeriesName(seriesConfig, useRawLabel),
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
