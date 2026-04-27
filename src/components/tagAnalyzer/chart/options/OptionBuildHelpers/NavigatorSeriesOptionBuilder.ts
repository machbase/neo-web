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
 * @param chartData The chart datasets mirrored into the navigator lane.
 * @param hoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The navigator-series definitions for the chart.
 */
export function buildNavigatorSeriesOption(
    chartData: ChartSeriesItem[],
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sHoverState = getNavigatorSeriesHoverState(series.name, hoveredLegendSeries);
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildNavigatorSeriesItem(series, seriesIndex, sSeriesColor, sHoverState);
    });
}

/**
 * Builds one navigator-lane series definition.
 * Intent: Keep per-series hover styling separate from list mapping.
 * @param series The chart dataset mirrored into the navigator lane.
 * @param seriesIndex The dataset index used for stable series IDs.
 * @param seriesColor The resolved display color for the series.
 * @param hoverState The resolved legend-hover styling state.
 * @returns The navigator-series definition.
 */
function buildNavigatorSeriesItem(
    series: ChartSeriesItem,
    seriesIndex: number,
    seriesColor: string,
    hoverState: NavigatorSeriesHoverState,
): SeriesOption {
    return {
        id: `navigator-series-${seriesIndex}`,
        name: series.name,
        type: 'line',
        legendHoverLink: false,
        xAxisIndex: 1,
        yAxisIndex: 2,
        data: series.data,
        showSymbol: false,
        silent: true,
        animation: false,
        tooltip: {
            show: false,
        },
        sampling: series.data.length > 1000 ? 'lttb' : undefined,
        lineStyle: {
            width: hoverState.isHoveredSeries ? 2 : 1,
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        itemStyle: {
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        z: hoverState.isHoveredSeries ? 3 : 1,
        emphasis: {
            disabled: true,
        },
    };
}

/**
 * Resolves navigator series hover styling from the active legend hover state.
 * Intent: Keep hover-state calculation out of the ECharts series object assembly.
 * @param seriesName The navigator series name.
 * @param hoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The hover state used to style the navigator series.
 */
function getNavigatorSeriesHoverState(
    seriesName: string,
    hoveredLegendSeries?: string | undefined,
): NavigatorSeriesHoverState {
    const sIsLegendHoverActive = Boolean(hoveredLegendSeries);
    const sIsHoveredSeries = hoveredLegendSeries === seriesName;

    return {
        isHoveredSeries: sIsHoveredSeries,
        opacity:
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY,
    };
}
