import type {
    DataZoomComponentOption,
    GridComponentOption,
    LegendComponentOption,
} from 'echarts';
import type { PanelDisplay } from '../../../domain/PanelModel';
import type { ChartSeriesData } from '../../ChartTypes';
import { getChartLayoutMetrics } from '../../PanelChartLayoutMetrics';
import {
    LEGEND_TEXT_STYLE,
    PANEL_GRID_BOTTOM,
    PANEL_GRID_SIDE,
    PANEL_LEGEND_TOP,
    PANEL_SLIDER_HEIGHT,
} from './ChartOptionConstants';
import { buildChartLegendSelectedMap } from '../ChartLegendVisibility';

export function buildPanelChartGridOption(showLegend: boolean): GridComponentOption[] {
    const sLayout = getChartLayoutMetrics(showLegend);

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
        selected: buildChartLegendSelectedMap(chartData, visibleSeries),
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
