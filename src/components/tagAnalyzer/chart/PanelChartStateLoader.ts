import type { ChartData } from '../utils/series/seriesTypes';
import type {
    PanelChartLoadState,
    PanelFetchRequest,
} from './PanelChartLoadContracts';
import {
    EMPTY_INTERVAL_OPTION,
    fetchPanelDatasetsFromRequest,
} from './PanelChartDatasetFetcher';
import { createPanelOverflowRange } from './PanelChartOverflowPolicy';

export {
    fetchPanelDatasets,
} from './PanelChartDatasetFetcher';
export {
    calculatePanelFetchCount,
    isFetchableTimeRange,
    resolvePanelFetchInterval,
    resolvePanelFetchTimeRange,
} from './PanelChartFetchPolicy';
export {
    analyzePanelDataLimit,
} from './PanelChartOverflowPolicy';

/**
 * Loads chart data for the navigator view.
 * Intent: Reuse the shared fetch pipeline while honoring navigator-specific sampling behavior.
 *
 * @param aRequest The panel fetch request to resolve.
 * @returns The navigator chart data for the request.
 */
export async function loadNavigatorChartState(
    aRequest: PanelFetchRequest,
): Promise<ChartData> {
    const sFetchResult = await fetchPanelDatasetsFromRequest(
        aRequest,
        aRequest.panelAxes.sampling.enabled,
        false,
        true,
    );

    return { datasets: sFetchResult?.datasets ?? [] };
}

/**
 * Loads chart data and range state for the main panel view.
 * Intent: Bundle the chart payload with overflow range information needed by the panel UI.
 *
 * @param aRequest The panel fetch request to resolve.
 * @returns The panel chart load state.
 */
export async function loadPanelChartState(
    aRequest: PanelFetchRequest,
): Promise<PanelChartLoadState> {
    const sFetchResult = await fetchPanelDatasetsFromRequest(aRequest, false, true, undefined);

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
