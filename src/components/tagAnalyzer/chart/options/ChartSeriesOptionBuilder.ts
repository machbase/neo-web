import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeries,
} from './ChartHighlightSeriesOptions';
import { buildMainSeries } from './ChartMainSeriesOptions';
import { buildNavigatorSeries } from './ChartNavigatorSeriesOptions';
import type { PanelChartOption } from './ChartOptionTypes';

/**
 * Builds the series portion of the panel chart option.
 * Intent: Let hover-only updates replace series styling without rebuilding the rest of the chart option.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @param aNavigatorChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @param aHighlights The saved highlight ranges rendered over the main chart.
 * @param aNavigatorRange The full navigator range that bounds highlight overlays.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @returns The chart-series option used for full renders and hover-only patches.
 */
export function buildChartSeriesOption(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aNavigatorChartData: ChartSeriesItem[] = aChartData,
    aHoveredLegendSeries?: string | undefined,
    aHighlights: PanelHighlight[] = [],
    aNavigatorRange?: TimeRangeMs,
    aIsRaw = false,
    aUseNormalize = false,
): Pick<PanelChartOption, 'series'> {
    return {
        series: buildHighlightOverlaySeries(aHighlights, aNavigatorRange)
            .concat(
                buildHighlightLabelSeries(
                    aHighlights,
                    aChartData,
                    aAxes,
                    aIsRaw,
                    aUseNormalize,
                ),
            )
            .concat(buildMainSeries(aChartData, aDisplay, aAxes, aHoveredLegendSeries))
            .concat(buildNavigatorSeries(aNavigatorChartData, aHoveredLegendSeries)),
    };
}
