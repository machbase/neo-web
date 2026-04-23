import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import type { PanelChartOption } from './ChartOptionTypes';
import {
    buildChartXAxisOption,
    buildChartYAxisOption,
} from './ChartAxisOptionBuilder';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
    PANEL_NO_DATA_OPTION,
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './ChartOptionSections';
import { buildChartSeriesOption } from './ChartSeriesOptionBuilder';
import { buildChartTooltipOption } from './ChartTooltipOption';

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
): PanelChartOption {
    return {
        ...PANEL_CHART_BASE_OPTION,
        grid: buildPanelChartGridOption(aDisplay),
        legend: buildPanelChartLegendOption(aChartData, aDisplay, aVisibleSeries),
        tooltip: buildChartTooltipOption(),
        xAxis: buildChartXAxisOption(aNavigatorRange, aDisplay, aAxes),
        yAxis: buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize),
        dataZoom: buildPanelChartDataZoomOption(aDisplay),
        brush: PANEL_CHART_BRUSH_OPTION,
        ...buildChartSeriesOption(
            aChartData,
            aDisplay,
            aAxes,
            aNavigatorChartData,
            aHoveredLegendSeries,
            aHighlights,
            aNavigatorRange,
            aIsRaw,
            aUseNormalize,
        ),
        toolbox: HIDDEN_PANEL_TOOLBOX_OPTION,
        title: HIDDEN_PANEL_TITLE_OPTION,
        noData: PANEL_NO_DATA_OPTION,
    };
}
