import type { PanelVisibleSeriesItem } from '../../utils/panelRuntimeTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';

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
    return aChartData.reduce<Record<string, boolean>>((aLegendSelectedMap, aSeries) => {
        aLegendSelectedMap[aSeries.name] = aVisibleSeries[aSeries.name] !== false;
        return aLegendSelectedMap;
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
    return aChartData.reduce<Record<string, boolean>>((aDefaultVisibleSeriesMap, aSeries) => {
        if (aDefaultVisibleSeriesMap[aSeries.name] === undefined) {
            aDefaultVisibleSeriesMap[aSeries.name] = true;
        }
        return aDefaultVisibleSeriesMap;
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
