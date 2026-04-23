import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import {
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './ChartOptionConstants';
import type { PanelSeriesOptions } from './ChartOptionTypes';

/**
 * Builds the navigator-lane series definitions for the panel chart.
 * Intent: Keep the lower overview lane visually aligned with the main series while staying interaction-light.
 * @param aChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The navigator-series definitions for the chart.
 */
export function buildNavigatorSeries(
    aChartData: ChartSeriesItem[],
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    return aChartData.map((aSeries, aIndex) => {
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sNavigatorOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY;

        return {
            id: `navigator-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            legendHoverLink: false,
            xAxisIndex: 1,
            yAxisIndex: 2,
            data: aSeries.data,
            showSymbol: false,
            silent: true,
            animation: false,
            tooltip: {
                show: false,
            },
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            lineStyle: {
                width: sIsHoveredSeries ? 2 : 1,
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            z: sIsHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        };
    });
}
