import type { SeriesOption } from 'echarts';
import type { ChartSeriesItem } from '../../../utils/series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import {
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './ChartOptionConstants';
import { buildBasePanelLineSeriesOption } from './PanelLineSeriesUtils';

type NavigatorSeriesHoverState = {
    isHoveredSeries: boolean;
    opacity: number;
};

export function buildNavigatorSeriesOption(
    chartData: ChartSeriesItem[],
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sHoverState = getNavigatorSeriesHoverState(series.name, hoveredLegendSeries);
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildNavigatorSeriesItem(series, seriesIndex, sSeriesColor, sHoverState);
    });
}

function buildNavigatorSeriesItem(
    series: ChartSeriesItem,
    seriesIndex: number,
    seriesColor: string,
    hoverState: NavigatorSeriesHoverState,
): SeriesOption {
    return buildBasePanelLineSeriesOption({
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
