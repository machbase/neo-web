import type { PanelRangeChangeEvent } from '../domain/PanelDomain';
import type {
    ChartSeriesData,
    FFTSelectionPayload,
    SelectedRangeSeriesSummary,
} from '../domain/ChartDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';

type BrushSelectionRange = {
    min: number;
    max: number;
    startTime: number;
    endTime: number;
};

export function buildSelectionSummaryPayload(
    event: PanelRangeChangeEvent,
    chartData: ChartSeriesData[],
    seriesList: PanelSeriesDefinition[],
    isNumericXAxis: boolean,
): FFTSelectionPayload | undefined {
    const sSelectionRange = getBrushSelectionRange(event, isNumericXAxis);
    const sSeriesSummaries = buildSeriesSummaryRows(
        chartData.map((series) => series.data),
        seriesList,
        sSelectionRange.min,
        sSelectionRange.max,
    );

    if (sSeriesSummaries.length === 0) {
        return undefined;
    }

    return {
        startTime: sSelectionRange.startTime,
        endTime: sSelectionRange.endTime,
        seriesSummaries: sSeriesSummaries,
    };
}

function getBrushSelectionRange(
    event: PanelRangeChangeEvent,
    isNumericXAxis: boolean,
): BrushSelectionRange {
    return {
        min: event.min,
        max: event.max,
        startTime: isNumericXAxis ? event.min : Math.floor(event.min),
        endTime: isNumericXAxis ? event.max : Math.ceil(event.max),
    };
}

function buildSeriesSummaryRows(
    seriesDataList: Array<ChartSeriesData['data']>,
    seriesList: PanelSeriesDefinition[],
    startTime: number,
    endTime: number,
): SelectedRangeSeriesSummary[] {
    if (seriesDataList.length !== seriesList.length) {
        throw new Error(
            `Brush selection series mismatch: ${seriesDataList.length} chart series for ${seriesList.length} panel series.`,
        );
    }

    return seriesDataList.flatMap((seriesData, index) => {
        const sSeriesConfig = seriesList[index];
        if (sSeriesConfig === undefined) {
            throw new Error(`Missing series config for chart data index ${index}.`);
        }

        const sSelectedValues = seriesData
            .filter((row) => startTime <= row[0] && endTime >= row[0])
            .map((row) => row[1])
            .filter((value): value is number => value !== null);

        if (sSelectedValues.length === 0) {
            return [];
        }

        const sTotalValue = sSelectedValues.reduce(
            (runningTotal: number, value: number) => runningTotal + value,
            0,
        );

        return [{
            seriesIndex: index,
            table: sSeriesConfig.table,
            name: sSeriesConfig.sourceTagName,
            alias: sSeriesConfig.alias,
            sourceColumns: sSeriesConfig.sourceColumns,
            min: Math.min(...sSelectedValues).toFixed(5),
            max: Math.max(...sSelectedValues).toFixed(5),
            avg: (sTotalValue / sSelectedValues.length).toFixed(5),
        }];
    });
}
