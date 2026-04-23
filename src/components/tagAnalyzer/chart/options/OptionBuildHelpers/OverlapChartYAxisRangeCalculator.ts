import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import {
    getYAxisValues,
    type ResolvedYAxisRange,
} from '../ChartYAxisRangeResolver';
import { OVERLAP_AXES_TEMPLATE } from '../ChartOptionConstants';

/**
 * Calculates the shared y-axis range used by the overlap comparison chart.
 * Intent: Reuse panel y-axis range logic without leaking panel-only settings into overlap mode.
 * @param aChartData The datasets currently shown on the overlap chart.
 * @param aIncludeZeroInRange When true, zero is forced into the returned range so the baseline stays visible.
 * @returns The shared y-axis min/max for the overlap chart.
 */
export function calculateOverlapChartYAxisRange(
    aChartData: ChartSeriesItem[],
    aIncludeZeroInRange: boolean,
): ResolvedYAxisRange {
    const sYAxisValues = getYAxisValues(aChartData, {
        ...OVERLAP_AXES_TEMPLATE,
        left_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.left_y_axis,
            zero_base: aIncludeZeroInRange,
        },
        right_y_axis: {
            ...OVERLAP_AXES_TEMPLATE.right_y_axis,
            zero_base: aIncludeZeroInRange,
        },
    });

    return {
        min: sYAxisValues.left[0],
        max: sYAxisValues.left[1],
    };
}
