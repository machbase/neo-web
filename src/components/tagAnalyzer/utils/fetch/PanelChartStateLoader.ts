import type { ChartData } from '../series/PanelSeriesTypes';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../time/types/TimeTypes';
import type {
    FetchPanelDatasetsResult,
    PanelChartLoadState,
} from './FetchTypes';
import { EMPTY_INTERVAL_OPTION } from './FetchConstants';
import { fetchPanelDatasets } from './PanelChartDatasetFetcher';
import { createPanelOverflowRange } from './PanelChartOverflowPolicy';

/**
 * Loads chart data for the navigator view.
 * Intent: Reuse the shared fetch pipeline while honoring navigator-specific sampling behavior.
 *
 * @param panelData The panel data payload.
 * @param panelTime The panel time payload.
 * @param panelAxes The panel axes payload.
 * @param boardTime The board time input.
 * @param chartWidth The visible chart width.
 * @param isRaw Whether the panel is loading raw data.
 * @param timeRange The explicit data range to load.
 * @param rollupTableList The available rollup tables.
 * @returns The navigator chart data for the request.
 */
export async function loadNavigatorChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
): Promise<ChartData> {
    const sFetchResult = await loadPanelDatasets(
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        panelAxes.sampling.enabled,
        false,
        true,
    );
    if (!sFetchResult) {
        return { datasets: [] };
    }

    return { datasets: sFetchResult.datasets };
}

/**
 * Loads chart data and range state for the main panel view.
 * Intent: Bundle the chart payload with overflow range information needed by the panel UI.
 *
 * @param panelData The panel data payload.
 * @param panelTime The panel time payload.
 * @param panelAxes The panel axes payload.
 * @param boardTime The board time input.
 * @param chartWidth The visible chart width.
 * @param isRaw Whether the panel is loading raw data.
 * @param timeRange The explicit data range to load.
 * @param rollupTableList The available rollup tables.
 * @returns The panel chart load state.
 */
export async function loadPanelChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
): Promise<PanelChartLoadState> {
    const sFetchResult = await loadPanelDatasets(
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        false,
        true,
        undefined,
    );
    if (!sFetchResult) {
        return {
            chartData: { datasets: [] },
            rangeOption: EMPTY_INTERVAL_OPTION,
            overflowRange: undefined,
        };
    }

    return {
        chartData: { datasets: sFetchResult.datasets },
        rangeOption: sFetchResult.interval,
        overflowRange: createPanelOverflowRange(sFetchResult),
    };
}

async function loadPanelDatasets(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
    useSampling: boolean,
    includeColor: boolean,
    isNavigator: boolean | undefined,
): Promise<FetchPanelDatasetsResult | undefined> {
    const sSeriesConfigSet = panelData.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return undefined;
    }

    return fetchPanelDatasets(
        sSeriesConfigSet,
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling,
        includeColor,
        isNavigator,
    );
}
