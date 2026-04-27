import { getTimeZoneValue } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import { TOOLTIP_BASE } from './ChartOptionConstants';
import {
    getTooltipColorString,
    getTooltipPrimitiveArrayValue,
    normalizeTooltipFormatterParams,
    type TooltipArrayValue,
} from './ChartTooltipUtils';

type ChartTooltipCallbackParam = CallbackDataParams & {
    axisValue?: number | string;
};

type PanelTooltipParam = Partial<{
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    axisValue: number | string;
    value: TooltipArrayValue;
    color: string;
}>;

export function buildChartTooltipOption(): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: formatChartTooltip,
    };
}

function formatChartTooltip(tooltipFormatterParams: TopLevelFormatterParams): string {
    const sMainSeriesItems = getMainSeriesTooltipItems(tooltipFormatterParams);
    if (sMainSeriesItems.length === 0) {
        return '';
    }

    const sTime = formatTooltipTime(
        Number(sMainSeriesItems[0].value?.[0] ?? sMainSeriesItems[0].axisValue),
    );

    return `<div>
            <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
            <div style="padding:6px 0 0 10px">
            ${sMainSeriesItems.map(formatTooltipRow).join('')}
            </div>
        </div>`;
}

function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    return normalizeTooltipFormatterParams(
        tooltipFormatterParams,
        (tooltipCallbackParam: ChartTooltipCallbackParam): PanelTooltipParam => ({
            axisValue: tooltipCallbackParam.axisValue,
            color: getTooltipColorString(tooltipCallbackParam.color),
            seriesId: tooltipCallbackParam.seriesId,
            seriesIndex: tooltipCallbackParam.seriesIndex,
            seriesName: tooltipCallbackParam.seriesName,
            value: getTooltipPrimitiveArrayValue(tooltipCallbackParam.value),
        }),
    ).filter((tooltipParam) => tooltipParam.seriesId?.startsWith('main-series'));
}

function formatTooltipRow(tooltipParam: PanelTooltipParam): string {
    const sColorStyle = tooltipParam.color ? `color:${tooltipParam.color};` : '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${tooltipParam.seriesName} : ${tooltipParam.value?.[1] ?? ''}</div>`;
}

function formatTooltipTime(tooltipTimestamp: number): string {
    const sFormatted = new Date(tooltipTimestamp - getTimeZoneValue() * 60000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');

    if (tooltipTimestamp % 1 !== 0) {
        return sFormatted + '.' + String(tooltipTimestamp).split('.')[1];
    }

    return sFormatted;
}
