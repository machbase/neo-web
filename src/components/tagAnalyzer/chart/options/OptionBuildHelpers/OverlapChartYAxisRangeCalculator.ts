import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import {
    getYAxisValues,
    type ResolvedYAxisRange,
} from '../ChartYAxisRangeResolver';
import { OVERLAP_AXES_TEMPLATE } from '../ChartOptionConstants';

/**
 * Calculates the shared y-axis range used by the overlap comparison chart.
 * Intent: Reuse panel y-axis range logic without leaking panel-only settings into overlap mode.
 * @param chartData The datasets currently shown on the overlap chart.
 * @param includeZeroInRange When true, zero is forced into the returned range so the baseline stays visible.
 * @returns The shared y-axis min/max for the overlap chart.
 */
export function calculateOverlapChartYAxisRange(
    chartData: ChartSeriesItem[],
    includeZeroInRange: boolean,
): ResolvedYAxisRange {
    const sYAxisValues = getYAxisValues(chartData, {
        ...OVERLAP_AXES_TEMPLATE,
        left_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.left_y_axis,
            zero_base: includeZeroInRange,
        },
        right_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.right_y_axis,
            zero_base: includeZeroInRange,
        },
    });

    return {
        min: sYAxisValues.left[0],
        max: sYAxisValues.left[1],
    };
}
