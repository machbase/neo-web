import type { ChartSeriesData } from '../chart/chartData';
import type { AxisRange } from '../range/rangeModel';
import type { PanelSeriesDefinition } from '../seriesModel';

export const FFT_MINIMUM_SAMPLE_COUNT = 16;

export type FFTSeriesSummary = {
    series: PanelSeriesDefinition;
    min: string;
    max: string;
    avg: string;
    sampleTimestamps: number[];
};

export type FFTSelectionPayload = AxisRange & {
    seriesSummaries: [FFTSeriesSummary, ...FFTSeriesSummary[]];
};

export function buildSelectionSummaryPayload(
    selectionRange: AxisRange,
    chartData: ChartSeriesData[],
    seriesList: PanelSeriesDefinition[],
): FFTSelectionPayload | undefined {
    if (chartData.length !== seriesList.length) {
        throw new Error(
            `Brush selection series mismatch: ${chartData.length} chart series for ${seriesList.length} panel series.`,
        );
    }

    const seriesSummaries = chartData.flatMap((series, index) => {
        const seriesConfig = seriesList[index];
        if (seriesConfig === undefined) {
            throw new Error(`Missing series config for chart data index ${index}.`);
        }

        let valueCount = 0;
        let totalValue = 0;
        let minimumValue = Infinity;
        let maximumValue = -Infinity;
        const sampleTimestamps: number[] = [];
        for (const [timestamp, value] of series.data) {
            if (
                timestamp < selectionRange.start ||
                timestamp > selectionRange.end ||
                value === null
            ) {
                continue;
            }
            valueCount += 1;
            totalValue += value;
            minimumValue = Math.min(minimumValue, value);
            maximumValue = Math.max(maximumValue, value);
            sampleTimestamps.push(timestamp);
        }

        if (valueCount === 0) return [];

        return [{
            series: seriesConfig,
            min: minimumValue.toFixed(5),
            max: maximumValue.toFixed(5),
            avg: (totalValue / valueCount).toFixed(5),
            sampleTimestamps,
        }];
    });

    const [firstSummary, ...remainingSummaries] = seriesSummaries;
    return firstSummary === undefined
        ? undefined
        : {
              ...selectionRange,
              seriesSummaries: [firstSummary, ...remainingSummaries],
          };
}
