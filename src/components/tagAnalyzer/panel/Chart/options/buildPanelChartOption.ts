import type { EChartsOption } from 'echarts';
import type { ChartInfo } from '../types/PanelChartTypes';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './buildPanelChartAxisOptions';
import { buildPanelChartFrameOptions } from './buildPanelChartFrameOptions';
import { buildChartSeriesOption } from './buildPanelChartSeriesOption';

const PANEL_CHART_BASE_OPTION: EChartsOption = {
    animation: true,
    animationDuration: 280,
    animationDurationUpdate: 180,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    backgroundColor: '#252525',
    textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
};

export function buildChartFrameOption(chartInfo: ChartInfo): EChartsOption {
    const yAxisOption = buildChartYAxisOption(
        chartInfo.axes,
        chartInfo.mainSeriesData,
        chartInfo.isRaw,
        chartInfo.useNormalize,
        chartInfo.displayPanelRange,
    );

    return {
        ...PANEL_CHART_BASE_OPTION,
        ...buildPanelChartFrameOptions(chartInfo),
        xAxis: buildChartXAxisOption(
            chartInfo.displayPanelRange,
            chartInfo.displayNavigatorRange,
            chartInfo.display,
            chartInfo.axes,
            chartInfo.isNumericXAxis,
        ),
        yAxis: yAxisOption,
    };
}

export function buildChartOption(chartInfo: ChartInfo): EChartsOption {
    const frameOption = buildChartFrameOption(chartInfo);

    return {
        ...frameOption,
        series: buildChartSeriesOption(
            chartInfo,
            Array.isArray(frameOption.yAxis) ? frameOption.yAxis : undefined,
        ).series,
    };
}
