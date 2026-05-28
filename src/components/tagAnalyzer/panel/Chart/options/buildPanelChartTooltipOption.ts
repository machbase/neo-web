import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import { TOOLTIP_BASE } from './PanelChartOptionConstants';
import { formatAxisPointerLabel } from '../../../domain/time/TimeFormatters';

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

function formatTooltipTime(
    tooltipTimestamp: number,
    isNumericXAxis: boolean,
): string {
    return formatAxisPointerLabel(tooltipTimestamp, isNumericXAxis);
}

function formatTooltipRow(tooltipParam: PanelTooltipParam): string {
    const sColorStyle = tooltipParam.color ? `color:${tooltipParam.color};` : '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${tooltipParam.seriesName} : ${tooltipParam.value?.[1] ?? ''}</div>`;
}

function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    const sTooltipItems = normalizeTooltipFormatterParams(
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

    return [...new Map(sTooltipItems.map((item) => [item.seriesId, item])).values()];
}

function formatChartTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    isNumericXAxis: boolean,
): string {
    const sMainSeriesItems = getMainSeriesTooltipItems(tooltipFormatterParams);
    if (sMainSeriesItems.length === 0) {
        return '';
    }

    const sTime = formatTooltipTime(
        Number(sMainSeriesItems[0].value?.[0] ?? sMainSeriesItems[0].axisValue),
        isNumericXAxis,
    );

    return `<div>
            <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
            <div style="padding:6px 0 0 10px">
            ${sMainSeriesItems.map(formatTooltipRow).join('')}
            </div>
        </div>`;
}

export function buildChartTooltipOption(
    isNumericXAxis: boolean,
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: (tooltipFormatterParams) =>
            formatChartTooltip(tooltipFormatterParams, isNumericXAxis),
    };
}
