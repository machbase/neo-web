import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';

export type TooltipValueItem = number | string | undefined;
export type TooltipArrayValue = Array<TooltipValueItem>;

export function normalizeTooltipFormatterParams<T>(
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

export function getTooltipColorString(
    tooltipColor: CallbackDataParams['color'],
): string | undefined {
    return typeof tooltipColor === 'string' ? tooltipColor : undefined;
}

export function getTooltipPrimitiveArrayValue(
    callbackValue: CallbackDataParams['value'],
): TooltipArrayValue | undefined {
    return isTooltipPrimitiveArrayValue(callbackValue) ? callbackValue : undefined;
}

function isTooltipPrimitiveArrayValue(
    callbackValue: CallbackDataParams['value'],
): callbackValue is TooltipArrayValue {
    return Array.isArray(callbackValue) && callbackValue.every(isTooltipValueItem);
}

function isTooltipValueItem(tooltipValueItem: unknown): tooltipValueItem is TooltipValueItem {
    return (
        tooltipValueItem === undefined ||
        typeof tooltipValueItem === 'number' ||
        typeof tooltipValueItem === 'string'
    );
}
