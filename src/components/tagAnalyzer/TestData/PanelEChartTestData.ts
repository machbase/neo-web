import type { PanelChartInfo } from '../chart/ChartInfoTypes';
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
 * @param {boolean} showLegend Whether the legend row is enabled in the test layout.
 * @returns {ReturnType<typeof buildChartOption>} A chart option that only exercises the panel layout paths.
 */
export const createPanelChartLayoutOptionFixture = (showLegend: boolean) =>
    {
        const chartData = createTagAnalyzerChartSeriesListFixture();
        const navigatorRange = createTagAnalyzerTimeRangeFixture({
            startTime: 0,
            endTime: 1_000,
        });
        const axes = createTagAnalyzerPanelAxesFixture({
            right_y_axis_enabled: true,
        });
        const display = createTagAnalyzerPanelDisplayFixture({
            show_legend: showLegend,
            use_zoom: true,
            chart_type: 'Line',
            show_point: true,
            point_radius: 2,
            fill: 0,
            stroke: 2,
        });
        const visibleSeries = { 'temp(avg)': true };
        const chartInfo: PanelChartInfo = {
            mainSeriesData: chartData,
            seriesDefinitions: [],
            navigatorRange: navigatorRange,
            axes: axes,
            display: display,
            isRaw: false,
            useNormalize: false,
            visibleSeries: visibleSeries,
            navigatorSeriesData: chartData,
            highlights: [],
        };
        return buildChartOption(chartInfo);
    };


