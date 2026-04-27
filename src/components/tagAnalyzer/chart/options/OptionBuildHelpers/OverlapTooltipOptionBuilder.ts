import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import { TOOLTIP_BASE } from '../ChartOptionConstants';

type OverlapTooltipValue = [number, number] | Array<number | string | undefined>;

type OverlapTooltipParam = Partial<{
    seriesIndex: number;
    value: OverlapTooltipValue;
    color: string;
}>;

/**
 * Builds the tooltip configuration used by the overlap modal chart.
 * Intent: Keep overlap tooltip HTML formatting separate from structural chart option composition.
 * @param chartData The overlap chart datasets.
 * @param seriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip option for the overlap chart.
 */
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

/**
 * Formats overlap tooltip rows from ECharts formatter params.
 * Intent: Keep ECharts callback normalization separate from overlap tooltip HTML assembly.
 * @param tooltipFormatterParams The formatter params provided by ECharts.
 * @param chartData The overlap chart datasets.
 * @param seriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip HTML.
 */
function formatOverlapTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
): string {
    const sTooltipItems = normalizeOverlapTooltipParams(tooltipFormatterParams);
    const sTooltipRows = formatOverlapTooltipRows(
        sTooltipItems,
        chartData,
        seriesStartTimeList,
    );

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sTooltipRows}</div></div>`;
}

/**
 * Converts ECharts formatter params into overlap tooltip params.
 * Intent: Keep runtime ECharts fields explicit before rendering tooltip rows.
 * @param tooltipFormatterParams The formatter params provided by ECharts.
 * @returns The normalized overlap tooltip params.
 */
function normalizeOverlapTooltipParams(
    tooltipFormatterParams: TopLevelFormatterParams,
): OverlapTooltipParam[] {
    const sTooltipParams = Array.isArray(tooltipFormatterParams)
        ? tooltipFormatterParams
        : [tooltipFormatterParams];

    return sTooltipParams.map(toOverlapTooltipParam);
}

/**
 * Keeps only tooltip callback fields used by the overlap formatter.
 * Intent: Decouple overlap tooltip rendering from the full ECharts callback param shape.
 * @param tooltipCallbackParam The ECharts formatter param.
 * @returns The local tooltip param shape.
 */
function toOverlapTooltipParam(
    tooltipCallbackParam: CallbackDataParams,
): OverlapTooltipParam {
    return {
        color: getOverlapTooltipColor(tooltipCallbackParam.color),
        seriesIndex: tooltipCallbackParam.seriesIndex,
        value: getOverlapTooltipValue(tooltipCallbackParam.value),
    };
}

/**
 * Formats all overlap tooltip rows.
 * Intent: Keep row joining separate from one-row timestamp and value rendering.
 * @param tooltipItems The normalized tooltip rows from ECharts.
 * @param chartData The overlap chart datasets.
 * @param seriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The joined tooltip row HTML.
 */
function formatOverlapTooltipRows(
    tooltipItems: OverlapTooltipParam[],
    chartData: ChartSeriesItem[],
    seriesStartTimeList: number[],
): string {
    const sTooltipRows: string[] = [];

    for (const sTooltipItem of tooltipItems) {
        sTooltipRows.push(
            formatOverlapTooltipRow(sTooltipItem, chartData, seriesStartTimeList),
        );
    }

    return sTooltipRows.join('<br/>');
}

/**
 * Formats one overlap tooltip row.
 * Intent: Keep per-series color, timestamp, and value rendering in one focused helper.
 * @param tooltipItem The normalized ECharts tooltip item.
 * @param chartData The overlap chart datasets.
 * @param seriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip row HTML.
 */
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

/**
 * Rebuilds the original timestamp for one overlap tooltip item.
 * Intent: Convert rebased overlap x-values back to the source series time.
 * @param tooltipItem The normalized ECharts tooltip item.
 * @param seriesStartTime The original start time for the tooltip item's series.
 * @returns The original chart timestamp.
 */
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

/**
 * Returns a CSS color only when ECharts provides a string color.
 * Intent: Avoid rendering object-based gradient colors as CSS text.
 * @param tooltipColor The ECharts callback color value.
 * @returns The CSS color string, if one exists.
 */
function getOverlapTooltipColor(
    tooltipColor: CallbackDataParams['color'],
): string | undefined {
    return typeof tooltipColor === 'string' ? tooltipColor : undefined;
}

/**
 * Returns array-shaped tooltip values used by overlap line-series data.
 * Intent: Ignore unrelated ECharts value shapes before indexing into x/y values.
 * @param tooltipValue The ECharts callback value.
 * @returns The normalized tooltip value, if it has the expected array shape.
 */
function getOverlapTooltipValue(
    tooltipValue: CallbackDataParams['value'],
): OverlapTooltipValue | undefined {
    return Array.isArray(tooltipValue)
        ? (tooltipValue as OverlapTooltipValue)
        : undefined;
}
