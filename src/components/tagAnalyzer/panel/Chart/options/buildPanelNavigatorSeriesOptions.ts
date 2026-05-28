import type { SeriesOption } from 'echarts';
import {
    getPanelSeriesDisplayColor,
} from '../../../domain/SeriesDomain';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import {
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './PanelChartOptionConstants';
import { buildPanelLineSeriesOption } from './buildPanelLineSeriesOption';

type NavigatorSeriesHoverState = {
    isHoveredSeries: boolean;
    opacity: number;
};

function getNavigatorSeriesHoverState(
    seriesName: string,
    hoveredLegendSeries?: string | undefined,
): NavigatorSeriesHoverState {
    const sIsLegendHoverActive = Boolean(hoveredLegendSeries);
    const sIsHoveredSeries = hoveredLegendSeries === seriesName;

    return {
        isHoveredSeries: sIsHoveredSeries,
        opacity:
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY,
    };
}

function buildNavigatorSeriesItem(
    series: ChartSeriesData,
    seriesIndex: number,
    seriesColor: string,
    hoverState: NavigatorSeriesHoverState,
): SeriesOption {
    return buildPanelLineSeriesOption({
        id: `navigator-series-${seriesIndex}`,
        name: series.name,
        data: series.data,
        xAxisIndex: 1,
        yAxisIndex: 2,
        lineStyle: {
            width: hoverState.isHoveredSeries ? 2 : 1,
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        itemStyle: {
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        extra: {
            showSymbol: false,
            silent: true,
            tooltip: {
                show: false,
            },
            z: hoverState.isHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        },
    });
}

export function buildNavigatorSeriesOption(
    chartData: ChartSeriesData[],
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sHoverState = getNavigatorSeriesHoverState(series.name, hoveredLegendSeries);
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildNavigatorSeriesItem(series, seriesIndex, sSeriesColor, sHoverState);
    });
}
