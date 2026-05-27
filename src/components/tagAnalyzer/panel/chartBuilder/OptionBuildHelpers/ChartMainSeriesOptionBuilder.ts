import type { SeriesOption } from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
} from '../../../domain/PanelDomain';
import {
    getPanelSeriesDisplayColor,
} from '../../../domain/SeriesDomain';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import {
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
} from './ChartOptionConstants';
import { buildPanelLineSeriesOption } from './ChartLineSeriesOptionBuilder';

type ThresholdMarkLineData = Array<{ yAxis: number }>;

function buildThresholdMarkLineData(
    axis: PanelAxes['left_y_axis'],
): ThresholdMarkLineData {
    return [
        axis.upper_control_limit.enabled
            ? { yAxis: axis.upper_control_limit.value }
            : undefined,
        axis.lower_control_limit.enabled
            ? { yAxis: axis.lower_control_limit.value }
            : undefined,
    ].filter((item): item is { yAxis: number } => item !== undefined);
}

export function buildMainSeriesOption(
    chartData: ChartSeriesData[],
    display: PanelDisplay,
    axes: PanelAxes,
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sBaseSymbolSize = display.point_radius > 0 ? display.point_radius * 2 : 0;
        const sSymbolSize = display.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sIsLegendHoverActive = Boolean(hoveredLegendSeries);
        const sIsHoveredSeries = hoveredLegendSeries === series.name;
        const sSeriesOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_LINE_OPACITY;
        const sItemOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_ITEM_OPACITY;
        const sAreaOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? display.fill
                : Math.min(display.fill, PANEL_LEGEND_FADE_AREA_OPACITY);
        const sSeriesStroke = sIsHoveredSeries ? display.stroke + 1 : display.stroke;
        const sMarkLineOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_MARK_LINE_OPACITY;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);
        const sYAxisIndex = series.yAxis ?? 0;

        if (sYAxisIndex !== 0 && sYAxisIndex !== 1) {
            throw new Error(`Unsupported Y-axis index: ${sYAxisIndex}.`);
        }

        const sMarkLineData = buildThresholdMarkLineData(
            sYAxisIndex === 0 ? axes.left_y_axis : axes.right_y_axis,
        );

        return buildPanelLineSeriesOption({
            id: `${MAIN_PANEL_SERIES_ID_PREFIX}${seriesIndex}`,
            name: series.name,
            data: series.data,
            xAxisIndex: 0,
            yAxisIndex: sYAxisIndex,
            lineStyle: {
                width: sSeriesStroke,
                color: sSeriesColor,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sItemOpacity,
            },
            extra: {
                symbol: 'circle',
                showSymbol: display.show_point,
                symbolSize: sSymbolSize,
                areaStyle:
                    display.fill > 0
                        ? { opacity: sAreaOpacity, color: sSeriesColor }
                        : undefined,
                connectNulls: display.connect_nulls,
                triggerLineEvent: true,
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
            },
        });
    });
}
