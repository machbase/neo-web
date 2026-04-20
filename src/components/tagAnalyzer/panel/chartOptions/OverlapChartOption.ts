import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import moment from 'moment';
import type { EChartsOption } from 'echarts';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import {
    AXIS_LINE_STYLE,
    AXIS_SPLIT_LINE_STYLE,
    LEGEND_TEXT_STYLE,
    PANEL_AXIS_LABEL_STYLE,
    TOOLTIP_BASE,
    Y_AXIS_LABEL_STYLE,
} from './PanelChartOptionConstants';
import type { EChartTooltipParam } from './PanelChartOptionTypes';
import { resolveOverlapYAxisRange } from './PanelChartAxisUtils';

const OVERLAP_CHART_COLORS = [
    '#EB5757',
    '#6FCF97',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#FFD95F',
    '#2D9CDB',
    '#C3A080',
    '#B4B4B4',
    '#6B6B6B',
];

/**
 * Builds the single-grid chart option used by the overlap modal.
 * Intent: Keep overlap chart setup in one place so every comparison modal stays consistent.
 * @param aChartData The overlap chart datasets to render.
 * @param aStartTimeList The original start times used to rebuild tooltip timestamps.
 * @param aZeroBase Whether the overlap y-axis should clamp against zero.
 * @returns The ECharts option for the overlap modal chart.
 */
export function buildOverlapChartOption(
    aChartData: ChartSeriesItem[],
    aStartTimeList: number[],
    aZeroBase: boolean,
): EChartsOption {
    const sYAxisRange = resolveOverlapYAxisRange(aChartData, aZeroBase);

    return {
        animation: false,
        backgroundColor: '#2a2a2a',
        color: OVERLAP_CHART_COLORS,
        legend: {
            show: true,
            left: 10,
            top: 6,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
        },
        grid: {
            left: 35,
            right: 18,
            top: 42,
            bottom: 28,
        },
        tooltip: buildOverlapTooltipOption(aChartData, aStartTimeList),
        xAxis: {
            type: 'time',
            axisLine: AXIS_LINE_STYLE,
            axisTick: AXIS_LINE_STYLE,
            axisLabel: {
                ...PANEL_AXIS_LABEL_STYLE,
                formatter: (aValue: number) => moment.utc(aValue).format('HH:mm:ss'),
            },
            splitLine: {
                show: true,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
        },
        yAxis: {
            type: 'value',
            min: sYAxisRange.min,
            max: sYAxisRange.max,
            axisLine: AXIS_LINE_STYLE,
            axisLabel: Y_AXIS_LABEL_STYLE,
            splitLine: {
                show: true,
                lineStyle: AXIS_SPLIT_LINE_STYLE,
            },
            scale: true,
        },
        series: aChartData.map((aSeries, aIndex) => ({
            id: `overlap-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            data: aSeries.data,
            showSymbol: false,
            lineStyle: {
                width: 0.5,
                color: aSeries.color,
            },
            itemStyle: {
                color: aSeries.color,
            },
            animation: false,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
        })),
        toolbox: {
            show: false,
        },
        axisValue: undefined,
    };
}

/**
 * Builds the tooltip configuration used by the overlap modal chart.
 * Intent: Keep tooltip HTML formatting separate from the structural chart option builder.
 * @param aChartData The overlap chart datasets.
 * @param aStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip option for the overlap chart.
 */
function buildOverlapTooltipOption(
    aChartData: ChartSeriesItem[],
    aStartTimeList: number[],
) {
    return {
        ...TOOLTIP_BASE,
        formatter: (aParams: unknown) => {
            const sItems = (Array.isArray(aParams) ? aParams : [aParams]) as EChartTooltipParam[];

            return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sItems
                .map((aItem) => {
                    const sSeriesIndex = aItem.seriesIndex ?? 0;

                    return `<div style="color:${aItem.color}">${
                        aChartData[sSeriesIndex].name +
                        ' : ' +
                        toDateUtcChart(
                            Number(aItem.value?.[0] ?? 0) +
                                (aStartTimeList[sSeriesIndex] ?? 0) -
                                1000 * 60 * getTimeZoneValue(),
                            true,
                        ) +
                        ' : ' +
                        (aItem.value?.[1] ?? '')
                    }</div>`;
                })
                .join('<br/>')}</div></div>`;
        },
    };
}
