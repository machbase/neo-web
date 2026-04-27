import { getSeriesName } from '../../series/PanelSeriesLabelFormatter';
import type { ChartRow, ChartSeriesItem, PanelSeriesConfig } from '../../series/PanelSeriesTypes';
import type { TagFetchRow } from '../FetchTypes';

/**
 * Maps fetched tag rows into chart rows.
 * Intent: Keep chart consumers working with the tuple shape produced by the fetch layer.
 *
 * @param rows The fetched tag rows to normalize.
 * @returns The chart rows copied from the fetch response.
 */
export function mapRowsToChartData(rows: TagFetchRow[] | undefined): ChartRow[] {
    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map(([aTime, aValue]) => [aTime, aValue]);
}

/**
 * Builds a chart series item from series config and row data.
 * Intent: Centralize chart-series construction so every chart path uses the same metadata.
 *
 * @param seriesConfig The series config that supplies the series name and axis selection.
 * @param rows The chart rows to attach to the series item.
 * @param useRawLabel Whether to render the raw series label instead of the calculated label.
 * @param includeColor Whether to include the configured series color on the item.
 * @returns The chart series item ready for chart rendering.
 */
export function buildChartSeriesItem(
    seriesConfig: PanelSeriesConfig,
    rows: ChartRow[],
    useRawLabel = false,
    includeColor = true,
): ChartSeriesItem {
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
