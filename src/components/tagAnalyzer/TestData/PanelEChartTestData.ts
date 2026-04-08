import { buildPanelChartOption } from '../panel/PanelEChartUtil';
import {
    createTagAnalyzerChartDataFixture,
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerTimeRangeFixture,
} from './PanelTestData';

/**
 * Builds a compact chart option for layout-focused PanelEChartUtil tests.
 * @param aShowLegend Whether the legend row is enabled in the test layout.
 * @returns A chart option that only exercises the panel layout paths.
 */
export const createPanelChartLayoutOptionFixture = (aShowLegend: 'Y' | 'N') =>
    buildPanelChartOption({
        chartData: createTagAnalyzerChartSeriesListFixture(),
        navigatorData: createTagAnalyzerChartDataFixture(),
        navigatorRange: createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1_000 }),
        axes: createTagAnalyzerPanelAxesFixture({ use_right_y2: 'Y' }),
        display: createTagAnalyzerPanelDisplayFixture({
            show_legend: aShowLegend,
            use_zoom: 'Y',
            chart_type: 'Line',
            show_point: 'Y',
            point_radius: 2,
            fill: 0,
            stroke: 2,
        }),
        isRaw: false,
        useNormalize: 'N',
        visibleSeries: { 'temp(avg)': true },
    });
