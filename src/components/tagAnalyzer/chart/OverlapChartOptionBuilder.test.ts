import { createTagAnalyzerChartSeriesDataFixture } from '../TestData/PanelTestData';
import {
    buildOverlapChartOption,
    type OverlapChartInfo,
} from './options/OverlapChartOptionBuilder';

describe('buildOverlapChartOption', () => {
    it('uses the shared y-axis range calculation for overlap charts', () => {
        const chartData = [
            createTagAnalyzerChartSeriesDataFixture({
                data: [
                    [0, 10],
                    [1_000, 15],
                ],
            }),
        ];
        const yAxis = buildOverlapChartOption({
            seriesData: chartData,
            seriesStartTimeList: [0],
            includeZeroInYAxisRange: true,
        } satisfies OverlapChartInfo).yAxis as { max?: number };

        expect(yAxis.max).toBe(15);
    });

    it('formats overlap x-axis labels as elapsed time instead of clock time', () => {
        const xAxis = buildOverlapChartOption({
            seriesData: [
                createTagAnalyzerChartSeriesDataFixture({
                    data: [[0, 1]],
                }),
            ],
            seriesStartTimeList: [0],
            includeZeroInYAxisRange: false,
        } satisfies OverlapChartInfo).xAxis as {
            axisLabel?: { formatter?: (value: number) => string };
        };

        expect(xAxis.axisLabel?.formatter?.(0)).toBe('00:00');
        expect(xAxis.axisLabel?.formatter?.(25 * 60 * 60 * 1000)).toBe('25:00');
    });
});
