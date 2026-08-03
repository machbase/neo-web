import { createNewPanelInfo } from '../panel/panelModel';
import type { ChartSeriesData } from './chartData';
import {
    buildChartOption,
    buildChartSeriesOption,
    chartAxis,
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_NAVIGATOR_SERIES_ID_PREFIX,
} from './chartModel';
import {
    resolveRuntimePanelChartConfig,
    type PanelChartRuntime,
} from './chartRuntime';

function createSeries(data: ChartSeriesData['data']): ChartSeriesData {
    return {
        name: 'Series',
        data,
        yAxis: 0,
        marker: undefined,
        color: '#123456',
    };
}

function createRuntime(): PanelChartRuntime {
    const series = createSeries([[1, 2], [2, 4]]);

    return {
        config: resolveRuntimePanelChartConfig(
            createNewPanelInfo([], 'Chart', 'Line'),
        ),
        data: {
            chartData: [series],
            navigatorChartData: [series],
        },
        ranges: {
            mainRange: { start: 0, end: 5 },
            navigatorRange: { start: -5, end: 10 },
        },
        interaction: {
            visibleSeries: {},
            isWheelZoomEnabled: true,
        },
        rendering: {
            isNumericXAxis: true,
            animateMainDataUpdate: false,
            animateNavigatorDataUpdate: false,
        },
    };
}

describe('panel chart model', () => {
    it('keeps main and navigator data series on their assigned axes', () => {
        const series = buildChartSeriesOption(createRuntime());

        expect(series).toHaveLength(2);
        expect(series[0]).toMatchObject({
            id: `${MAIN_PANEL_SERIES_ID_PREFIX}0`,
            data: [[1, 2], [2, 4]],
            xAxisIndex: 0,
            yAxisIndex: 0,
        });
        expect(series[1]).toMatchObject({
            id: `${PANEL_NAVIGATOR_SERIES_ID_PREFIX}0`,
            data: [[1, 2], [2, 4]],
            xAxisIndex: 2,
            yAxisIndex: 2,
        });
        expect(buildChartOption(createRuntime()).series).toEqual(series);
    });

    it('includes zero in automatic bounds only when requested', () => {
        const chartData = [createSeries([[1, 2], [2, 4]])];

        expect(chartAxis.resolveValueRange(chartData, false)).toEqual({
            min: 2,
            max: 4,
        });
        expect(chartAxis.resolveValueRange(chartData, true)).toEqual({
            min: 0,
            max: 4,
        });
    });
});
