import { isEmpty } from '@/utils';
import type {
    ChartSeriesItem,
    SelectedRangeSeriesSummary,
    PanelSeriesSourceColumns,
} from './PanelSeriesTypes';
import { getSourceTagName } from './PanelSeriesSourceTag';

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
 * @param seriesList The chart series data to summarize.
 * @param tagSet The tag set that provides metadata for each series.
 * @param startTime The start of the selected time window.
 * @param endTime The end of the selected time window.
 * @returns The summary rows for the selected series data.
 */
export function buildSeriesSummaryRows(
    seriesList: Array<Pick<ChartSeriesItem, 'data'>>,
    tagSet: SeriesSummarySource[],
    startTime: number,
    endTime: number,
): SelectedRangeSeriesSummary[] {
    const sSummaryRows: SelectedRangeSeriesSummary[] = [];

    seriesList.forEach((series, index) => {
        const sTagConfig = tagSet[index];
        if (sTagConfig === undefined) {
            return;
        }

        const sSelectedValues = series.data
            .filter((row) => startTime <= row[0] && endTime >= row[0])
            .map((row) => row[1]);

        if (isEmpty(sSelectedValues)) {
            return;
        }

        const sTotalValue = sSelectedValues.reduce(
            (runningTotal: number, value: number) => runningTotal + value,
            0,
        );

        sSummaryRows.push({
            seriesIndex: index,
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
