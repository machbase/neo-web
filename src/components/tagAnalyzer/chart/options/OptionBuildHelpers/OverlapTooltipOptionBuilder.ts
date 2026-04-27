import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import { TOOLTIP_BASE } from './ChartOptionConstants';
import {
    getTooltipColorString,
    getTooltipPrimitiveArrayValue,
    normalizeTooltipFormatterParams,
    type TooltipArrayValue,
} from './ChartTooltipUtils';

type OverlapTooltipParam = Partial<{
    seriesIndex: number;
    value: TooltipArrayValue;
    color: string;
}>;

export function buildOverlapTooltipOption(
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        formatter: (tooltipFormatterParams: TopLevelFormatterParams) =>
            formatOverlapTooltip(
                tooltipFormatterParams,
                chartData,
                seriesStartTimeList,
            ),
    };
}

function formatOverlapTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
): string {
    const sTooltipRows = normalizeTooltipFormatterParams(
        tooltipFormatterParams,
        (tooltipCallbackParam: CallbackDataParams): OverlapTooltipParam => ({
            color: getTooltipColorString(tooltipCallbackParam.color),
            seriesIndex: tooltipCallbackParam.seriesIndex,
            value: getTooltipPrimitiveArrayValue(tooltipCallbackParam.value),
        }),
    )
        .map((tooltipItem) =>
            formatOverlapTooltipRow(tooltipItem, chartData, seriesStartTimeList),
        )
        .join('<br/>');

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sTooltipRows}</div></div>`;
}

function formatOverlapTooltipRow(
    tooltipItem: OverlapTooltipParam,
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
): string {
    const sSeriesIndex = tooltipItem.seriesIndex ?? 0;
    const sSeriesName = chartData[sSeriesIndex]?.name ?? '';
    const sOriginalTimestamp = getOverlapTooltipOriginalTimestamp(
        tooltipItem,
        seriesStartTimeList[sSeriesIndex] ?? 0,
    );

    return `<div style="color:${tooltipItem.color}">${sSeriesName} : ${toDateUtcChart(
        sOriginalTimestamp,
        true,
    )} : ${tooltipItem.value?.[1] ?? ''}</div>`;
}

function getOverlapTooltipOriginalTimestamp(
    tooltipItem: OverlapTooltipParam,
    seriesStartTime: number,
): number {
    return (
        Number(tooltipItem.value?.[0] ?? 0) +
        seriesStartTime -
        1000 * 60 * getTimeZoneValue()
    );
}
