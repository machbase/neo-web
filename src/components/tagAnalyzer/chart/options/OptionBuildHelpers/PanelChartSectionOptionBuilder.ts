import type {
    DataZoomComponentOption,
    GridComponentOption,
    LegendComponentOption,
} from 'echarts';
import type { PanelDisplay } from '../../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import {
    LEGEND_TEXT_STYLE,
    PANEL_GRID_BOTTOM,
    PANEL_GRID_SIDE,
    PANEL_LEGEND_TOP,
    PANEL_SLIDER_HEIGHT,
} from '../ChartOptionConstants';
import {
    getChartLayoutMetricsWithLegend,
    getChartLayoutMetricsWithoutLegend,
} from '../ChartLayoutMetrics';
import { buildChartLegendSelectedMap } from '../ChartLegendVisibility';

/**
 * Builds the two-grid layout used by the main chart and navigator lane.
 * Intent: Keep vertical chart layout separate from data, axis, and interaction setup.
 * @param aShowLegend Whether the legend consumes vertical chart space.
 * @returns The ECharts grid option list for the panel chart.
 */
export function buildPanelChartGridOption(aShowLegend: boolean): GridComponentOption[] {
    const sLayout = aShowLegend
        ? getChartLayoutMetricsWithLegend()
        : getChartLayoutMetricsWithoutLegend();

    return [
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
    ];
}

/**
 * Builds the legend option and selected-series map for the panel chart.
 * Intent: Keep legend visibility and selection state in one named option section.
 * @param aChartData The chart series currently available for the legend.
 * @param aDisplay The display settings that decide whether the legend is shown.
 * @param aVisibleSeries The current visibility map from ECharts legend state.
 * @returns The ECharts legend option for the panel chart.
 */
export function buildPanelChartLegendOption(
    aChartData: ChartSeriesItem[],
    aDisplay: PanelDisplay,
    aVisibleSeries: Record<string, boolean>,
): LegendComponentOption {
    return {
        show: aDisplay.show_legend,
        left: 10,
        top: PANEL_LEGEND_TOP,
        itemGap: 15,
        textStyle: LEGEND_TEXT_STYLE,
        selected: buildChartLegendSelectedMap(aChartData, aVisibleSeries),
    };
}

/**
 * Builds the inside and slider dataZoom options for the panel chart.
 * Intent: Keep ECharts zoom component setup out of the top-level option composer.
 * @param aDisplay The display settings that decide whether drag zoom is enabled.
 * @returns The ECharts dataZoom option list for the panel chart.
 */
export function buildPanelChartDataZoomOption(
    aDisplay: PanelDisplay,
): DataZoomComponentOption[] {
    return [
        {
            type: 'inside' as const,
            xAxisIndex: [0],
            filterMode: 'none' as const,
            moveOnMouseMove: false,
            moveOnMouseWheel: false,
            zoomOnMouseWheel: false,
            preventDefaultMouseMove: true,
            disabled: !aDisplay.use_zoom,
        },
        {
            type: 'slider' as const,
            xAxisIndex: [0],
            filterMode: 'none' as const,
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
    ];
}
