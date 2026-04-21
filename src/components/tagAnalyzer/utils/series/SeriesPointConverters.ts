import type { ChartRow, ChartSeriesItem, ChartSeriesPoint } from './seriesTypes';

type SeriesPointLike = ChartRow | ChartSeriesPoint;

type SeriesDataContainer = {
    data: SeriesPointLike[] | undefined;
};

/**
 * Converts a series data container into chart points.
 * Intent: Normalize chart row tuples and point objects into one point array shape.
 *
 * @param aSeries The series data container to normalize.
 * @returns The chart series points.
 */
export function seriesDataToPoints(aSeries: SeriesDataContainer): ChartSeriesPoint[] {
    const sData = aSeries.data;

    if (!Array.isArray(sData) || sData.length === 0) {
        return [];
    }

    return sData.map((aItem) => {
        if (Array.isArray(aItem)) {
            return {
                x: aItem[0],
                y: aItem[1],
            };
        }

        return aItem;
    });
}

/**
 * Converts chart rows into chart points.
 * Intent: Reuse the shared point normalization path for row-based chart data.
 *
 * @param aRows The chart rows to convert.
 * @returns The chart series points.
 */
export function chartRowsToPoints(aRows: ChartRow[] | undefined): ChartSeriesPoint[] {
    return seriesDataToPoints({
        data: aRows,
    });
}

/**
 * Converts a chart series item into chart points.
 * Intent: Provide a small adapter for code that already holds a series item wrapper.
 *
 * @param aSeries The chart series item data to convert.
 * @returns The chart series points.
 */
export function chartSeriesToPoints(
    aSeries: Pick<ChartSeriesItem, 'data'>,
): ChartSeriesPoint[] {
    return seriesDataToPoints(aSeries);
}
