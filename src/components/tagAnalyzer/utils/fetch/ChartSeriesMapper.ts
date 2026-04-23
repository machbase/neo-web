import { getSeriesName } from '../series/SeriesLabelFormatter';
import type { ChartRow, ChartSeriesItem, PanelSeriesConfig } from '../series/seriesTypes';
import type { TagFetchRow } from './FetchContracts';

/**
 * Maps fetched tag rows into chart rows.
 * Intent: Keep chart consumers working with the tuple shape produced by the fetch layer.
 *
 * @param aRows The fetched tag rows to normalize.
 * @returns The chart rows copied from the fetch response.
 */
export function mapRowsToChartData(aRows: TagFetchRow[] | undefined): ChartRow[] {
    if (!aRows || aRows.length === 0) {
        return [];
    }

    return aRows.map(([aTime, aValue]) => [aTime, aValue]);
}

/**
 * Builds a chart series item from series config and row data.
 * Intent: Centralize chart-series construction so every chart path uses the same metadata.
 *
 * @param aSeriesConfig The series config that supplies the series name and axis selection.
 * @param aRows The chart rows to attach to the series item.
 * @param aUseRawLabel Whether to render the raw series label instead of the calculated label.
 * @param aIncludeColor Whether to include the configured series color on the item.
 * @returns The chart series item ready for chart rendering.
 */
export function buildChartSeriesItem(
    aSeriesConfig: PanelSeriesConfig,
    aRows: ChartRow[],
    aUseRawLabel = false,
    aIncludeColor = true,
): ChartSeriesItem {
    return {
        name: getSeriesName(aSeriesConfig, aUseRawLabel),
        data: aRows,
        yAxis: aSeriesConfig.useSecondaryAxis ? 1 : 0,
        marker: {
            symbol: 'circle',
            lineColor: undefined,
            lineWidth: 1,
        },
        color: aIncludeColor ? (aSeriesConfig.color ?? '') : undefined,
    };
}
