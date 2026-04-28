import moment from 'moment';
import type { EChartsOption } from 'echarts';
import type { ChartSeriesData } from '../utils/series/PanelSeriesTypes';
import { getYAxisValues } from '../chart/options/OptionBuildHelpers/ChartAxisOptionBuilder';
import {
    OVERLAP_AXES_TEMPLATE,
    OVERLAP_CHART_BASE_OPTION,
    OVERLAP_CHART_COLORS,
    OVERLAP_GRID_OPTION,
    OVERLAP_LEGEND_OPTION,
    OVERLAP_TOOLBOX_OPTION,
    OVERLAP_X_AXIS_STATIC_OPTION,
    OVERLAP_Y_AXIS_STATIC_OPTION,
} from '../chart/options/OptionBuildHelpers/ChartOptionConstants';
import { buildOverlapTooltipOption } from '../chart/options/OptionBuildHelpers/ChartTooltipOptionBuilder';

export type OverlapChartInfo = {
    seriesData: ChartSeriesData[];
    seriesStartTimeList: number[];
    includeZeroInYAxisRange: boolean;
};

function resolveOverlapChartYAxisRange(
    chartData: ChartSeriesData[],
    includeZeroInRange: boolean,
) {
    const yAxisValues = getYAxisValues(chartData, {
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
        min: yAxisValues.left[0],
        max: yAxisValues.left[1],
    };
}

export function buildOverlapChartOption(
    overlapChartInfo: OverlapChartInfo,
): EChartsOption {
    const yAxisRange = resolveOverlapChartYAxisRange(
        overlapChartInfo.seriesData,
        overlapChartInfo.includeZeroInYAxisRange,
    );
    const series = overlapChartInfo.seriesData.map((chartSeries, seriesIndex) => {
        const seriesColor =
            chartSeries.color ??
            OVERLAP_CHART_COLORS[seriesIndex % OVERLAP_CHART_COLORS.length];

        return {
            id: `overlap-series-${seriesIndex}`,
            name: chartSeries.name,
            type: 'line' as const,
            data: chartSeries.data,
            showSymbol: false,
            lineStyle: {
                width: 0.5,
                color: seriesColor,
            },
            itemStyle: {
                color: seriesColor,
            },
            animation: false,
            sampling: chartSeries.data.length > 1000 ? 'lttb' : undefined,
        };
    });

    return {
        ...OVERLAP_CHART_BASE_OPTION,
        grid: OVERLAP_GRID_OPTION,
        legend: OVERLAP_LEGEND_OPTION,
        tooltip: buildOverlapTooltipOption(
            overlapChartInfo.seriesData,
            overlapChartInfo.seriesStartTimeList,
        ),
        xAxis: {
            ...OVERLAP_X_AXIS_STATIC_OPTION,
            axisLabel: {
                ...OVERLAP_X_AXIS_STATIC_OPTION.axisLabel,
                formatter: (overlapXAxisValue: number) =>
                    moment.utc(overlapXAxisValue).format('HH:mm:ss'),
            },
        },
        yAxis: {
            ...OVERLAP_Y_AXIS_STATIC_OPTION,
            min: yAxisRange.min,
            max: yAxisRange.max,
        },
        series: series,
        toolbox: OVERLAP_TOOLBOX_OPTION,
    };
}
