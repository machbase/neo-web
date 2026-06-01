import type {
    LineSeriesOption,
    SeriesOption,
} from 'echarts';
import type {
    RuntimePanelAxes,
    RuntimePanelDisplay,
} from '../../../domain/PanelDomain';
import {
    getPanelSeriesDisplayColor,
} from '../../../domain/SeriesDomain';
import type { ChartRow, ChartSeriesData } from '../../../domain/ChartDomain';
import {
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './PanelChartOptionConstants';

type ThresholdMarkLineData = Array<{ yAxis: number }>;

function getLegendHoverState(
    seriesName: string,
    hoveredLegendSeries: string | undefined,
): { isLegendHoverActive: boolean; isHoveredSeries: boolean } {
    return {
        isLegendHoverActive: Boolean(hoveredLegendSeries),
        isHoveredSeries: hoveredLegendSeries === seriesName,
    };
}

function buildPanelLineSeriesOption({
    data,
    ...option
}: LineSeriesOption & { data: ChartRow[] }): SeriesOption {
    return {
        type: 'line',
        legendHoverLink: false,
        data,
        animation: false,
        sampling: data.length > 1000 ? 'lttb' : undefined,
        ...option,
    };
}

function buildThresholdMarkLineData(
    axis: RuntimePanelAxes['left_y_axis'],
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
    display: RuntimePanelDisplay,
    axes: RuntimePanelAxes,
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sBaseSymbolSize = display.point_radius > 0 ? display.point_radius * 2 : 0;
        const sSymbolSize = display.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const { isLegendHoverActive: sIsLegendHoverActive, isHoveredSeries: sIsHoveredSeries } =
            getLegendHoverState(series.name, hoveredLegendSeries);
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
            symbol: 'circle',
            showSymbol: display.show_point,
            symbolSize: sSymbolSize,
            lineStyle: {
                width: sSeriesStroke,
                color: sSeriesColor,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sItemOpacity,
            },
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
        });
    });
}

export function buildNavigatorSeriesOption(
    chartData: ChartSeriesData[],
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const { isLegendHoverActive: sIsLegendHoverActive, isHoveredSeries: sIsHoveredSeries } =
            getLegendHoverState(series.name, hoveredLegendSeries);
        const sOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildPanelLineSeriesOption({
            id: `navigator-series-${seriesIndex}`,
            name: series.name,
            data: series.data,
            xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
            yAxisIndex: 2,
            showSymbol: false,
            silent: true,
            tooltip: {
                show: false,
            },
            lineStyle: {
                width: sIsHoveredSeries ? 2 : 1,
                color: sSeriesColor,
                opacity: sOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sOpacity,
            },
            z: sIsHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        });
    });
}
