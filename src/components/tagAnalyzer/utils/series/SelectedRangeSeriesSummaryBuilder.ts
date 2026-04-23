import { isEmpty } from '@/utils';
import { getSourceTagName } from '../legacy/LegacySeriesAdapter';
import type {
    ChartSeriesItem,
    SelectedRangeSeriesSummary,
    PanelSeriesSourceColumns,
} from './PanelSeriesTypes';

type SeriesSummarySource = {
    table: string;
    sourceTagName: string;
    alias: string;
    sourceColumns: PanelSeriesSourceColumns;
};

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
    aTagSet: SeriesSummarySource[],
    aStartTime: number,
    aEndTime: number,
): SelectedRangeSeriesSummary[] {
    const sSummaryRows: SelectedRangeSeriesSummary[] = [];

    aSeriesList.forEach((aSeries, aIndex) => {
        const sTagConfig = aTagSet[aIndex];
        if (sTagConfig === undefined) {
            return;
        }

        const sSelectedValues = aSeries.data
            .filter((aRow) => aStartTime <= aRow[0] && aEndTime >= aRow[0])
            .map((aRow) => aRow[1]);

        if (isEmpty(sSelectedValues)) {
            return;
        }

        const sTotalValue = sSelectedValues.reduce(
            (aRunningTotal: number, aValue: number) => aRunningTotal + aValue,
            0,
        );

        sSummaryRows.push({
            seriesIndex: aIndex,
            table: sTagConfig.table,
            name: getSourceTagName(sTagConfig),
            alias: sTagConfig.alias,
            sourceColumns: sTagConfig.sourceColumns,
            min: Math.min(...sSelectedValues).toFixed(5),
            max: Math.max(...sSelectedValues).toFixed(5),
            avg: (sTotalValue / sSelectedValues.length).toFixed(5),
        });
    });

    return sSummaryRows;
}
