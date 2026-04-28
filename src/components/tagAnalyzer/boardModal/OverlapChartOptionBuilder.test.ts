import { createTagAnalyzerChartSeriesDataFixture } from '../TestData/PanelTestData';
import {
    buildOverlapChartOption,
    type OverlapChartInfo,
} from './OverlapChartOptionBuilder';

describe('buildOverlapChartOption', () => {
    it('rounds overlap chart max up to the same clean ceiling', () => {
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

        expect(yAxis.max).toBe(20);
    });
});
