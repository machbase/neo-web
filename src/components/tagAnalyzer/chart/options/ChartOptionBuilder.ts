import { getTimeZoneValue } from '@/utils/utils';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import {
    getChartLayoutMetrics,
    LEGEND_TEXT_STYLE,
    NO_DATA_STYLE,
    PANEL_BACKGROUND,
    PANEL_GRID_BOTTOM,
    PANEL_GRID_SIDE,
    PANEL_LEGEND_TOP,
    PANEL_SLIDER_HEIGHT,
    TOOLTIP_BASE,
} from './ChartOptionConstants';
import type { EChartTooltipParam, PanelChartOption } from './ChartOptionTypes';
import { buildChartXAxisOption, buildChartYAxisOption } from './ChartAxisUtils';
import {
    buildChartSeriesOption,
    buildChartLegendSelectedMap,
} from './ChartSeriesUtils';

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
    const sLayout = getChartLayoutMetrics(aDisplay.show_legend);

    return {
        animation: false,
        backgroundColor: PANEL_BACKGROUND,
        textStyle: {
            fontFamily: 'Open Sans, Helvetica, Arial, sans-serif',
        },
        grid: [
            {
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: sLayout.mainGridTop,
                height: sLayout.mainGridHeight,
            },
            {
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
            },
        ],
        legend: {
            show: aDisplay.show_legend,
            left: 10,
            top: PANEL_LEGEND_TOP,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
            selected: buildChartLegendSelectedMap(aChartData, aVisibleSeries),
        },
        tooltip: buildChartTooltipOption(),
        xAxis: buildChartXAxisOption(aNavigatorRange, aDisplay, aAxes),
        yAxis: buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize),
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: [0],
                filterMode: 'none',
                moveOnMouseMove: false,
                moveOnMouseWheel: false,
                zoomOnMouseWheel: false,
                preventDefaultMouseMove: true,
                disabled: !aDisplay.use_zoom,
            },
            {
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'none',
                realtime: false,
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
                showDetail: false,
                brushSelect: false,
                backgroundColor: 'rgba(0,0,0,0)',
                borderColor: '#323333',
                fillerColor: 'rgba(119, 119, 119, 0.3)',
                showDataShadow: false,
                dataBackground: {
                    lineStyle: {
                        color: '#90949b',
                        opacity: 0.6,
                    },
                    areaStyle: {
                        color: '#90949b',
                        opacity: 0.16,
                    },
                },
                selectedDataBackground: {
                    lineStyle: {
                        color: '#d7dadf',
                        opacity: 0.8,
                    },
                    areaStyle: {
                        color: '#b2b8c0',
                        opacity: 0.2,
                    },
                },
                handleSize: 20,
                handleStyle: {
                    color: 'rgba(248,248,248,0.4)',
                    borderColor: '#323333',
                },
                moveHandleStyle: {
                    color: 'rgba(248,248,248,0.15)',
                    opacity: 0.4,
                },
            },
        ],
        brush: {
            toolbox: [],
            xAxisIndex: 0,
            brushMode: 'single',
            throttleType: 'debounce',
            throttleDelay: 150,
            brushStyle: {
                color: 'rgba(68, 170, 213, 0.2)',
                borderColor: 'rgba(68, 170, 213, 0.5)',
            },
        },
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
        toolbox: {
            show: false,
        },
        title: {
            show: false,
        },
        noData: {
            style: NO_DATA_STYLE,
        },
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

