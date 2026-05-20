import type { EChartsOption, SeriesOption, YAXisComponentOption } from 'echarts';
import type { ChartInfo } from '../ChartTypes';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
} from './ChartOptionConstants';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './ChartAxisOptionBuilder';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
    buildMainSeriesOption,
    buildNavigatorAnnotationLineSeries,
    buildNavigatorHighlightOverlaySeriesOption,
    buildNavigatorSeriesOption,
    buildSeriesAnnotationSeries,
} from './ChartSeriesOptionBuilder';
import {
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './PanelChartSectionOptionBuilder';
import {
    buildChartTooltipOption,
} from './ChartTooltipOptionBuilder';

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
        tooltip: buildChartTooltipOption(),
        xAxis: buildChartXAxisOption(
            chartInfo.navigatorRange,
            chartInfo.display,
            chartInfo.axes,
        ),
        yAxis: yAxisOption,
        dataZoom: buildPanelChartDataZoomOption(chartInfo.display),
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
    const annotationSeries = buildSeriesAnnotationSeries(
        chartInfo.seriesDefinitions,
        chartInfo.mainSeriesData,
        resolvedYAxisOption,
        chartInfo.navigatorRange,
        chartInfo.visibleSeries,
    );
    const isDisplayNavigatorSeries = chartInfo.navigatorSeriesData.length > 0;
    const isDisplayHighlightSeries = chartInfo.highlights.length > 0;
    const isDisplayAnnotationSeries = chartInfo.seriesDefinitions.some(
        (seriesInfo) => (seriesInfo.annotations?.length ?? 0) > 0,
    );
    const mainSeries = buildMainSeriesOption(
        chartInfo.mainSeriesData,
        chartInfo.display,
        chartInfo.axes,
        chartInfo.hoveredLegendSeries,
    );
    const navigatorSeries = buildNavigatorSeriesOption(
        chartInfo.navigatorSeriesData,
        chartInfo.hoveredLegendSeries,
    );
    const navigatorHighlightOverlaySeries = buildNavigatorHighlightOverlaySeriesOption(
        chartInfo.highlights,
    );
    const navigatorAnnotationLineSeries = buildNavigatorAnnotationLineSeries(
        chartInfo.seriesDefinitions,
        chartInfo.mainSeriesData,
        resolvedYAxisOption,
        chartInfo.navigatorRange,
        chartInfo.visibleSeries,
    );
    const highlightOverlaySeries = buildHighlightOverlaySeriesOption(
        chartInfo.highlights,
    );
    const highlightLabelSeries = buildHighlightLabelSeries(
        chartInfo.highlights,
        resolvedYAxisOption[0],
    );

    return {
        series: [
            ...(isDisplayHighlightSeries
                ? highlightOverlaySeries
                : []),
            ...(isDisplayHighlightSeries
                ? highlightLabelSeries
                : []),
            ...(isDisplayAnnotationSeries
                ? annotationSeries.guideLineSeries
                : []),
            ...(isDisplayAnnotationSeries
                ? annotationSeries.labelSeries
                : []),
            ...mainSeries,
            ...(isDisplayNavigatorSeries
                ? navigatorSeries
                : []),
            ...navigatorHighlightOverlaySeries,
            ...navigatorAnnotationLineSeries,
        ],
    };
}
