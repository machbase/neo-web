import type {
    YAXisComponentOption,
    XAXisComponentOption,
} from 'echarts';
import type {
    PanelAxes,
    PanelDisplay,
} from '../../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../../utils/time/timeTypes';
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
    aNavigatorRange: TimeRangeMs,
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
): XAXisComponentOption[] {
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

// Builds y-axis options while leaving range math in ChartYAxisRangeResolver.
export function buildChartYAxisOption(
    aAxes: PanelAxes,
    aChartData: ChartSeriesItem[],
    aIsRaw: boolean,
    aUseNormalize: boolean,
): YAXisComponentOption[] {
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
