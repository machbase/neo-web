import type { PanelAxes, PanelDisplay } from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import {
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
} from './ChartOptionConstants';
import type { PanelSeriesOptions } from './ChartOptionTypes';
import { buildThresholdLine } from './ChartThresholdSeriesOptions';

/**
 * Builds the main plot series definitions for the panel chart.
 * Intent: Centralize hover styling, threshold overlays, and display flags for the primary chart lane.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The main-series definitions for the chart.
 */
export function buildMainSeries(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    const sLeftThreshold = buildThresholdLine(
        aAxes.left_y_axis.upper_control_limit.enabled,
        '#ec7676',
        aAxes.left_y_axis.upper_control_limit.value,
    );
    const sLeftLowerThreshold = buildThresholdLine(
        aAxes.left_y_axis.lower_control_limit.enabled,
        'orange',
        aAxes.left_y_axis.lower_control_limit.value,
    );
    const sRightThreshold = buildThresholdLine(
        aAxes.right_y_axis.upper_control_limit.enabled,
        '#ec7676',
        aAxes.right_y_axis.upper_control_limit.value,
    );
    const sRightLowerThreshold = buildThresholdLine(
        aAxes.right_y_axis.lower_control_limit.enabled,
        'orange',
        aAxes.right_y_axis.lower_control_limit.value,
    );

    return aChartData.map((aSeries, aIndex) => {
        const sMarkLineData = [];
        const sBaseSymbolSize = aDisplay.point_radius > 0 ? aDisplay.point_radius * 2 : 0;
        const sSymbolSize = aDisplay.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sSeriesOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_LINE_OPACITY;
        const sItemOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_ITEM_OPACITY;
        const sAreaOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? aDisplay.fill
                : Math.min(aDisplay.fill, PANEL_LEGEND_FADE_AREA_OPACITY);
        const sSeriesStroke = sIsHoveredSeries ? aDisplay.stroke + 1 : aDisplay.stroke;
        const sMarkLineOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_MARK_LINE_OPACITY;

        if (aSeries.yAxis === 0) {
            if (sLeftThreshold?.data?.[0]) sMarkLineData.push(sLeftThreshold.data[0]);
            if (sLeftLowerThreshold?.data?.[0]) sMarkLineData.push(sLeftLowerThreshold.data[0]);
        } else {
            if (sRightThreshold?.data?.[0]) sMarkLineData.push(sRightThreshold.data[0]);
            if (sRightLowerThreshold?.data?.[0]) sMarkLineData.push(sRightLowerThreshold.data[0]);
        }

        return {
            id: `main-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            legendHoverLink: false,
            xAxisIndex: 0,
            yAxisIndex: aSeries.yAxis ?? 0,
            data: aSeries.data,
            symbol: 'circle',
            showSymbol: aDisplay.show_point,
            symbolSize: sSymbolSize,
            lineStyle: {
                width: sSeriesStroke,
                color: aSeries.color,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sItemOpacity,
            },
            areaStyle:
                aDisplay.fill > 0 ? { opacity: sAreaOpacity, color: aSeries.color } : undefined,
            connectNulls: false,
            animation: false,
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            z: sIsHoveredSeries ? 4 : 2,
            markLine:
                sMarkLineData.length > 0
                    ? {
                          silent: true,
                          symbol: 'none',
                          lineStyle: {
                              width: 1,
                              opacity: sMarkLineOpacity,
                          },
                          label: { show: false },
                          data: sMarkLineData,
                      }
                    : undefined,
        };
    });
}
