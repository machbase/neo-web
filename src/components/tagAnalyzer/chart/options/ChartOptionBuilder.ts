import moment from 'moment';
import type { EChartsOption, SeriesOption } from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type {
    ChartSeriesItem,
    PanelSeriesConfig,
} from '../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    OVERLAP_CHART_BASE_OPTION,
    OVERLAP_CHART_COLORS,
    OVERLAP_GRID_OPTION,
    OVERLAP_LEGEND_OPTION,
    OVERLAP_TOOLBOX_OPTION,
    OVERLAP_X_AXIS_STATIC_OPTION,
    OVERLAP_Y_AXIS_STATIC_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
} from './ChartOptionConstants';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './OptionBuildHelpers/ChartAxisOptionBuilder';
import {
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './OptionBuildHelpers/PanelChartSectionOptionBuilder';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
} from './OptionBuildHelpers/HighlightSeriesOptionBuilder';
import { buildMainSeriesOption } from './OptionBuildHelpers/MainPanelSeriesOptionBuilder';
import { buildNavigatorSeriesOption } from './OptionBuildHelpers/NavigatorSeriesOptionBuilder';
import {
    buildSeriesAnnotationGuideLineSeries,
    buildSeriesAnnotationLabelSeries,
} from './OptionBuildHelpers/PanelSeriesAnnotationOptionBuilder';
import { buildChartTooltipOption } from './OptionBuildHelpers/PanelTooltipOptionBuilder';
import { calculateOverlapChartYAxisRange } from './OptionBuildHelpers/OverlapChartYAxisRangeCalculator';
import { buildOverlapTooltipOption } from './OptionBuildHelpers/OverlapTooltipOptionBuilder';

/**
 * Builds the full ECharts option for the panel chart and navigator pair.
 * Intent: Keep structural chart configuration in one explicit builder so panel renders stay predictable.
 * @param chartData The chart datasets to render in the panel.
 * @param navigatorRange The full navigator range that bounds the chart axes.
 * @param axes The panel axis settings used to build y-axes and thresholds.
 * @param display The display settings used to build legends, lines, and zoom UI.
 * @param isRaw Whether the panel is currently showing raw data.
 * @param useNormalize Whether right-axis normalization is currently enabled.
 * @param visibleSeries The current legend-selected visibility map.
 * @param navigatorChartData The chart datasets mirrored into the navigator lane.
 * @param hoveredLegendSeries The legend item currently being hovered, if any.
 * @param highlights The saved highlight ranges rendered over the main chart.
 * @returns The ECharts option for the main chart and slider pair.
 */
export function buildChartOption(
    chartData: ChartSeriesItem[],
    seriesList: PanelSeriesConfig[] = [],
    navigatorRange: TimeRangeMs,
    axes: PanelAxes,
    display: PanelDisplay,
    isRaw: boolean,
    useNormalize: boolean,
    visibleSeries: Record<string, boolean>,
    navigatorChartData: ChartSeriesItem[] = chartData,
    hoveredLegendSeries?: string | undefined,
    highlights: PanelHighlight[] = [],
): EChartsOption {
    const sYAxisOption = buildChartYAxisOption(axes, chartData, isRaw, useNormalize);
    const sHighlightOverlaySeries = buildHighlightOverlaySeriesOption(highlights);
    const sHighlightLabelSeries = buildHighlightLabelSeries(highlights, sYAxisOption[0]);
    const sAnnotationGuideLineSeries = buildSeriesAnnotationGuideLineSeries(
        seriesList,
        chartData,
        sYAxisOption,
        navigatorRange,
        visibleSeries,
    );
    const sAnnotationLabelSeries = buildSeriesAnnotationLabelSeries(
        seriesList,
        chartData,
        sYAxisOption,
        navigatorRange,
        visibleSeries,
    );
    const sMainSeries = buildMainSeriesOption(
        chartData,
        display,
        axes,
        hoveredLegendSeries,
    );
    const sNavigatorSeries = buildNavigatorSeriesOption(
        navigatorChartData,
        hoveredLegendSeries,
    );
    const sSeriesOption = buildChartSeriesOption(
        sHighlightOverlaySeries,
        sHighlightLabelSeries,
        sAnnotationGuideLineSeries,
        sAnnotationLabelSeries,
        sMainSeries,
        sNavigatorSeries,
    );

    return constructEChartOption(
        PANEL_CHART_BASE_OPTION,
        buildPanelChartGridOption(display.show_legend),
        buildPanelChartLegendOption(chartData, display, visibleSeries),
        buildChartTooltipOption(),
        buildChartXAxisOption(navigatorRange, display, axes),
        sYAxisOption,
        buildPanelChartDataZoomOption(display),
        PANEL_CHART_BRUSH_OPTION,
        sSeriesOption.series,
        HIDDEN_PANEL_TOOLBOX_OPTION,
        HIDDEN_PANEL_TITLE_OPTION,
    );
}


/**
 * Builds the ECharts `series` option patch for the panel chart.
 * Intent: Keep series option composition with the other chart option builders.
 * @param highlightOverlaySeries The already-built highlight overlay series.
 * @param highlightLabelSeries The already-built highlight label series.
 * @param annotationGuideLineSeries The already-built annotation guide-line series.
 * @param annotationLabelSeries The already-built annotation label series.
 * @param mainSeries The already-built main chart series.
 * @param navigatorSeries The already-built navigator chart series.
 * @returns The ECharts `series` option patch for the panel chart.
 */
export function buildChartSeriesOption(
    highlightOverlaySeries: SeriesOption[],
    highlightLabelSeries: SeriesOption[],
    annotationGuideLineSeries: SeriesOption[],
    annotationLabelSeries: SeriesOption[],
    mainSeries: SeriesOption[],
    navigatorSeries: SeriesOption[],
): { series: SeriesOption[] } {
    return {
        series: [
            ...highlightOverlaySeries,
            ...highlightLabelSeries,
            ...annotationGuideLineSeries,
            ...annotationLabelSeries,
            ...mainSeries,
            ...navigatorSeries,
        ],
    };
}

/**
 * Builds the single-grid chart option used by the overlap modal.
 * Intent: Keep chart option composition in one module while overlap-specific helpers own tooltip and y-axis rules.
 * @param chartData The overlap chart datasets to render.
 * @param seriesStartTimeList The original start times used to rebuild tooltip timestamps.
 * @param includeZeroInYAxisRange Whether the overlap y-axis should clamp against zero.
 * @returns The ECharts option for the overlap modal chart.
 */
export function buildOverlapChartOption(
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
    includeZeroInYAxisRange: boolean,
): EChartsOption {
    const sYAxisRange = calculateOverlapChartYAxisRange(
        chartData,
        includeZeroInYAxisRange,
    );

    return constructEChartOption(
        OVERLAP_CHART_BASE_OPTION,
        OVERLAP_GRID_OPTION,
        OVERLAP_LEGEND_OPTION,
        buildOverlapTooltipOption(chartData, seriesStartTimeList),
        {
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (overlapXAxisValue: number) =>
                    moment.utc(overlapXAxisValue).format('HH:mm:ss'),
            },
        },
        {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: sYAxisRange.min,
            max: sYAxisRange.max,
        },
        undefined,
        undefined,
        chartData.map((series, seriesIndex) => {
            const sSeriesColor =
                series.color ??
                OVERLAP_CHART_COLORS[seriesIndex % OVERLAP_CHART_COLORS.length];

            return {
                id: `overlap-series-${seriesIndex}`,
                name: series.name,
                type: 'line',
                data: series.data,
                showSymbol: false,
                lineStyle: {
                    width: 0.5,
                    color: sSeriesColor,
                },
                itemStyle: {
                    color: sSeriesColor,
                },
                animation: false,
                sampling: series.data.length > 1000 ? 'lttb' : undefined,
            };
        }),
        OVERLAP_TOOLBOX_OPTION,
        undefined,
    );
}


/**
 * Constructs one ECharts option from prebuilt option sections.
 * Intent: Keep final option assembly separate from section calculation.
 */
function constructEChartOption(
    baseOption: EChartsOption,
    grid: EChartsOption['grid'],
    legend: EChartsOption['legend'],
    tooltip: EChartsOption['tooltip'],
    xAxis: EChartsOption['xAxis'],
    yAxis: EChartsOption['yAxis'],
    dataZoom: EChartsOption['dataZoom'],
    brush: EChartsOption['brush'],
    series: EChartsOption['series'],
    toolbox: EChartsOption['toolbox'],
    title: EChartsOption['title'],
): EChartsOption {
    return {
        ...baseOption,
        grid: grid,
        legend: legend,
        tooltip: tooltip,
        xAxis: xAxis,
        yAxis: yAxis,
        dataZoom: dataZoom,
        brush: brush,
        series: series,
        toolbox: toolbox,
        title: title,
    };
}
