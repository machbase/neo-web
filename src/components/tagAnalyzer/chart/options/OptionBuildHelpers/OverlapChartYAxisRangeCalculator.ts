import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import {
    getYAxisValues,
    type ResolvedYAxisRange,
} from './ChartYAxisRangeResolver';
import { OVERLAP_AXES_TEMPLATE } from './ChartOptionConstants';

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
