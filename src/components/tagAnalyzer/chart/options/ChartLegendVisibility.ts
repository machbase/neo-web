import type { PanelVisibleSeriesItem } from '../../utils/panelRuntimeTypes';
import type { ChartSeriesItem } from '../../utils/series/PanelSeriesTypes';

const isSeriesVisible = (visibleSeries: Record<string, boolean>, seriesName: string) =>
    visibleSeries[seriesName] !== false;

export function buildChartLegendSelectedMap(
    chartData: ChartSeriesItem[],
    visibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return Object.fromEntries(
        chartData.map((series) => [series.name, isSeriesVisible(visibleSeries, series.name)]),
    );
}

export function buildDefaultVisibleSeriesMap(
    chartData: ChartSeriesItem[],
): Record<string, boolean> {
    return Object.fromEntries(chartData.map((series) => [series.name, true]));
}

export function buildVisibleSeriesList(
    chartData: ChartSeriesItem[],
    visibleSeries: Record<string, boolean>,
): PanelVisibleSeriesItem[] {
    return chartData.map((series) => ({
        name: series.name,
        visible: isSeriesVisible(visibleSeries, series.name),
    }));
}
