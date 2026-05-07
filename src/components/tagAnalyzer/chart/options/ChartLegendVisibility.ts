import type { ChartSeriesData } from '../ChartTypes';

export type ChartVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

const isSeriesVisible = (visibleSeries: Record<string, boolean>, seriesName: string) =>
    visibleSeries[seriesName] !== false;

export function buildChartLegendSelectedMap(
    chartData: ChartSeriesData[],
    visibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return Object.fromEntries(
        chartData.map((series) => [series.name, isSeriesVisible(visibleSeries, series.name)]),
    );
}

export function buildDefaultVisibleSeriesMap(
    chartData: ChartSeriesData[],
): Record<string, boolean> {
    return Object.fromEntries(chartData.map((series) => [series.name, true]));
}

export function buildVisibleSeriesList(
    chartData: ChartSeriesData[],
    visibleSeries: Record<string, boolean>,
): ChartVisibleSeriesItem[] {
    return chartData.map((series) => ({
        name: series.name,
        visible: isSeriesVisible(visibleSeries, series.name),
    }));
}
