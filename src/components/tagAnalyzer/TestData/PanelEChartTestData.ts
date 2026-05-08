import type { ChartInfo } from '../chart/ChartTypes';
import { buildChartOption } from '../chart/options/ChartOptionBuilder';
import {
    createTagAnalyzerChartSeriesListFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerTimeRangeFixture,
} from './PanelTestData';
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
        const chartInfo: ChartInfo = {
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


