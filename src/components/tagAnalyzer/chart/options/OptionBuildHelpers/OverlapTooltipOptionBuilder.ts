import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { TooltipComponentOption } from 'echarts';
import type {
    CallbackDataParams,
    TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import type { ChartSeriesItem } from '../../../utils/series/seriesTypes';
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
 * @param aChartData The overlap chart datasets.
 * @param aSeriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip option for the overlap chart.
 */
export function buildOverlapTooltipOption(
    aChartData: ChartSeriesItem[],
    aSeriesStartTimeList: number[],
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        formatter: (aTooltipFormatterParams: TopLevelFormatterParams) =>
            formatOverlapTooltip(
                aTooltipFormatterParams,
                aChartData,
                aSeriesStartTimeList,
            ),
    };
}

/**
 * Formats overlap tooltip rows from ECharts formatter params.
 * Intent: Keep ECharts callback normalization separate from overlap tooltip HTML assembly.
 * @param aTooltipFormatterParams The formatter params provided by ECharts.
 * @param aChartData The overlap chart datasets.
 * @param aSeriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip HTML.
 */
function formatOverlapTooltip(
    aTooltipFormatterParams: TopLevelFormatterParams,
    aChartData: ChartSeriesItem[],
    aSeriesStartTimeList: number[],
): string {
    const sTooltipItems = normalizeOverlapTooltipParams(aTooltipFormatterParams);
    const sTooltipRows = formatOverlapTooltipRows(
        sTooltipItems,
        aChartData,
        aSeriesStartTimeList,
    );

    return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sTooltipRows}</div></div>`;
}

/**
 * Converts ECharts formatter params into overlap tooltip params.
 * Intent: Keep runtime ECharts fields explicit before rendering tooltip rows.
 * @param aTooltipFormatterParams The formatter params provided by ECharts.
 * @returns The normalized overlap tooltip params.
 */
function normalizeOverlapTooltipParams(
    aTooltipFormatterParams: TopLevelFormatterParams,
): OverlapTooltipParam[] {
    const sTooltipParams = Array.isArray(aTooltipFormatterParams)
        ? aTooltipFormatterParams
        : [aTooltipFormatterParams];

    return sTooltipParams.map(toOverlapTooltipParam);
}

/**
 * Keeps only tooltip callback fields used by the overlap formatter.
 * Intent: Decouple overlap tooltip rendering from the full ECharts callback param shape.
 * @param aTooltipCallbackParam The ECharts formatter param.
 * @returns The local tooltip param shape.
 */
function toOverlapTooltipParam(
    aTooltipCallbackParam: CallbackDataParams,
): OverlapTooltipParam {
    return {
        color: getOverlapTooltipColor(aTooltipCallbackParam.color),
        seriesIndex: aTooltipCallbackParam.seriesIndex,
        value: getOverlapTooltipValue(aTooltipCallbackParam.value),
    };
}

/**
 * Formats all overlap tooltip rows.
 * Intent: Keep row joining separate from one-row timestamp and value rendering.
 * @param aTooltipItems The normalized tooltip rows from ECharts.
 * @param aChartData The overlap chart datasets.
 * @param aSeriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The joined tooltip row HTML.
 */
function formatOverlapTooltipRows(
    aTooltipItems: OverlapTooltipParam[],
    aChartData: ChartSeriesItem[],
    aSeriesStartTimeList: number[],
): string {
    const sTooltipRows: string[] = [];

    for (const sTooltipItem of aTooltipItems) {
        sTooltipRows.push(
            formatOverlapTooltipRow(sTooltipItem, aChartData, aSeriesStartTimeList),
        );
    }

    return sTooltipRows.join('<br/>');
}

/**
 * Formats one overlap tooltip row.
 * Intent: Keep per-series color, timestamp, and value rendering in one focused helper.
 * @param aTooltipItem The normalized ECharts tooltip item.
 * @param aChartData The overlap chart datasets.
 * @param aSeriesStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip row HTML.
 */
function formatOverlapTooltipRow(
    aTooltipItem: OverlapTooltipParam,
    aChartData: ChartSeriesItem[],
    aSeriesStartTimeList: number[],
): string {
    const sSeriesIndex = aTooltipItem.seriesIndex ?? 0;
    const sSeriesName = aChartData[sSeriesIndex]?.name ?? '';
    const sOriginalTimestamp = getOverlapTooltipOriginalTimestamp(
        aTooltipItem,
        aSeriesStartTimeList[sSeriesIndex] ?? 0,
    );

    return `<div style="color:${aTooltipItem.color}">${sSeriesName} : ${toDateUtcChart(
        sOriginalTimestamp,
        true,
    )} : ${aTooltipItem.value?.[1] ?? ''}</div>`;
}

/**
 * Rebuilds the original timestamp for one overlap tooltip item.
 * Intent: Convert rebased overlap x-values back to the source series time.
 * @param aTooltipItem The normalized ECharts tooltip item.
 * @param aSeriesStartTime The original start time for the tooltip item's series.
 * @returns The original chart timestamp.
 */
function getOverlapTooltipOriginalTimestamp(
    aTooltipItem: OverlapTooltipParam,
    aSeriesStartTime: number,
): number {
    return (
        Number(aTooltipItem.value?.[0] ?? 0) +
        aSeriesStartTime -
        1000 * 60 * getTimeZoneValue()
    );
}

/**
 * Returns a CSS color only when ECharts provides a string color.
 * Intent: Avoid rendering object-based gradient colors as CSS text.
 * @param aTooltipColor The ECharts callback color value.
 * @returns The CSS color string, if one exists.
 */
function getOverlapTooltipColor(
    aTooltipColor: CallbackDataParams['color'],
): string | undefined {
    return typeof aTooltipColor === 'string' ? aTooltipColor : undefined;
}

/**
 * Returns array-shaped tooltip values used by overlap line-series data.
 * Intent: Ignore unrelated ECharts value shapes before indexing into x/y values.
 * @param aTooltipValue The ECharts callback value.
 * @returns The normalized tooltip value, if it has the expected array shape.
 */
function getOverlapTooltipValue(
    aTooltipValue: CallbackDataParams['value'],
): OverlapTooltipValue | undefined {
    return Array.isArray(aTooltipValue)
        ? (aTooltipValue as OverlapTooltipValue)
        : undefined;
}
