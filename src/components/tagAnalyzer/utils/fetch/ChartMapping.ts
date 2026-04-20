import { getSeriesName } from '../series/TagAnalyzerSeriesLabelUtils';
import type { ChartRow, ChartSeriesItem, SeriesConfig } from '../series/seriesTypes';
import type { PanelDataLimitState, TagFetchRow } from './FetchTypes';

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
    aSeriesConfig: SeriesConfig,
    aRows: ChartRow[],
    aUseRawLabel = false,
    aIncludeColor = true,
): ChartSeriesItem {
    return {
        name: getSeriesName(aSeriesConfig, aUseRawLabel),
        data: aRows,
        yAxis: aSeriesConfig.use_y2 ? 1 : 0,
        marker: {
            symbol: 'circle',
            lineColor: undefined,
            lineWidth: 1,
        },
        color: aIncludeColor ? (aSeriesConfig.color ?? '') : undefined,
    };
}

/**
 * Determines whether the fetched panel data hit a limit.
 * Intent: Preserve the final visible timestamp when raw data is truncated by the fetch result.
 *
 * @param aIsRaw Whether the current request is loading raw data.
 * @param aRows The fetched rows for the current series.
 * @param aCount The expected row count for a full fetch.
 * @param aCurrentLimitEnd The current limit boundary carried across series.
 * @returns The updated limit state for the current series.
 */
export function analyzePanelDataLimit(
    aIsRaw: boolean,
    aRows: TagFetchRow[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
): PanelDataLimitState {
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLastTimestamp = aRows[aRows.length - 1]?.[0];
    const sPreviousTimestamp = aRows[aRows.length - 2]?.[0];
    const sShouldUseLastTimestamp = aCurrentLimitEnd !== 0 && aCurrentLimitEnd !== sLastTimestamp;
    const sLimitEnd = sShouldUseLastTimestamp
        ? sLastTimestamp
        : (sPreviousTimestamp ?? sLastTimestamp);

    return {
        hasDataLimit: true,
        limitEnd: sLimitEnd,
    };
}
