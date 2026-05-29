import type { EChartsOption } from 'echarts';
import type { ChartInfo } from '../types/PanelChartTypes';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './buildPanelChartAxisOptions';
import { buildPanelChartFrameOptions } from './buildPanelChartFrameOptions';
import { buildChartSeriesOption } from './buildPanelChartSeriesOption';

const PANEL_CHART_BASE_OPTION: EChartsOption = {
    animation: false,
    backgroundColor: '#252525',
    textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
};

export function buildChartOption(chartInfo: ChartInfo): EChartsOption {
    const yAxisOption = buildChartYAxisOption(
        chartInfo.axes,
        chartInfo.mainSeriesData,
        chartInfo.isRaw,
        chartInfo.useNormalize,
        chartInfo.panelRange,
    );

    return {
        ...PANEL_CHART_BASE_OPTION,
        ...buildPanelChartFrameOptions(chartInfo),
        xAxis: buildChartXAxisOption(
            chartInfo.panelRange,
            chartInfo.navigatorRange,
            chartInfo.display,
            chartInfo.axes,
            chartInfo.isNumericXAxis,
        ),
        yAxis: yAxisOption,
        series: buildChartSeriesOption(chartInfo, yAxisOption).series,
    };
}
