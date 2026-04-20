import type {
    ChartSeriesItem,
    PanelAxes,
    PanelDisplay,
} from '../../utils/ModelTypes';
import type { PanelVisibleSeriesItem } from '../../utils/PanelTypes';
import type {
    PanelChartOption,
    PanelSeriesOptions,
    ThresholdLineOption,
} from './PanelChartOptionTypes';
import {
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './PanelChartOptionConstants';

/**
 * Mirrors legend visibility into the format ECharts expects for selected series.
 * @param aChartData The visible chart datasets.
 * @param aVisibleSeries The current legend visibility map.
 * @returns The ECharts legend selection map.
 */
export function buildPanelLegendSelectedMap(
    aChartData: ChartSeriesItem[],
    aVisibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return aChartData.reduce<Record<string, boolean>>((aResult, aSeries) => {
        aResult[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aResult;
    }, {});
}

/**
 * Seeds every visible series as enabled until the user toggles the legend.
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
 * Builds the series portion of the panel option so hover-only updates can merge style changes
 * without rebuilding axes, tooltip, zoom, and layout state.
 * @param aChartData The chart datasets to render in the main plot.
 * @param aDisplay The display settings that control points, fill, and stroke.
 * @param aAxes The panel axis settings that control threshold overlays.
 * @param aNavigatorChartData The chart datasets mirrored into the navigator lane.
 * @param aHoveredLegendSeries The legend item currently being hovered, if any.
 * @returns The chart-series option used for full renders and hover-only patches.
 */
export function buildPanelChartSeriesOption(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aNavigatorChartData: ChartSeriesItem[] = aChartData,
    aHoveredLegendSeries?: string | undefined,
): Pick<PanelChartOption, 'series'> {
    return {
        series: buildMainSeries(aChartData, aDisplay, aAxes, aHoveredLegendSeries).concat(
            buildNavigatorSeries(aNavigatorChartData, aHoveredLegendSeries),
        ),
    };
}

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

function buildMainSeries(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aAxes: PanelAxes,
    aHoveredLegendSeries?: string | undefined,
): PanelSeriesOptions {
    const sLeftThreshold = buildThresholdLine(aAxes.use_ucl, '#ec7676', aAxes.ucl_value);
    const sLeftLowerThreshold = buildThresholdLine(aAxes.use_lcl, 'orange', aAxes.lcl_value);
    const sRightThreshold = buildThresholdLine(aAxes.use_ucl2, '#ec7676', aAxes.ucl2_value);
    const sRightLowerThreshold = buildThresholdLine(aAxes.use_lcl2, 'orange', aAxes.lcl2_value);

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
