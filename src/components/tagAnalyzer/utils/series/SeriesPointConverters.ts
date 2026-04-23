import type { ChartRow, ChartSeriesItem, ChartSeriesPoint } from './seriesTypes';

type SeriesPointLike = ChartRow | ChartSeriesPoint;

/**
 * Converts series data into chart points.
 * Intent: Normalize chart row tuples and point objects into one point array shape.
 *
 * @param aData The series data to normalize.
 * @returns The chart series points.
 */
export function seriesDataToPoints(aData: SeriesPointLike[]): ChartSeriesPoint[] {
    return aData.map((aItem) => {
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
 * Converts a chart series item into chart points.
 * Intent: Provide a small adapter for code that already holds a series item wrapper.
 *
 * @param aSeries The chart series item data to convert.
 * @returns The chart series points.
 */
export function chartSeriesToPoints(
    aSeries: Pick<ChartSeriesItem, 'data'>,
): ChartSeriesPoint[] {
    return seriesDataToPoints(aSeries.data);
}
