// Builds the ECharts x-axis and y-axis option objects that drive the panel chart.
//
// An "axis option" is the object ECharts reads to render a chart axis: its bounds,
// tick marks, labels, grid lines, and the pointer that follows the cursor.

import type {
    PanelAxes,
    PanelDisplay,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import { formatAxisTime } from '../../utils/time/TimeBoundaryParsing';
import {
    AXIS_LINE_STYLE,
    AXIS_SPLIT_LINE_STYLE,
    PANEL_AXIS_LABEL_STYLE,
    Y_AXIS_LABEL_STYLE,
} from './ChartOptionConstants';
import type { PanelYAxisOptions } from './ChartOptionTypes';
import {
    getYAxisValues,
    resolveAxisRange,
} from './ChartYAxisRangeResolver';

/**
 * Builds the x-axis option objects for the main plot and navigator lane.
 * Intent: Keep both panel chart lanes locked to the same time range from one shared builder.
 *
 * @param aNavigatorRange The full time range covered by both the plot and the navigator.
 * @param aDisplay The display settings that decide whether vertical grid lines appear when zoom is active.
 * @param aAxes The panel axis settings controlling whether x-axis split lines are enabled.
 * @returns A two-entry ECharts x-axis option array (main plot + navigator).
 */
export function buildChartXAxisOption(
    aNavigatorRange: TimeRangeMs,
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
) {
    return [
        {
            type: 'time' as const,
            gridIndex: 0,
            min: aNavigatorRange.startTime,
            max: aNavigatorRange.endTime,
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (aValue: number) => formatAxisTime(aValue, aNavigatorRange),
            },
            splitLine: {
                show: aDisplay.use_zoom && aAxes.x_axis.show_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            axisPointer: {
                label: {
                    show: false,
                },
            },
        },
        {
            type: 'time' as const,
            gridIndex: 1,
            min: aNavigatorRange.startTime,
            max: aNavigatorRange.endTime,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { show: false },
            axisPointer: {
                show: false,
                label: {
                    show: false,
                },
            },
        },
    ];
}

/**
 * Builds the y-axis option objects for the panel's main plot and navigator lane.
 * Intent: Centralize axis option creation while range calculations stay in the y-axis range resolver.
 *
 * @param aAxes The panel axis settings used to size and decorate the y-axes.
 * @param aChartData The visible chart datasets used to derive axis ranges.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is on.
 * @returns A three-entry ECharts y-axis option array (left, right, navigator).
 */
export function buildChartYAxisOption(
    aAxes: PanelAxes,
    aChartData: ChartSeriesItem[],
    aIsRaw: boolean,
    aUseNormalize: boolean,
): PanelYAxisOptions {
    const sYAxisValues = getYAxisValues(aChartData, aAxes);
    const sLeftAxisRange = resolveAxisRange(
        aIsRaw ? aAxes.left_y_axis.raw_data_value_range : aAxes.left_y_axis.value_range,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        aIsRaw
            ? aAxes.right_y_axis.raw_data_value_range
            : aAxes.right_y_axis.value_range,
        aUseNormalize ? 0 : sYAxisValues.right[0],
        aUseNormalize ? 100 : sYAxisValues.right[1],
    );

    return [
        {
            type: 'value',
            gridIndex: 0,
            min: sLeftAxisRange.min,
            max: sLeftAxisRange.max,
            axisLine: AXIS_LINE_STYLE,
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: aAxes.left_y_axis.show_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 0,
            min: sRightAxisRange.min,
            max: sRightAxisRange.max,
            position: aAxes.right_y_axis.enabled ? 'right' : 'left',
            axisLine: AXIS_LINE_STYLE,
            axisLabel: {
                ...Y_AXIS_LABEL_STYLE,
                show: aChartData.some((aItem) => aItem.yAxis === 1),
            },
            splitLine: {
                show: aAxes.right_y_axis.show_tickline,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            minInterval: 0,
            scale: true,
        },
        {
            type: 'value',
            gridIndex: 1,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false },
            splitLine: { show: false },
            scale: true,
        },
    ];
}
