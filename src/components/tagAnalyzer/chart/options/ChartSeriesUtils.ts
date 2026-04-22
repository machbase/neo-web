import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { PanelVisibleSeriesItem } from '../../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import type {
    PanelChartOption,
    PanelSeriesOptions,
    ThresholdLineOption,
} from './ChartOptionTypes';
import { buildChartYAxisOption } from './ChartAxisUtils';
import {
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './ChartOptionConstants';

export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';

/**
 * Converts legend visibility into the selected-series map ECharts expects.
 * Intent: Keep the panel's visibility state synchronized with the legend without inline mapping logic.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The ECharts legend selection map.
 */
export function buildChartLegendSelectedMap(
    aChartData: ChartSeriesItem[],
    aVisibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return aChartData.reduce<Record<string, boolean>>((aResult, aSeries) => {
        aResult[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aResult;
    }, {});
}

/**
 * Builds the default visibility map with every unique series enabled.
 * Intent: Give the panel a predictable starting legend state before any user toggles occur.
 * @param aChartData The visible chart datasets.
 * @returns The default visible-series map for the legend.
 */
export function buildDefaultVisibleSeriesMap(
    aChartData: ChartSeriesItem[],
): Record<string, boolean> {
    return aChartData.reduce<Record<string, boolean>>((aResult, aSeries) => {
        if (aResult[aSeries.name] === undefined) {
            aResult[aSeries.name] = true;
        }
        return aResult;
    }, {});
}

/**
 * Returns the current legend visibility in a UI-friendly list form.
 * Intent: Give non-chart panel controls an explicit series list without leaking ECharts-specific shapes.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The series visibility list used by the panel UI.
 */
export function buildVisibleSeriesList(
    aChartData: ChartSeriesItem[],
    aVisibleSeries: Record<string, boolean>,
): PanelVisibleSeriesItem[] {
    return aChartData.map((aSeries) => ({
        name: aSeries.name,
        visible: aVisibleSeries[aSeries.name] !== false,
    }));
}

/**
 * Builds the series portion of the panel chart option.
 * Intent: Let hover-only updates replace series styling without rebuilding the rest of the chart option.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @param aNavigatorChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The chart-series option used for full renders and hover-only patches.
 */
export function buildChartSeriesOption(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aNavigatorChartData: ChartSeriesItem[] = aChartData,
    aHoveredLegendSeries?: string | undefined,
    aHighlights: PanelHighlight[] = [],
    aNavigatorRange?: TimeRangeMs,
    aIsRaw = false,
    aUseNormalize = false,
): Pick<PanelChartOption, 'series'> {
    return {
        series: buildHighlightOverlaySeries(aHighlights, aNavigatorRange)
            .concat(
                buildHighlightLabelSeries(
                    aHighlights,
                    aChartData,
                    aAxes,
                    aIsRaw,
                    aUseNormalize,
                ),
            )
            .concat(buildMainSeries(aChartData, aDisplay, aAxes, aHoveredLegendSeries))
            .concat(buildNavigatorSeries(aNavigatorChartData, aHoveredLegendSeries)),
    };
}

/**
 * Builds a dedicated non-legend overlay series for saved highlight ranges.
 * Intent: Render highlight shading without changing y-axis calculations or series legend state.
 * @param aHighlights The saved highlight ranges for the panel.
 * @param aNavigatorRange The navigator range that bounds the chart.
 * @returns The optional highlight overlay series.
 */
function buildHighlightOverlaySeries(
    aHighlights: PanelHighlight[],
    aNavigatorRange: TimeRangeMs | undefined,
): PanelSeriesOptions {
    const sHighlightAreas: Array<
        [
            {
                name: string;
                xAxis: number;
            },
            {
                xAxis: number;
            },
        ]
    > = (aHighlights ?? [])
        .filter(
            (aHighlight) =>
                Number.isFinite(aHighlight.timeRange.startTime) &&
                Number.isFinite(aHighlight.timeRange.endTime) &&
                aHighlight.timeRange.endTime > aHighlight.timeRange.startTime,
        )
        .map((aHighlight) => [
            {
                name: aHighlight.text || 'unnamed',
                xAxis: aHighlight.timeRange.startTime,
            },
            {
                xAxis: aHighlight.timeRange.endTime,
            },
        ]);

    if (sHighlightAreas.length === 0 || !aNavigatorRange) {
        return [];
    }

    return [
        {
            id: 'highlight-overlay',
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: [],
            symbol: 'none',
            showSymbol: false,
            silent: true,
            animation: false,
            legendHoverLink: false,
            lineStyle: {
                width: 0,
                opacity: 0,
            },
            itemStyle: {
                opacity: 0,
            },
            tooltip: {
                show: false,
            },
            z: 1,
            emphasis: {
                disabled: true,
            },
            markArea: {
                silent: true,
                itemStyle: {
                    color: 'rgba(253, 181, 50, 0.16)',
                },
                label: {
                    show: false,
                    color: '#fdb532',
                    fontSize: 10,
                },
                data: sHighlightAreas,
            },
        },
    ];
}

/**
 * Builds a dedicated clickable label series for saved highlights.
 * Intent: Limit rename interactions to the rendered label area instead of the whole highlighted band.
 * @param aHighlights The saved highlight ranges for the panel.
 * @param aChartData The visible chart datasets used to resolve the current y-axis range.
 * @param aAxes The panel axis settings used to resolve the main y-axis range.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is active.
 * @returns The optional clickable highlight label series.
 */
function buildHighlightLabelSeries(
    aHighlights: PanelHighlight[],
    aChartData: ChartSeriesItem[],
    aAxes: PanelAxes,
    aIsRaw: boolean,
    aUseNormalize: boolean,
): PanelSeriesOptions {
    const sPrimaryYAxis = buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize)[0];
    const sAxisMin = Number(sPrimaryYAxis.min);
    const sAxisMax = Number(sPrimaryYAxis.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sAxisHeight = sAxisMax - sAxisMin;
    const sLabelY =
        sAxisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(sAxisMax) * 0.04, 1));
    const sLabelData = (aHighlights ?? [])
        .filter(
            (aHighlight) =>
                Number.isFinite(aHighlight.timeRange.startTime) &&
                Number.isFinite(aHighlight.timeRange.endTime) &&
                aHighlight.timeRange.endTime > aHighlight.timeRange.startTime,
        )
        .map((aHighlight, aIndex) => ({
            name: aHighlight.text || 'unnamed',
            value: [
                (aHighlight.timeRange.startTime + aHighlight.timeRange.endTime) / 2,
                sLabelY,
            ],
            highlightIndex: aIndex,
        }));

    if (sLabelData.length === 0) {
        return [];
    }

    return [
        {
            id: HIGHLIGHT_LABEL_SERIES_ID,
            type: 'scatter',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: sLabelData,
            symbol: 'roundRect',
            symbolSize: [120, 18],
            animation: false,
            legendHoverLink: false,
            itemStyle: {
                color: 'rgba(0, 0, 0, 0)',
                borderColor: 'rgba(0, 0, 0, 0)',
            },
            label: {
                show: true,
                position: 'inside',
                color: '#fdb532',
                fontSize: 10,
                formatter: '{b}',
                padding: [2, 4],
            },
            emphasis: {
                scale: false,
            },
            tooltip: {
                show: false,
            },
            z: 3,
        },
    ];
}

/**
 * Builds a threshold mark-line definition when that threshold is enabled.
 * Intent: Keep threshold-line construction consistent for both left and right axes.
 * @param aUseFlag Whether the threshold should be enabled.
 * @param aColor The threshold line color.
 * @param aValue The threshold value to render.
 * @returns The mark-line option when the threshold is enabled, otherwise `undefined`.
 */
function buildThresholdLine(
    aUseFlag: boolean,
    aColor: string,
    aValue: number,
): ThresholdLineOption | undefined {
    if (!aUseFlag) {
        return undefined;
    }

    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: aColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: aValue }],
    };
}

/**
 * Builds the main plot series definitions for the panel chart.
 * Intent: Centralize hover styling, threshold overlays, and display flags for the primary chart lane.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The main-series definitions for the chart.
 */
function buildMainSeries(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    const sLeftThreshold = buildThresholdLine(
        aAxes.left_y_axis.upper_control_limit.enabled,
        '#ec7676',
        aAxes.left_y_axis.upper_control_limit.value,
    );
    const sLeftLowerThreshold = buildThresholdLine(
        aAxes.left_y_axis.lower_control_limit.enabled,
        'orange',
        aAxes.left_y_axis.lower_control_limit.value,
    );
    const sRightThreshold = buildThresholdLine(
        aAxes.right_y_axis.upper_control_limit.enabled,
        '#ec7676',
        aAxes.right_y_axis.upper_control_limit.value,
    );
    const sRightLowerThreshold = buildThresholdLine(
        aAxes.right_y_axis.lower_control_limit.enabled,
        'orange',
        aAxes.right_y_axis.lower_control_limit.value,
    );

    return aChartData.map((aSeries, aIndex) => {
        const sMarkLineData = [];
        const sBaseSymbolSize = aDisplay.point_radius > 0 ? aDisplay.point_radius * 2 : 0;
        const sSymbolSize = aDisplay.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sSeriesOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_LINE_OPACITY;
        const sItemOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_ITEM_OPACITY;
        const sAreaOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? aDisplay.fill
                : Math.min(aDisplay.fill, PANEL_LEGEND_FADE_AREA_OPACITY);
        const sSeriesStroke = sIsHoveredSeries ? aDisplay.stroke + 1 : aDisplay.stroke;
        const sMarkLineOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_MARK_LINE_OPACITY;

        if (aSeries.yAxis === 0) {
            if (sLeftThreshold?.data?.[0]) sMarkLineData.push(sLeftThreshold.data[0]);
            if (sLeftLowerThreshold?.data?.[0]) sMarkLineData.push(sLeftLowerThreshold.data[0]);
        } else {
            if (sRightThreshold?.data?.[0]) sMarkLineData.push(sRightThreshold.data[0]);
            if (sRightLowerThreshold?.data?.[0]) sMarkLineData.push(sRightLowerThreshold.data[0]);
        }

        return {
            id: `main-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            legendHoverLink: false,
            xAxisIndex: 0,
            yAxisIndex: aSeries.yAxis ?? 0,
            data: aSeries.data,
            symbol: 'circle',
            showSymbol: aDisplay.show_point,
            symbolSize: sSymbolSize,
            lineStyle: {
                width: sSeriesStroke,
                color: aSeries.color,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sItemOpacity,
            },
            areaStyle:
                aDisplay.fill > 0 ? { opacity: sAreaOpacity, color: aSeries.color } : undefined,
            connectNulls: false,
            animation: false,
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            z: sIsHoveredSeries ? 4 : 2,
            markLine:
                sMarkLineData.length > 0
                    ? {
                          silent: true,
                          symbol: 'none',
                          lineStyle: {
                              width: 1,
                              opacity: sMarkLineOpacity,
                          },
                          label: { show: false },
                          data: sMarkLineData,
                      }
                    : undefined,
        };
    });
}

/**
 * Builds the navigator-lane series definitions for the panel chart.
 * Intent: Keep the lower overview lane visually aligned with the main series while staying interaction-light.
 * @param aChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The navigator-series definitions for the chart.
 */
function buildNavigatorSeries(
    aChartData: ChartSeriesItem[],
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    return aChartData.map((aSeries, aIndex) => {
        const sIsLegendHoverActive = Boolean(aHoveredLegendSeries);
        const sIsHoveredSeries = aHoveredLegendSeries === aSeries.name;
        const sNavigatorOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY;

        return {
            id: `navigator-series-${aIndex}`,
            name: aSeries.name,
            type: 'line',
            legendHoverLink: false,
            xAxisIndex: 1,
            yAxisIndex: 2,
            data: aSeries.data,
            showSymbol: false,
            silent: true,
            animation: false,
            tooltip: {
                show: false,
            },
            large: aSeries.data.length > 5000,
            sampling: aSeries.data.length > 1000 ? 'lttb' : undefined,
            lineStyle: {
                width: sIsHoveredSeries ? 2 : 1,
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            itemStyle: {
                color: aSeries.color,
                opacity: sNavigatorOpacity,
            },
            z: sIsHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        };
    });
}

