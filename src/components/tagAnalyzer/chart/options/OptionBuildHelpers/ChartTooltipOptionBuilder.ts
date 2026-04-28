import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type { ChartSeriesData } from '../../../utils/series/PanelSeriesTypes';
import { TOOLTIP_BASE } from './ChartOptionConstants';

type TooltipValueItem = number | string | undefined;
type TooltipArrayValue = Array<TooltipValueItem>;

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

type OverlapTooltipParam = Partial<{
    seriesIndex: number;
    value: TooltipArrayValue;
    color: string;
}>;

function normalizeTooltipFormatterParams<T>(
    tooltipFormatterParams: TopLevelFormatterParams,
    mapTooltipParam: (tooltipCallbackParam: CallbackDataParams) => T,
): T[] {
    const sTooltipParams = Array.isArray(tooltipFormatterParams)
        ? tooltipFormatterParams
        : [tooltipFormatterParams];

    return sTooltipParams.map((tooltipCallbackParam) =>
        mapTooltipParam(tooltipCallbackParam as CallbackDataParams),
    );
}

function getTooltipColorString(
    tooltipColor: CallbackDataParams['color'],
): string | undefined {
    return typeof tooltipColor === 'string' ? tooltipColor : undefined;
}

function isTooltipValueItem(tooltipValueItem: unknown): tooltipValueItem is TooltipValueItem {
    return (
        tooltipValueItem === undefined ||
        typeof tooltipValueItem === 'number' ||
        typeof tooltipValueItem === 'string'
    );
}

function isTooltipPrimitiveArrayValue(
    callbackValue: CallbackDataParams['value'],
): callbackValue is TooltipArrayValue {
    return Array.isArray(callbackValue) && callbackValue.every(isTooltipValueItem);
}

function getTooltipPrimitiveArrayValue(
    callbackValue: CallbackDataParams['value'],
): TooltipArrayValue | undefined {
    return isTooltipPrimitiveArrayValue(callbackValue) ? callbackValue : undefined;
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

function formatTooltipRow(tooltipParam: PanelTooltipParam): string {
    const sColorStyle = tooltipParam.color ? `color:${tooltipParam.color};` : '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${tooltipParam.seriesName} : ${tooltipParam.value?.[1] ?? ''}</div>`;
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

function formatOverlapTooltipRow(
    tooltipItem: OverlapTooltipParam,
    chartData: ChartSeriesData[],
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

function formatOverlapTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    chartData: ChartSeriesData[],
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

export function buildOverlapTooltipOption(
    chartData: ChartSeriesData[],
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
