import type {
    DataZoomComponentOption,
    GridComponentOption,
    LegendComponentOption,
} from 'echarts';
import type { PanelDisplay } from '../../../domain/PanelModel';
import type { ChartSeriesData } from '../ChartTypes';
import { getChartLayoutMetrics } from '../PanelChartLayoutMetrics';
import {
    LEGEND_TEXT_STYLE,
    PANEL_GRID_SIDE,
    PANEL_LEGEND_TOP,
    PANEL_NAVIGATOR_GRID_SIDE,
} from './ChartOptionConstants';
import {
    PANEL_GRID_BOTTOM,
    PANEL_SLIDER_HEIGHT,
} from '../../../domain/ChartConstants';

function isChartSeriesVisible(
    visibleSeries: Record<string, boolean>,
    seriesName: string,
): boolean {
    return visibleSeries[seriesName] !== false;
}

export function buildPanelChartGridOption(showLegend: boolean): GridComponentOption[] {
    const sLayout = getChartLayoutMetrics(showLegend);

    return [
        {
            left: PANEL_GRID_SIDE,
            right: PANEL_GRID_SIDE,
            top: sLayout.mainGridTop,
            height: sLayout.mainGridHeight,
            containLabel: true,
        },
        {
            left: PANEL_NAVIGATOR_GRID_SIDE,
            right: PANEL_NAVIGATOR_GRID_SIDE,
            bottom: PANEL_GRID_BOTTOM,
            height: PANEL_SLIDER_HEIGHT,
        },
    ];
}

export function buildPanelChartLegendOption(
    chartData: ChartSeriesData[],
    display: PanelDisplay,
    visibleSeries: Record<string, boolean>,
): LegendComponentOption {
    return {
        show: display.show_legend,
        left: 10,
        top: PANEL_LEGEND_TOP,
        itemGap: 15,
        textStyle: LEGEND_TEXT_STYLE,
        selected: Object.fromEntries(
            chartData.map((series) => [
                series.name,
                isChartSeriesVisible(visibleSeries, series.name),
            ]),
        ),
    };
}

export function buildPanelChartDataZoomOption(
    display: PanelDisplay,
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
            disabled: !display.use_zoom,
        },
        {
            type: 'slider' as const,
            xAxisIndex: [0],
            filterMode: 'none' as const,
            realtime: false,
            left: PANEL_NAVIGATOR_GRID_SIDE,
            right: PANEL_NAVIGATOR_GRID_SIDE,
            bottom: PANEL_GRID_BOTTOM,
            height: PANEL_SLIDER_HEIGHT,
            showDetail: false,
            brushSelect: false,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: '#7a828c',
            fillerColor: 'rgba(104, 119, 138, 0.28)',
            showDataShadow: false,
            dataBackground: {
                lineStyle: {
                    color: '#c0c7d0',
                    opacity: 0.8,
                },
                areaStyle: {
                    color: '#a8b0ba',
                    opacity: 0.28,
                },
            },
            selectedDataBackground: {
                lineStyle: {
                    color: '#a8b3c1',
                    opacity: 0.62,
                },
                areaStyle: {
                    color: '#7f8da0',
                    opacity: 0.18,
                },
            },
            handleSize: 24,
            handleStyle: {
                color: 'rgba(245, 247, 250, 0.78)',
                borderColor: '#8a939e',
            },
            moveHandleStyle: {
                color: 'rgba(245, 247, 250, 0.32)',
                opacity: 0.75,
            },
        },
    ];
}
