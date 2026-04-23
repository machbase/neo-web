import moment from 'moment';
import type { EChartsOption, SeriesOption } from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    OVERLAP_CHART_BASE_OPTION,
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
} from './OptionBuildHelpers/ChartOptionSections';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
} from './OptionBuildHelpers/ChartHighlightSeriesOptions';
import { buildMainSeriesOption } from './OptionBuildHelpers/ChartMainSeriesOptions';
import { buildNavigatorSeriesOption } from './OptionBuildHelpers/ChartNavigatorSeriesOptions';
import { buildChartTooltipOption } from './OptionBuildHelpers/ChartTooltipOption';
import { resolveOverlapYAxisRange } from './OptionBuildHelpers/OverlapYAxisRangeResolver';
import { buildOverlapTooltipOption } from './OverlapTooltipOption';

/**
 * Builds the full ECharts option for the panel chart and navigator pair.
 * Intent: Keep structural chart configuration in one explicit builder so panel renders stay predictable.
 * @param aChartData The chart datasets to render in the panel.
 * @param aNavigatorRange The full navigator range that bounds the chart axes.
 * @param aAxes The panel axis settings used to build y-axes and thresholds.
 * @param aDisplay The display settings used to build legends, lines, and zoom UI.
 * @param aIsRaw Whether the panel is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @param aVisibleSeries The current legend-selected visibility map.
 * @param aNavigatorChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @param aHighlights The saved highlight ranges rendered over the main chart.
 * @returns The ECharts option for the main chart and slider pair.
 */
export function buildChartOption(
    aChartData: ChartSeriesItem[],
    aNavigatorRange: TimeRangeMs,
    aAxes: PanelAxes,
    aDisplay: PanelDisplay,
    aIsRaw: boolean,
    aUseNormalize: boolean,
    aVisibleSeries: Record<string, boolean>,
    aNavigatorChartData: ChartSeriesItem[] = aChartData,
    aHoveredLegendSeries?: string | undefined,
    aHighlights: PanelHighlight[] = [],
): EChartsOption {
    const sYAxisOption = buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize);
    const sHighlightOverlaySeries = buildHighlightOverlaySeriesOption(aHighlights);
    const sHighlightLabelSeries = buildHighlightLabelSeries(aHighlights, sYAxisOption[0]);
    const sMainSeries = buildMainSeriesOption(
        aChartData,
        aDisplay,
        aAxes,
        aHoveredLegendSeries,
    );
    const sNavigatorSeries = buildNavigatorSeriesOption(
        aNavigatorChartData,
        aHoveredLegendSeries,
    );
    const sSeriesOption = buildChartSeriesOption(
        sHighlightOverlaySeries,
        sHighlightLabelSeries,
        sMainSeries,
        sNavigatorSeries,
    );

    return constructEChartOption(
        PANEL_CHART_BASE_OPTION,
        buildPanelChartGridOption(aDisplay.show_legend),
        buildPanelChartLegendOption(aChartData, aDisplay, aVisibleSeries),
        buildChartTooltipOption(),
        buildChartXAxisOption(aNavigatorRange, aDisplay, aAxes),
        sYAxisOption,
        buildPanelChartDataZoomOption(aDisplay),
        PANEL_CHART_BRUSH_OPTION,
        sSeriesOption.series,
        HIDDEN_PANEL_TOOLBOX_OPTION,
        HIDDEN_PANEL_TITLE_OPTION,
    );
}

/**
 * Constructs one ECharts option from prebuilt option sections.
 * Intent: Keep final option assembly separate from section calculation.
 * @param aBaseOption The static base chart option.
 * @param aGrid The prebuilt grid option.
 * @param aLegend The prebuilt legend option.
 * @param aTooltip The prebuilt tooltip option.
 * @param aXAxis The prebuilt x-axis option.
 * @param aYAxis The prebuilt y-axis option.
 * @param aDataZoom The prebuilt dataZoom option.
 * @param aBrush The prebuilt brush option.
 * @param aSeries The prebuilt series option.
 * @param aToolbox The prebuilt toolbox option.
 * @param aTitle The prebuilt title option.
 * @returns The constructed ECharts option.
 */
function constructEChartOption(
    aBaseOption: EChartsOption,
    aGrid: EChartsOption['grid'],
    aLegend: EChartsOption['legend'],
    aTooltip: EChartsOption['tooltip'],
    aXAxis: EChartsOption['xAxis'],
    aYAxis: EChartsOption['yAxis'],
    aDataZoom: EChartsOption['dataZoom'],
    aBrush: EChartsOption['brush'],
    aSeries: EChartsOption['series'],
    aToolbox: EChartsOption['toolbox'],
    aTitle: EChartsOption['title'],
): EChartsOption {
    return {
        ...aBaseOption,
        grid: aGrid,
        legend: aLegend,
        tooltip: aTooltip,
        xAxis: aXAxis,
        yAxis: aYAxis,
        dataZoom: aDataZoom,
        brush: aBrush,
        series: aSeries,
        toolbox: aToolbox,
        title: aTitle,
    };
}

/**
 * Builds the ECharts `series` option patch for the panel chart.
 * Intent: Keep series option composition with the other chart option builders.
 * @param aHighlightOverlaySeries The already-built highlight overlay series.
 * @param aHighlightLabelSeries The already-built highlight label series.
 * @param aMainSeries The already-built main chart series.
 * @param aNavigatorSeries The already-built navigator chart series.
 * @returns The ECharts `series` option patch for the panel chart.
 */
export function buildChartSeriesOption(
    aHighlightOverlaySeries: SeriesOption[],
    aHighlightLabelSeries: SeriesOption[],
    aMainSeries: SeriesOption[],
    aNavigatorSeries: SeriesOption[],
): { series: SeriesOption[] } {
    return {
        series: [
            ...aHighlightOverlaySeries,
            ...aHighlightLabelSeries,
            ...aMainSeries,
            ...aNavigatorSeries,
        ],
    };
}

/**
 * Builds the single-grid chart option used by the overlap modal.
 * Intent: Keep chart option composition in one module while overlap-specific helpers own tooltip and y-axis rules.
 * @param aChartData The overlap chart datasets to render.
 * @param aStartTimeList The original start times used to rebuild tooltip timestamps.
 * @param aZeroBase Whether the overlap y-axis should clamp against zero.
 * @returns The ECharts option for the overlap modal chart.
 */
export function buildOverlapChartOption(
    aChartData: ChartSeriesItem[],
    aStartTimeList: number[],
    aZeroBase: boolean,
): EChartsOption {
    const sYAxisRange = resolveOverlapYAxisRange(aChartData, aZeroBase);

    return constructEChartOption(
        OVERLAP_CHART_BASE_OPTION,
        OVERLAP_GRID_OPTION,
        OVERLAP_LEGEND_OPTION,
        buildOverlapTooltipOption(aChartData, aStartTimeList),
        {
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (aValue: number) => moment.utc(aValue).format('HH:mm:ss'),
            },
        },
        {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: sYAxisRange.min,
            max: sYAxisRange.max,
        },
        undefined,
        undefined,
        aChartData.map((aSeries, aIndex) => ({
            id: `overlap-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            data: aSeries.data,
            showSymbol: false,
            lineStyle: {
                width: 0.5,
                color: aSeries.color,
            },
            itemStyle: {
                color: aSeries.color,
            },
            animation: false,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
        })),
        OVERLAP_TOOLBOX_OPTION,
        undefined,
    );
}
