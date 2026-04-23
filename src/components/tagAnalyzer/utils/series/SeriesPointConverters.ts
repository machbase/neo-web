import type { ChartRow, ChartSeriesItem } from './seriesTypes';

type SeriesPointLike = ChartRow | { x: number; y: number };

/**
 * Converts series data into chart rows.
 * Intent: Normalize chart row tuples and legacy point objects into one row array shape.
 *
 * @param aData The series data to normalize.
 * @returns The chart rows.
 */
export function seriesDataToPoints(aData: SeriesPointLike[]): ChartRow[] {
    return aData.map((aItem) => {
        if (Array.isArray(aItem)) {
            return [aItem[0], aItem[1]];
        }

        return [aItem.x, aItem.y];
    });
}

/**
 * Converts a chart series item into chart rows.
 * Intent: Provide a small adapter for code that already holds a series item wrapper.
 *
 * @param aSeries The chart series item data to convert.
 * @returns The chart rows.
 */
export function chartSeriesToPoints(
    aSeries: Pick<ChartSeriesItem, 'data'>,
): ChartRow[] {
    return seriesDataToPoints(aSeries.data);
}
