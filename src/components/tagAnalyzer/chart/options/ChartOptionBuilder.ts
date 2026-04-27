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
} from './OptionBuildHelpers/ChartOptionConstants';
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
    buildSeriesAnnotationSeries,
} from './OptionBuildHelpers/PanelSeriesAnnotationOptionBuilder';
import { buildChartTooltipOption } from './OptionBuildHelpers/PanelTooltipOptionBuilder';
import { calculateOverlapChartYAxisRange } from './OptionBuildHelpers/OverlapChartYAxisRangeCalculator';
import { buildOverlapTooltipOption } from './OptionBuildHelpers/OverlapTooltipOptionBuilder';

export type PanelChartSeriesLayers = {
    yAxisOption: ReturnType<typeof buildChartYAxisOption>;
    highlightOverlaySeries: SeriesOption[];
    highlightLabelSeries: SeriesOption[];
    annotationGuideLineSeries: SeriesOption[];
    annotationLabelSeries: SeriesOption[];
    mainSeries: SeriesOption[];
    navigatorSeries: SeriesOption[];
};

type BuildPanelChartSeriesLayersParams = {
    chartData: ChartSeriesItem[];
    seriesList?: PanelSeriesConfig[];
    navigatorRange: TimeRangeMs;
    axes: PanelAxes;
    display: PanelDisplay;
    isRaw: boolean;
    useNormalize: boolean;
    visibleSeries: Record<string, boolean>;
    navigatorChartData?: ChartSeriesItem[];
    hoveredLegendSeries?: string | undefined;
    highlights?: PanelHighlight[];
};

export function buildPanelChartSeriesLayers({
    chartData,
    seriesList = [],
    navigatorRange,
    axes,
    display,
    isRaw,
    useNormalize,
    visibleSeries,
    navigatorChartData = chartData,
    hoveredLegendSeries,
    highlights = [],
}: BuildPanelChartSeriesLayersParams): PanelChartSeriesLayers {
    const sYAxisOption = buildChartYAxisOption(axes, chartData, isRaw, useNormalize);
    const sAnnotationSeries = buildSeriesAnnotationSeries(
        seriesList,
        chartData,
        sYAxisOption,
        navigatorRange,
        visibleSeries,
    );

    return {
        yAxisOption: sYAxisOption,
        highlightOverlaySeries: buildHighlightOverlaySeriesOption(highlights),
        highlightLabelSeries: buildHighlightLabelSeries(highlights, sYAxisOption[0]),
        annotationGuideLineSeries: sAnnotationSeries.guideLineSeries,
        annotationLabelSeries: sAnnotationSeries.labelSeries,
        mainSeries: buildMainSeriesOption(
            chartData,
            display,
            axes,
            hoveredLegendSeries,
        ),
        navigatorSeries: buildNavigatorSeriesOption(
            navigatorChartData,
            hoveredLegendSeries,
        ),
    };
}

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
    const sSeriesLayers = buildPanelChartSeriesLayers({
        chartData,
        seriesList,
        navigatorRange,
        axes,
        display,
        isRaw,
        useNormalize,
        visibleSeries,
        navigatorChartData,
        hoveredLegendSeries,
        highlights,
    });
    return {
        ...PANEL_CHART_BASE_OPTION,
        grid: buildPanelChartGridOption(display.show_legend),
        legend: buildPanelChartLegendOption(chartData, display, visibleSeries),
        tooltip: buildChartTooltipOption(),
        xAxis: buildChartXAxisOption(navigatorRange, display, axes),
        yAxis: sSeriesLayers.yAxisOption,
        dataZoom: buildPanelChartDataZoomOption(display),
        brush: PANEL_CHART_BRUSH_OPTION,
        series: buildChartSeriesOption(
            sSeriesLayers.highlightOverlaySeries,
            sSeriesLayers.highlightLabelSeries,
            sSeriesLayers.annotationGuideLineSeries,
            sSeriesLayers.annotationLabelSeries,
            sSeriesLayers.mainSeries,
            sSeriesLayers.navigatorSeries,
        ).series,
        toolbox: HIDDEN_PANEL_TOOLBOX_OPTION,
        title: HIDDEN_PANEL_TITLE_OPTION,
    };
}

export function buildChartSeriesOption(
    ...seriesGroups: SeriesOption[][]
): { series: SeriesOption[] } {
    return { series: seriesGroups.flat() };
}

export function buildOverlapChartOption(
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
    includeZeroInYAxisRange: boolean,
): EChartsOption {
    const sYAxisRange = calculateOverlapChartYAxisRange(
        chartData,
        includeZeroInYAxisRange,
    );

    return {
        ...OVERLAP_CHART_BASE_OPTION,
        grid: OVERLAP_GRID_OPTION,
        legend: OVERLAP_LEGEND_OPTION,
        tooltip: buildOverlapTooltipOption(chartData, seriesStartTimeList),
        xAxis: {
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (overlapXAxisValue: number) =>
                    moment.utc(overlapXAxisValue).format('HH:mm:ss'),
            },
        },
        yAxis: {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: sYAxisRange.min,
            max: sYAxisRange.max,
        },
        series: chartData.map((series, seriesIndex) => {
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
        toolbox: OVERLAP_TOOLBOX_OPTION,
    };
}
