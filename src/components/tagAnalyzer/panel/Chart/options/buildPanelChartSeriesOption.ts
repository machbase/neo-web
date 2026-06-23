import type { SeriesOption, YAXisComponentOption } from 'echarts';
import type { ChartInfo } from '../types/PanelChartTypes';
import { buildChartYAxisOption } from './buildPanelChartAxisOptions';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeries,
} from './buildPanelHighlightSeriesOptions';
import {
    buildMainSeriesOption,
    buildNavigatorSeriesOption,
} from './buildPanelSeriesOptions';
import {
    buildNavigatorAnnotationLineSeries,
    buildSeriesAnnotationSeries,
} from './buildPanelAnnotationSeriesOptions';

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
            chartInfo.displayPanelRange,
        );
    const sRenderableHighlights = chartInfo.draftHighlight
        ? [...chartInfo.highlights, chartInfo.draftHighlight]
        : chartInfo.highlights;

    return {
        series: [
            ...buildHighlightOverlaySeries(sRenderableHighlights, 'main'),
            ...buildHighlightLabelSeries(sRenderableHighlights, resolvedYAxisOption[0]),
            ...buildSeriesAnnotationSeries(
                chartInfo.annotations,
                chartInfo.seriesDefinitions,
                chartInfo.mainSeriesData,
                resolvedYAxisOption,
                chartInfo.displayPanelRange,
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
            ...buildHighlightOverlaySeries(sRenderableHighlights, 'navigator'),
            ...buildNavigatorAnnotationLineSeries(
                chartInfo.annotations,
                chartInfo.seriesDefinitions,
                chartInfo.mainSeriesData,
                resolvedYAxisOption,
                chartInfo.displayNavigatorRange,
                chartInfo.visibleSeries,
            ),
        ],
    };
}
