import type {
    YAXisComponentOption,
    XAXisComponentOption,
} from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
} from '../../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../../utils/time/types/TimeTypes';
import { formatAxisTime } from '../../../utils/time/TimeBoundaryParsing';
import {
    AXIS_LINE_STYLE,
    AXIS_SPLIT_LINE_STYLE,
    PANEL_AXIS_LABEL_STYLE,
    Y_AXIS_LABEL_STYLE,
} from '../ChartOptionConstants';
import {
    getYAxisValues,
    resolveAxisRange,
} from '../ChartYAxisRangeResolver';

// Keeps the main plot and navigator x-axes locked to the same time range.
export function buildChartXAxisOption(
    navigatorRange: TimeRangeMs,
    display: PanelDisplay,
    axes: PanelAxes,
): XAXisComponentOption[] {
    return [
        {
            type: 'time' as const,
            gridIndex: 0,
            min: navigatorRange.startTime,
            max: navigatorRange.endTime,
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (xAxisTimestamp: number) =>
                    formatAxisTime(xAxisTimestamp, navigatorRange),
            },
            splitLine: {
                show: display.use_zoom && axes.x_axis.show_tickline,
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
            min: navigatorRange.startTime,
            max: navigatorRange.endTime,
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

// Builds y-axis options while leaving range math in ChartYAxisRangeResolver.
export function buildChartYAxisOption(
    axes: PanelAxes,
    chartData: ChartSeriesItem[],
    isRaw: boolean,
    useNormalize: boolean,
): YAXisComponentOption[] {
    const sYAxisValues = getYAxisValues(chartData, axes);
    const sLeftAxisRange = resolveAxisRange(
        isRaw ? axes.left_y_axis.raw_data_value_range : axes.left_y_axis.value_range,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        isRaw
            ? axes.right_y_axis.raw_data_value_range
            : axes.right_y_axis.value_range,
        useNormalize ? 0 : sYAxisValues.right[0],
        useNormalize ? 100 : sYAxisValues.right[1],
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
                show: axes.left_y_axis.show_tickline,
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
            position: axes.right_y_axis.enabled ? 'right' : 'left',
            axisLine: AXIS_LINE_STYLE,
            axisLabel: {
                ...Y_AXIS_LABEL_STYLE,
                show: chartData.some((series) => series.yAxis === 1),
            },
            splitLine: {
                show: axes.right_y_axis.show_tickline,
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
