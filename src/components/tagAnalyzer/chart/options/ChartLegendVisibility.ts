import type { PanelVisibleSeriesItem } from '../../utils/panelRuntimeTypes';
import type { ChartSeriesItem } from '../../utils/series/PanelSeriesTypes';

/**
 * Converts legend visibility into the selected-series map ECharts expects.
 * Intent: Keep the panel's visibility state synchronized with the legend without inline mapping logic.
 * @param chartData The visible chart datasets.
 * @param visibleSeries The current legend visibility map.
 * @returns The ECharts legend selection map.
 */
export function buildChartLegendSelectedMap(
    chartData: ChartSeriesItem[],
    visibleSeries: Record<string, boolean>,
): Record<string, boolean> {
    return chartData.reduce<Record<string, boolean>>((legendSelectedMap, series) => {
        legendSelectedMap[series.name] = visibleSeries[series.name] !== false;
        return legendSelectedMap;
    }, {});
}

/**
 * Builds the default visibility map with every unique series enabled.
 * Intent: Give the panel a predictable starting legend state before any user toggles occur.
 * @param chartData The visible chart datasets.
 * @returns The default visible-series map for the legend.
 */
export function buildDefaultVisibleSeriesMap(
    chartData: ChartSeriesItem[],
): Record<string, boolean> {
    return chartData.reduce<Record<string, boolean>>((defaultVisibleSeriesMap, series) => {
        if (defaultVisibleSeriesMap[series.name] === undefined) {
            defaultVisibleSeriesMap[series.name] = true;
        }
        return defaultVisibleSeriesMap;
    }, {});
}

/**
 * Returns the current legend visibility in a UI-friendly list form.
 * Intent: Give non-chart panel controls an explicit series list without leaking ECharts-specific shapes.
 * @param chartData The visible chart datasets.
 * @param visibleSeries The current legend visibility map.
 * @returns The series visibility list used by the panel UI.
 */
export function buildVisibleSeriesList(
    chartData: ChartSeriesItem[],
    visibleSeries: Record<string, boolean>,
): PanelVisibleSeriesItem[] {
    return chartData.map((series) => ({
        name: series.name,
        visible: visibleSeries[series.name] !== false,
    }));
}
