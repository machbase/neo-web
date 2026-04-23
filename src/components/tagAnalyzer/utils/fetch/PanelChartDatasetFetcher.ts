import {
    buildChartSeriesItem,
    mapRowsToChartData,
} from './parsing/ChartSeriesMapper';
import {
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from './ChartSeriesRowsLoader';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { ChartSeriesItem, PanelSeriesConfig } from '../series/PanelSeriesTypes';
import type { InputTimeBounds, TimeRangeMs } from '../time/types/TimeTypes';
import { EMPTY_FETCH_PANEL_DATASETS_RESULT } from './FetchConstants';
import type {
    FetchPanelDatasetsResult,
} from './FetchTypes';
import {
    isFetchableTimeRange,
    resolvePanelFetchInterval,
    resolvePanelFetchTimeRange,
    resolveRawFetchSampling,
} from './PanelChartFetchPolicy';
import { analyzePanelDataLimit } from './PanelChartOverflowPolicy';
import { calculateSampleCount } from './FetchSampleCountResolver';

/**
 * Fetches datasets for a panel request.
 * Intent: Coordinate time-range resolution, interval selection, and per-series fetches in one place.
 *
 * @param seriesConfigSet The series configs to fetch.
 * @param panelData The panel data that controls count and interval settings.
 * @param panelTime The panel time configuration.
 * @param panelAxes The panel axes configuration.
 * @param boardTime The board-level time bounds.
 * @param chartWidth The chart width used for interval and sampling calculations.
 * @param isRaw Whether the panel should load raw data.
 * @param timeRange The optional explicit time range override.
 * @param rollupTableList The rollup tables available to the fetch layer.
 * @param useSampling Whether sampling should be enabled for the request.
 * @param includeColor Whether to include series colors in the returned datasets.
 * @param isNavigator Whether the request is for the navigator chart.
 * @returns The resolved datasets and fetch metadata.
 */
export async function fetchPanelDatasets(
    aSeriesConfigSet: PanelSeriesConfig[],
    aPanelData: PanelData,
    aPanelTime: PanelTime,
    aPanelAxes: PanelAxes,
    aBoardTime: InputTimeBounds,
    aChartWidth: number,
    aIsRaw: boolean,
    aTimeRange: TimeRangeMs | undefined,
    aRollupTableList: string[],
    aUseSampling: boolean,
    aIncludeColor: boolean,
    aIsNavigator: boolean | undefined,
): Promise<FetchPanelDatasetsResult> {
    const sCount = calculateSampleCount(
        aPanelData.count,
        aUseSampling,
        aIsRaw,
        aPanelAxes.x_axis.calculated_data_pixels_per_tick,
        aPanelAxes.x_axis.raw_data_pixels_per_tick,
        aChartWidth,
    );
    const sTimeRange = resolvePanelFetchTimeRange(
        aPanelTime,
        aBoardTime,
        aTimeRange,
    );
    if (!isFetchableTimeRange(sTimeRange)) {
        return EMPTY_FETCH_PANEL_DATASETS_RESULT;
    }

    const sInterval = resolvePanelFetchInterval(
        aPanelData,
        aPanelAxes,
        sTimeRange,
        aChartWidth,
        aIsRaw,
        aIsNavigator,
    );
    const sSeriesFetchResults = aIsRaw
        ? await Promise.all(
              aSeriesConfigSet.map(async (aSeriesConfig) => ({
                  seriesConfig: aSeriesConfig,
                  fetchResult: await fetchRawSeriesRows(
                      aSeriesConfig,
                      sTimeRange,
                      sInterval,
                      sCount,
                      resolveRawFetchSampling(aUseSampling, aPanelAxes.sampling.sample_count),
                  ),
              })),
          )
        : await Promise.all(
              aSeriesConfigSet.map(async (aSeriesConfig) => ({
                  seriesConfig: aSeriesConfig,
                  fetchResult: await fetchCalculatedSeriesRows(
                      aSeriesConfig,
                      sTimeRange,
                      sInterval,
                      sCount,
                      aRollupTableList,
                  ),
              })),
          );

    const sDatasets: ChartSeriesItem[] = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < sSeriesFetchResults.length; index++) {
        const { seriesConfig: sSeriesConfig, fetchResult: sFetchResult } = sSeriesFetchResults[index];
        const sRows = sFetchResult?.data?.rows;
        const sLimitState = analyzePanelDataLimit(aIsRaw, sRows, sCount, sLimitEnd);

        if (sLimitState.hasDataLimit) {
            sHasDataLimit = true;
            sLimitEnd = sLimitState.limitEnd;
        }

        sDatasets.push(
            buildChartSeriesItem(sSeriesConfig, mapRowsToChartData(sRows), aIsRaw, aIncludeColor),
        );
    }

    return {
        datasets: sDatasets,
        interval: sInterval,
        count: sCount,
        hasDataLimit: sHasDataLimit,
        limitEnd: sLimitEnd,
    };
}
