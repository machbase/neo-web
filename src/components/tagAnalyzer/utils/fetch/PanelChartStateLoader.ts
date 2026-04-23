import type { ChartData } from '../series/PanelSeriesTypes';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../time/types/TimeTypes';
import type { PanelChartLoadState } from './FetchTypes';
import { EMPTY_INTERVAL_OPTION } from './FetchConstants';
import { fetchPanelDatasets } from './PanelChartDatasetFetcher';
import { createPanelOverflowRange } from './PanelChartOverflowPolicy';

/**
 * Loads chart data for the navigator view.
 * Intent: Reuse the shared fetch pipeline while honoring navigator-specific sampling behavior.
 *
 * @param aPanelData The panel data payload.
 * @param aPanelTime The panel time payload.
 * @param aPanelAxes The panel axes payload.
 * @param aBoardTime The board time input.
 * @param aChartWidth The visible chart width.
 * @param aIsRaw Whether the panel is loading raw data.
 * @param aTimeRange The explicit data range to load.
 * @param aRollupTableList The available rollup tables.
 * @returns The navigator chart data for the request.
 */
export async function loadNavigatorChartState(
    aPanelData: PanelData,
    aPanelTime: PanelTime,
    aPanelAxes: PanelAxes,
    aBoardTime: InputTimeBounds,
    aChartWidth: number,
    aIsRaw: boolean,
    aTimeRange: TimeRangeMs | undefined,
    aRollupTableList: string[],
): Promise<ChartData> {
    const sSeriesConfigSet = aPanelData.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return { datasets: [] };
    }

    const sFetchResult = await fetchPanelDatasets(
        sSeriesConfigSet,
        aPanelData,
        aPanelTime,
        aPanelAxes,
        aBoardTime,
        aChartWidth,
        aIsRaw,
        aTimeRange,
        aRollupTableList,
        aPanelAxes.sampling.enabled,
        false,
        true,
    );

    return { datasets: sFetchResult.datasets };
}

/**
 * Loads chart data and range state for the main panel view.
 * Intent: Bundle the chart payload with overflow range information needed by the panel UI.
 *
 * @param aPanelData The panel data payload.
 * @param aPanelTime The panel time payload.
 * @param aPanelAxes The panel axes payload.
 * @param aBoardTime The board time input.
 * @param aChartWidth The visible chart width.
 * @param aIsRaw Whether the panel is loading raw data.
 * @param aTimeRange The explicit data range to load.
 * @param aRollupTableList The available rollup tables.
 * @returns The panel chart load state.
 */
export async function loadPanelChartState(
    aPanelData: PanelData,
    aPanelTime: PanelTime,
    aPanelAxes: PanelAxes,
    aBoardTime: InputTimeBounds,
    aChartWidth: number,
    aIsRaw: boolean,
    aTimeRange: TimeRangeMs | undefined,
    aRollupTableList: string[],
): Promise<PanelChartLoadState> {
    const sSeriesConfigSet = aPanelData.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return {
            chartData: { datasets: [] },
            rangeOption: EMPTY_INTERVAL_OPTION,
            overflowRange: undefined,
        };
    }

    const sFetchResult = await fetchPanelDatasets(
        sSeriesConfigSet,
        aPanelData,
        aPanelTime,
        aPanelAxes,
        aBoardTime,
        aChartWidth,
        aIsRaw,
        aTimeRange,
        aRollupTableList,
        false,
        true,
        undefined,
    );

    return {
        chartData: { datasets: sFetchResult.datasets },
        rangeOption: sFetchResult.interval,
        overflowRange: createPanelOverflowRange(sFetchResult),
    };
}
