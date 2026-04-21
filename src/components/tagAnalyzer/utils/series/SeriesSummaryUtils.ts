import { isEmpty } from '@/utils';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import { chartSeriesToPoints } from './SeriesPointConverters';
import type { ChartSeriesItem, MinMaxItem, SeriesConfig } from './seriesTypes';

export const TAG_ANALYZER_AGGREGATION_MODES = [
    { key: 'min', value: 'min' },
    { key: 'max', value: 'max' },
    { key: 'sum', value: 'sum' },
    { key: 'cnt', value: 'cnt' },
    { key: 'avg', value: 'avg' },
    { key: 'first', value: 'first' },
    { key: 'last', value: 'last' },
];

export const TAG_ANALYZER_AGGREGATION_MODE_OPTIONS = TAG_ANALYZER_AGGREGATION_MODES.map(
    (aMode) => ({
        label: aMode.value,
        value: aMode.value,
        disabled: undefined,
    }),
);

/**
 * Builds summary rows for the visible series data.
 * Intent: Produce a compact min, max, and average view for the current chart window.
 *
 * @param aSeriesList The chart series data to summarize.
 * @param aTagSet The tag set that provides metadata for each series.
 * @param aStartTime The start of the selected time window.
 * @param aEndTime The end of the selected time window.
 * @returns The summary rows for the selected series data.
 */
export function buildSeriesSummaryRows(
    aSeriesList: Array<Pick<ChartSeriesItem, 'data'>>,
    aTagSet: Pick<SeriesConfig, 'table' | 'sourceTagName' | 'alias'>[],
    aStartTime: number,
    aEndTime: number,
): MinMaxItem[] {
    const sSummaryRows: MinMaxItem[] = [];

    aSeriesList.forEach((aSeries, aIndex) => {
        const sSelectedValues = chartSeriesToPoints(aSeries)
            .filter((aPoint) => aStartTime <= aPoint.x && aEndTime >= aPoint.x)
            .map((aPoint) => aPoint.y);

        if (isEmpty(sSelectedValues)) {
            return;
        }

        const sTotalValue = sSelectedValues.reduce(
            (aRunningTotal: number, aValue: number) => aRunningTotal + aValue,
            0,
        );

        sSummaryRows.push({
            table: aTagSet[aIndex].table,
            name: getSourceTagName(aTagSet[aIndex]),
            alias: aTagSet[aIndex].alias,
            min: Math.min(...sSelectedValues).toFixed(5),
            max: Math.max(...sSelectedValues).toFixed(5),
            avg: (sTotalValue / sSelectedValues.length).toFixed(5),
        });
    });

    return sSummaryRows;
}
