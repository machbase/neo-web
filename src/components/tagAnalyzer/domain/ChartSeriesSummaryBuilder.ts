import type { ChartSeriesData, SelectedRangeSeriesSummary } from './ChartDataModel';
import type { PanelSeriesSourceColumns } from './SeriesModel';

type SeriesSummarySource = {
    table: string;
    sourceTagName: string;
    alias: string;
    sourceColumns: PanelSeriesSourceColumns;
};
export function buildSeriesSummaryRows(
    seriesDataList: Array<ChartSeriesData['data']>,
    tagSet: SeriesSummarySource[],
    startTime: number,
    endTime: number,
): SelectedRangeSeriesSummary[] {
    const sSummaryRows: SelectedRangeSeriesSummary[] = [];

    seriesDataList.forEach((seriesData, index) => {
        const sTagConfig = tagSet[index];
        if (sTagConfig === undefined) {
            return;
        }

        const sSelectedValues = seriesData
            .filter((row) => startTime <= row[0] && endTime >= row[0])
            .map((row) => row[1]);

        if (sSelectedValues.length === 0) {
            return;
        }

        const sTotalValue = sSelectedValues.reduce(
            (runningTotal: number, value: number) => runningTotal + value,
            0,
        );

        sSummaryRows.push({
            seriesIndex: index,
            table: sTagConfig.table,
            name: sTagConfig.sourceTagName,
            alias: sTagConfig.alias,
            sourceColumns: sTagConfig.sourceColumns,
            min: Math.min(...sSelectedValues).toFixed(5),
            max: Math.max(...sSelectedValues).toFixed(5),
            avg: (sTotalValue / sSelectedValues.length).toFixed(5),
        });
    });

    return sSummaryRows;
}
