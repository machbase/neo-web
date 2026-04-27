import { getTimeZoneValue } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import { TOOLTIP_BASE } from '../ChartOptionConstants';

type ChartTooltipCallbackParam = CallbackDataParams & {
    axisValue?: number | string;
};

type PanelTooltipValue = [number, number] | Array<number | string | undefined>;

type PanelTooltipParam = Partial<{
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    axisValue: number | string;
    value: PanelTooltipValue;
    color: string;
}>;

type TooltipValueItem = number | string | undefined;

/**
 * Builds the tooltip configuration used by the main panel chart.
 * Intent: Keep tooltip presentation logic isolated from structural chart option composition.
 * @returns The tooltip option for the main panel chart.
 */
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

/**
 * Formats the main chart tooltip rows from ECharts formatter params.
 * Intent: Keep ECharts callback typing separate from tooltip HTML assembly.
 * @param tooltipFormatterParams The formatter params provided by ECharts.
 * @returns The tooltip HTML.
 */
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
            ${sMainSeriesItems
                .map(formatTooltipRow)
                .join('')}
            </div>
        </div>`;
}

/**
 * Returns tooltip params for visible main-series rows only.
 * Intent: Exclude navigator mirror series before the tooltip HTML is built.
 * @param tooltipFormatterParams The formatter params provided by ECharts.
 * @returns The normalized main-series tooltip params.
 */
function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    return normalizeTooltipParams(tooltipFormatterParams).filter((tooltipParam) =>
        tooltipParam.seriesId?.startsWith('main-series'),
    );
}

/**
 * Converts ECharts formatter params into the smaller shape this tooltip uses.
 * Intent: Keep runtime ECharts fields explicit instead of casting from unknown.
 * @param tooltipFormatterParams The formatter params provided by ECharts.
 * @returns Normalized tooltip params.
 */
function normalizeTooltipParams(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    const sTooltipParams = Array.isArray(tooltipFormatterParams)
        ? tooltipFormatterParams
        : [tooltipFormatterParams];

    return sTooltipParams.map(toChartTooltipParam);
}

/**
 * Keeps only tooltip fields used by this formatter.
 * Intent: Decouple tooltip rendering from the full ECharts callback param shape.
 * @param tooltipCallbackParam The ECharts formatter param.
 * @returns The local tooltip param shape.
 */
function toChartTooltipParam(
    tooltipCallbackParam: ChartTooltipCallbackParam,
): PanelTooltipParam {
    return {
        axisValue: tooltipCallbackParam.axisValue,
        color: getTooltipColor(tooltipCallbackParam.color),
        seriesId: tooltipCallbackParam.seriesId,
        seriesIndex: tooltipCallbackParam.seriesIndex,
        seriesName: tooltipCallbackParam.seriesName,
        value: getTooltipValue(tooltipCallbackParam.value),
    };
}

/**
 * Formats one tooltip row.
 * Intent: Keep row-specific HTML details out of the formatter control flow.
 * @param tooltipParam The normalized tooltip param.
 * @returns The tooltip row HTML.
 */
function formatTooltipRow(tooltipParam: PanelTooltipParam): string {
    const sColorStyle = tooltipParam.color ? `color:${tooltipParam.color};` : '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${tooltipParam.seriesName} : ${tooltipParam.value?.[1] ?? ''}</div>`;
}

/**
 * Returns a CSS color only when ECharts provides a string color.
 * Intent: Avoid rendering object-based gradient colors as CSS text.
 * @param tooltipColor The ECharts callback color value.
 * @returns The CSS color string, if one exists.
 */
function getTooltipColor(tooltipColor: CallbackDataParams['color']): string | undefined {
    return typeof tooltipColor === 'string' ? tooltipColor : undefined;
}

/**
 * Returns array-shaped tooltip values used by line-series data.
 * Intent: Ignore unrelated ECharts value shapes before indexing into x/y values.
 * @param callbackValue The ECharts callback value.
 * @returns The normalized tooltip value, if it has the expected primitive shape.
 */
function getTooltipValue(
    callbackValue: CallbackDataParams['value'],
): PanelTooltipValue | undefined {
    return isTooltipValue(callbackValue) ? callbackValue : undefined;
}

/**
 * Returns whether an ECharts value can be read as `[x, y]` tooltip data.
 * Intent: Keep tooltip value narrowing explicit.
 * @param callbackValue The ECharts callback value.
 * @returns Whether the value is an array of tooltip primitives.
 */
function isTooltipValue(
    callbackValue: CallbackDataParams['value'],
): callbackValue is PanelTooltipValue {
    return Array.isArray(callbackValue) && callbackValue.every(isTooltipValueItem);
}

/**
 * Returns whether one tooltip value item is supported by the renderer.
 * Intent: Keep tooltip primitive validation separate from array validation.
 * @param tooltipValueItem The candidate tooltip value item.
 * @returns Whether the item can be rendered by the tooltip.
 */
function isTooltipValueItem(tooltipValueItem: unknown): tooltipValueItem is TooltipValueItem {
    return (
        tooltipValueItem === undefined ||
        typeof tooltipValueItem === 'number' ||
        typeof tooltipValueItem === 'string'
    );
}

/**
 * Formats a tooltip timestamp into the panel's display string.
 * Intent: Apply the panel-specific timezone and fractional-second rules in one place.
 * @param tooltipTimestamp The timestamp to format.
 * @returns The formatted tooltip timestamp.
 */
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
