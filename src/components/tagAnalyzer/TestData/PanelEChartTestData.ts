import { buildChartOption } from '../chart/options/ChartOptionBuilder';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerTimeRangeFixture,
} from './PanelTestData';

/**
 * Builds a compact chart option for layout-focused chart option tests.
 * Intent: Keep chart-option tests focused on the layout branches that matter.
 * @param {boolean} aShowLegend Whether the legend row is enabled in the test layout.
 * @returns {ReturnType<typeof buildChartOption>} A chart option that only exercises the panel layout paths.
 */
export const createPanelChartLayoutOptionFixture = (aShowLegend: boolean) =>
    buildChartOption(
        createTagAnalyzerChartSeriesListFixture(),
        createTagAnalyzerTimeRangeFixture({ startTime: 0, endTime: 1_000 }),
        createTagAnalyzerPanelAxesFixture({
            right_y_axis: { enabled: true },
        }),
        createTagAnalyzerPanelDisplayFixture({
            show_legend: aShowLegend,
            use_zoom: true,
            chart_type: 'Line',
            show_point: true,
            point_radius: 2,
            fill: 0,
            stroke: 2,
        }),
        false,
        false,
        { 'temp(avg)': true },
    );


