import type { EChartsOption, SeriesOption, YAXisComponentOption } from 'echarts';
import type { ChartInfo } from '../types/PanelChartTypes';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
} from './PanelChartOptionConstants';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './buildPanelChartAxisOptions';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeries,
} from './buildPanelHighlightSeriesOptions';
import {
    buildMainSeriesOption,
} from './buildPanelMainSeriesOptions';
import {
    buildNavigatorSeriesOption,
} from './buildPanelNavigatorSeriesOptions';
import {
    buildNavigatorAnnotationLineSeries,
    buildSeriesAnnotationSeries,
} from './buildPanelAnnotationSeriesOptions';
import {
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './buildPanelChartSectionOptions';
import {
    buildChartTooltipOption,
} from './buildPanelChartTooltipOption';

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
        grid: buildPanelChartGridOption(chartInfo.display.show_legend),
        legend: buildPanelChartLegendOption(
            chartInfo.mainSeriesData,
            chartInfo.display,
            chartInfo.visibleSeries,
        ),
        tooltip: buildChartTooltipOption(chartInfo.isNumericXAxis),
        xAxis: buildChartXAxisOption(
            chartInfo.navigatorRange,
            chartInfo.display,
            chartInfo.axes,
            chartInfo.isNumericXAxis,
        ),
        yAxis: yAxisOption,
        dataZoom: buildPanelChartDataZoomOption(
            chartInfo.display,
            chartInfo.panelRange,
            chartInfo.navigatorSelectionMinValueSpan,
        ),
        brush: PANEL_CHART_BRUSH_OPTION,
        series: buildChartSeriesOption(chartInfo, yAxisOption).series,
        toolbox: HIDDEN_PANEL_TOOLBOX_OPTION,
        title: HIDDEN_PANEL_TITLE_OPTION,
    };
}

export function buildChartSeriesOption(
    chartInfo: ChartInfo,
    yAxisOption?: YAXisComponentOption[],
): { series: SeriesOption[] } {
    const resolvedYAxisOption =
        yAxisOption ??
        buildChartYAxisOption(
            chartInfo.axes,
            chartInfo.mainSeriesData,
            chartInfo.isRaw,
            chartInfo.useNormalize,
            chartInfo.panelRange,
        );
    return {
        series: [
            ...buildHighlightOverlaySeries(chartInfo.highlights, 'main'),
            ...buildHighlightLabelSeries(chartInfo.highlights, resolvedYAxisOption[0]),
            ...buildSeriesAnnotationSeries(
                chartInfo.annotations,
                chartInfo.seriesDefinitions,
                chartInfo.mainSeriesData,
                resolvedYAxisOption,
                chartInfo.panelRange,
                chartInfo.visibleSeries,
            ),
            ...buildMainSeriesOption(
                chartInfo.mainSeriesData,
                chartInfo.display,
                chartInfo.axes,
                chartInfo.hoveredLegendSeries,
            ),
            ...buildNavigatorSeriesOption(
                chartInfo.navigatorSeriesData,
                chartInfo.hoveredLegendSeries,
            ),
            ...buildHighlightOverlaySeries(chartInfo.highlights, 'navigator'),
            ...buildNavigatorAnnotationLineSeries(
                chartInfo.annotations,
                chartInfo.seriesDefinitions,
                chartInfo.mainSeriesData,
                resolvedYAxisOption,
                chartInfo.navigatorRange,
                chartInfo.visibleSeries,
            ),
        ],
    };
}
