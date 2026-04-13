import { buildPanelChartOption } from '../panel/PanelChartOptions';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerTimeRangeFixture,
} from './PanelTestData';

/**
 * Builds a compact chart option for layout-focused PanelChartOptions tests.
 * @param aShowLegend Whether the legend row is enabled in the test layout.
 * @returns A chart option that only exercises the panel layout paths.
 */
export const createPanelChartLayoutOptionFixture = (aShowLegend: 'Y' | 'N') =>
    buildPanelChartOption(
        createTagAnalyzerChartSeriesListFixture(),
        createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1_000 }),
        createTagAnalyzerPanelAxesFixture({ use_right_y2: 'Y' }),
        createTagAnalyzerPanelDisplayFixture({
            show_legend: aShowLegend,
            use_zoom: 'Y',
            chart_type: 'Line',
            show_point: 'Y',
            point_radius: 2,
            fill: 0,
            stroke: 2,
        }),
        false,
        'N',
        { 'temp(avg)': true },
    );
