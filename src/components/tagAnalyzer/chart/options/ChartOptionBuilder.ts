import { getTimeZoneValue } from '@/utils/utils';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import { TOOLTIP_BASE } from './ChartOptionConstants';
import type { EChartTooltipParam, PanelChartOption } from './ChartOptionTypes';
import { buildChartXAxisOption, buildChartYAxisOption } from './ChartAxisUtils';
import {
    HIDDEN_PANEL_TITLE_OPTION,
    HIDDEN_PANEL_TOOLBOX_OPTION,
    PANEL_CHART_BASE_OPTION,
    PANEL_CHART_BRUSH_OPTION,
    PANEL_NO_DATA_OPTION,
    buildPanelChartDataZoomOption,
    buildPanelChartGridOption,
    buildPanelChartLegendOption,
} from './ChartOptionSections';
import { buildChartSeriesOption } from './ChartSeriesUtils';

/**
 * Builds the full ECharts option for the panel chart and navigator pair.
 * Intent: Keep structural chart configuration in one explicit builder so panel renders stay predictable.
 * @param aChartData The chart datasets to render in the panel.
 * @param aNavigatorRange The full navigator range that bounds the chart axes.
 * @param aAxes The panel axis settings used to build y-axes and thresholds.
 * @param aDisplay The display settings used to build legends, lines, and zoom UI.
 * @param aIsRaw Whether the panel is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is currently enabled.
 * @param aVisibleSeries The current legend-selected visibility map.
 * @param aNavigatorChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @param aHighlights The saved highlight ranges rendered over the main chart.
 * @returns The ECharts option for the main chart and slider pair.
 */
export function buildChartOption(
    aChartData: ChartSeriesItem[],
    aNavigatorRange: TimeRangeMs,
    aAxes: PanelAxes,
    aDisplay: PanelDisplay,
    aIsRaw: boolean,
    aUseNormalize: boolean,
    aVisibleSeries: Record<string, boolean>,
    aNavigatorChartData: ChartSeriesItem[] = aChartData,
    aHoveredLegendSeries?: string | undefined,
    aHighlights: PanelHighlight[] = [],
): PanelChartOption {
    return {
        ...PANEL_CHART_BASE_OPTION,
        grid: buildPanelChartGridOption(aDisplay),
        legend: buildPanelChartLegendOption(aChartData, aDisplay, aVisibleSeries),
        tooltip: buildChartTooltipOption(),
        xAxis: buildChartXAxisOption(aNavigatorRange, aDisplay, aAxes),
        yAxis: buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize),
        dataZoom: buildPanelChartDataZoomOption(aDisplay),
        brush: PANEL_CHART_BRUSH_OPTION,
        ...buildChartSeriesOption(
            aChartData,
            aDisplay,
            aAxes,
            aNavigatorChartData,
            aHoveredLegendSeries,
            aHighlights,
            aNavigatorRange,
            aIsRaw,
            aUseNormalize,
        ),
        toolbox: HIDDEN_PANEL_TOOLBOX_OPTION,
        title: HIDDEN_PANEL_TITLE_OPTION,
        noData: PANEL_NO_DATA_OPTION,
    };
}

/**
 * Builds the tooltip configuration used by the main panel chart.
 * Intent: Keep tooltip presentation logic isolated from the rest of the chart option builder.
 * @returns The tooltip option for the main panel chart.
 */
function buildChartTooltipOption() {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: (aParams: unknown) => {
            const sItems = (
                Array.isArray(aParams) ? aParams : [aParams]
            ) as EChartTooltipParam[];
            const sMainSeriesItems = sItems.filter((aItem) =>
                aItem?.seriesId?.startsWith('main-series'),
            );
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
                        .map(
                            (aItem) =>
                                `<div style="color:${aItem.color};margin:0;padding:0;white-space:nowrap">${aItem.seriesName} : ${aItem.value?.[1] ?? ''}</div>`,
                        )
                        .join('')}
                    </div>
                </div>`;
        },
    };
}

/**
 * Formats a tooltip timestamp into the panel's display string.
 * Intent: Apply the panel-specific timezone and fractional-second rules in one place.
 * @param aValue The timestamp to format.
 * @returns The formatted tooltip timestamp.
 */
function formatTooltipTime(aValue: number): string {
    const sFormatted = new Date(aValue - getTimeZoneValue() * 60000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');

    if (aValue % 1 !== 0) {
        return sFormatted + '.' + String(aValue).split('.')[1];
    }

    return sFormatted;
}
