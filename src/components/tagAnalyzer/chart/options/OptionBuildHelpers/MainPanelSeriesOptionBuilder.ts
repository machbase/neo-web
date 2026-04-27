import type { SeriesOption } from 'echarts';
import type { PanelAxes, PanelDisplay } from '../../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import {
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
} from './ChartOptionConstants';
import { buildBasePanelLineSeriesOption } from './PanelLineSeriesUtils';

type ThresholdLineOption = {
    silent: true;
    symbol: 'none';
    lineStyle: {
        color: string;
        width: number;
    };
    label: {
        show: false;
    };
    data: Array<{
        yAxis: number;
    }>;
};

function buildThresholdLineOption(
    thresholdColor: string,
    thresholdValue: number,
): ThresholdLineOption {
    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: thresholdColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: thresholdValue }],
    };
}

export function buildMainSeriesOption(
    chartData: ChartSeriesItem[],
    display: PanelDisplay,
    axes: PanelAxes,
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    const sLeftThreshold = axes.left_y_axis.upper_control_limit.enabled
        ? buildThresholdLineOption('#ec7676', axes.left_y_axis.upper_control_limit.value)
        : undefined;
    const sLeftLowerThreshold = axes.left_y_axis.lower_control_limit.enabled
        ? buildThresholdLineOption('orange', axes.left_y_axis.lower_control_limit.value)
        : undefined;
    const sRightThreshold = axes.right_y_axis.upper_control_limit.enabled
        ? buildThresholdLineOption('#ec7676', axes.right_y_axis.upper_control_limit.value)
        : undefined;
    const sRightLowerThreshold = axes.right_y_axis.lower_control_limit.enabled
        ? buildThresholdLineOption('orange', axes.right_y_axis.lower_control_limit.value)
        : undefined;

    return chartData.map((series, seriesIndex) => {
        const sMarkLineData = [];
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

        if (series.yAxis === 0) {
            if (sLeftThreshold?.data?.[0]) sMarkLineData.push(sLeftThreshold.data[0]);
            if (sLeftLowerThreshold?.data?.[0]) sMarkLineData.push(sLeftLowerThreshold.data[0]);
        } else {
            if (sRightThreshold?.data?.[0]) sMarkLineData.push(sRightThreshold.data[0]);
            if (sRightLowerThreshold?.data?.[0]) sMarkLineData.push(sRightLowerThreshold.data[0]);
        }

        return buildBasePanelLineSeriesOption({
            id: `${MAIN_PANEL_SERIES_ID_PREFIX}${seriesIndex}`,
            name: series.name,
            data: series.data,
            xAxisIndex: 0,
            yAxisIndex: series.yAxis ?? 0,
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
                connectNulls: false,
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
