import type { SeriesOption } from 'echarts';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import {
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from '../ChartOptionConstants';

type NavigatorSeriesHoverState = {
    isHoveredSeries: boolean;
    opacity: number;
};

/**
 * Builds the navigator-lane series definitions for the panel chart.
 * Intent: Keep the lower overview lane visually aligned with the main series while staying interaction-light.
 * @param aChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The navigator-series definitions for the chart.
 */
export function buildNavigatorSeriesOption(
    aChartData: ChartSeriesItem[],
    aHoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return aChartData.map((aSeries, aSeriesIndex) => {
        const sHoverState = getNavigatorSeriesHoverState(aSeries.name, aHoveredLegendSeries);
        const sSeriesColor = getPanelSeriesDisplayColor(aSeries, aSeriesIndex);

        return buildNavigatorSeriesItem(aSeries, aSeriesIndex, sSeriesColor, sHoverState);
    });
}

/**
 * Builds one navigator-lane series definition.
 * Intent: Keep per-series hover styling separate from list mapping.
 * @param aSeries The chart dataset mirrored into the navigator lane.
 * @param aSeriesIndex The dataset index used for stable series IDs.
 * @param aSeriesColor The resolved display color for the series.
 * @param aHoverState The resolved legend-hover styling state.
 * @returns The navigator-series definition.
 */
function buildNavigatorSeriesItem(
    aSeries: ChartSeriesItem,
    aSeriesIndex: number,
    aSeriesColor: string,
    aHoverState: NavigatorSeriesHoverState,
): SeriesOption {
    return {
        id: `navigator-series-${aSeriesIndex}`,
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
        sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
        lineStyle: {
            width: aHoverState.isHoveredSeries ? 2 : 1,
            color: aSeriesColor,
            opacity: aHoverState.opacity,
        },
        itemStyle: {
            color: aSeriesColor,
            opacity: aHoverState.opacity,
        },
        z: aHoverState.isHoveredSeries ? 3 : 1,
        emphasis: {
            disabled: true,
        },
    };
}

/**
 * Resolves navigator series hover styling from the active legend hover state.
 * Intent: Keep hover-state calculation out of the ECharts series object assembly.
 * @param aSeriesName The navigator series name.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The hover state used to style the navigator series.
 */
function getNavigatorSeriesHoverState(
    aSeriesName: string,
    aHoveredLegendSeries?: string | undefined,
): NavigatorSeriesHoverState {
    const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
    const sIsHoveredSeries = aHoveredLegendSeries === aSeriesName;

    return {
        isHoveredSeries: sIsHoveredSeries,
        opacity:
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY,
    };
}
