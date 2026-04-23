import type { PanelAxes } from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import {
    getYAxisValues,
    type ResolvedYAxisRange,
} from './ChartYAxisRangeResolver';

// The overlap chart has no user-configured axes. This neutral template lets the
// shared y-axis bounds algorithm run without panel-specific settings bleeding in.
const OVERLAP_AXES_TEMPLATE: PanelAxes = {
    x_axis: {
        show_tickline: true,
        raw_data_pixels_per_tick: 0,
        calculated_data_pixels_per_tick: 0,
    },
    sampling: {
        enabled: false,
        sample_count: 0,
    },
    left_y_axis: {
        zero_base: false,
        show_tickline: true,
        value_range: { min: 0, max: 0 },
        raw_data_value_range: { min: 0, max: 0 },
        upper_control_limit: {
            enabled: false,
            value: 0,
        },
        lower_control_limit: {
            enabled: false,
            value: 0,
        },
    },
    right_y_axis: {
        enabled: false,
        zero_base: false,
        show_tickline: false,
        value_range: { min: 0, max: 0 },
        raw_data_value_range: { min: 0, max: 0 },
        upper_control_limit: {
            enabled: false,
            value: 0,
        },
        lower_control_limit: {
            enabled: false,
            value: 0,
        },
    },
};

/**
 * Computes the shared y-axis range used by the overlap comparison chart.
 * Intent: Reuse panel y-axis range logic without leaking panel-only settings into overlap mode.
 * @param aChartData The datasets currently shown on the overlap chart.
 * @param aZeroBase When true, zero is forced into the returned range so the baseline stays visible.
 * @returns The shared y-axis min/max for the overlap chart.
 */
export function resolveOverlapYAxisRange(
    aChartData: ChartSeriesItem[],
    aZeroBase: boolean,
): ResolvedYAxisRange {
    const sYAxisValues = getYAxisValues(aChartData, {
        ...OVERLAP_AXES_TEMPLATE,
        left_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.left_y_axis,
            zero_base: aZeroBase,
        },
        right_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.right_y_axis,
            zero_base: aZeroBase,
        },
    });

    return {
        min: sYAxisValues.left[0],
        max: sYAxisValues.left[1],
    };
}
