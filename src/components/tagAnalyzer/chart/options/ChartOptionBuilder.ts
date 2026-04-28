import type { EChartsOption, SeriesOption, YAXisComponentOption } from 'echarts';
import type { PanelChartInfo } from '../ChartInfoTypes';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
} from './OptionBuildHelpers/ChartOptionConstants';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './OptionBuildHelpers/ChartAxisOptionBuilder';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
    buildMainSeriesOption,
    buildNavigatorSeriesOption,
    buildSeriesAnnotationSeries,
} from './OptionBuildHelpers/ChartSeriesOptionBuilder';
import {
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './OptionBuildHelpers/PanelChartSectionOptionBuilder';
import {
    buildChartTooltipOption,
} from './OptionBuildHelpers/ChartTooltipOptionBuilder';

export function buildChartOption(chartInfo: PanelChartInfo): EChartsOption {
    const yAxisOption = buildChartYAxisOption(
        chartInfo.axes,
        chartInfo.mainSeriesData,
        chartInfo.isRaw,
        chartInfo.useNormalize,
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
    chartInfo: PanelChartInfo,
    yAxisOption?: YAXisComponentOption[],
): { series: SeriesOption[] } {
    const resolvedYAxisOption =
        yAxisOption ??
        buildChartYAxisOption(
            chartInfo.axes,
            chartInfo.mainSeriesData,
            chartInfo.isRaw,
            chartInfo.useNormalize,
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
        ],
    };
}
