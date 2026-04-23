import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import { TOOLTIP_BASE } from './ChartOptionConstants';
import type { EChartTooltipParam } from './ChartOptionTypes';

/**
 * Builds the tooltip configuration used by the overlap modal chart.
 * Intent: Keep overlap tooltip HTML formatting separate from structural chart option composition.
 * @param aChartData The overlap chart datasets.
 * @param aStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip option for the overlap chart.
 */
export function buildOverlapTooltipOption(
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
