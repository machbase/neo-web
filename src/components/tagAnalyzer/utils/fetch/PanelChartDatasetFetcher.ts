import {
    buildChartSeriesItem,
    mapRowsToChartData,
} from './parsing/ChartSeriesMapper';
import {
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from './ChartSeriesRowsLoader';
import type { ChartSeriesItem } from '../series/seriesTypes';
import { EMPTY_INTERVAL_OPTION } from './FetchConstants';
import type {
    FetchPanelDatasetsParams,
    FetchPanelDatasetsResult,
    PanelFetchRequest,
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
export async function fetchPanelDatasets({
    seriesConfigSet,
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
}: FetchPanelDatasetsParams): Promise<FetchPanelDatasetsResult> {
    const sCount = calculateSampleCount(
        panelData.count,
        useSampling,
        isRaw,
        panelAxes.x_axis.calculated_data_pixels_per_tick,
        panelAxes.x_axis.raw_data_pixels_per_tick,
        chartWidth,
    );
    const sTimeRange = resolvePanelFetchTimeRange(
        panelTime,
        boardTime,
        timeRange,
    );
    if (!isFetchableTimeRange(sTimeRange)) {
        return createEmptyFetchPanelDatasetsResult();
    }

    const sInterval = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        sTimeRange,
        chartWidth,
        isRaw,
        isNavigator,
    );
    const sSeriesFetchResults = isRaw
        ? await Promise.all(
              seriesConfigSet.map(async (aSeriesConfig) => ({
                  seriesConfig: aSeriesConfig,
                  fetchResult: await fetchRawSeriesRows(
                      aSeriesConfig,
                      sTimeRange,
                      sInterval,
                      sCount,
                      resolveRawFetchSampling(useSampling, panelAxes.sampling.sample_count),
                  ),
              })),
          )
        : await Promise.all(
              seriesConfigSet.map(async (aSeriesConfig) => ({
                  seriesConfig: aSeriesConfig,
                  fetchResult: await fetchCalculatedSeriesRows(
                      aSeriesConfig,
                      sTimeRange,
                      sInterval,
                      sCount,
                      rollupTableList,
                  ),
              })),
          );

    const sDatasets: ChartSeriesItem[] = [];
    let sHasDataLimit = false;
    let sLimitEnd = 0;

    for (let index = 0; index < sSeriesFetchResults.length; index++) {
        const { seriesConfig: sSeriesConfig, fetchResult: sFetchResult } = sSeriesFetchResults[index];
        const sRows = sFetchResult?.data?.rows;
        const sLimitState = analyzePanelDataLimit(isRaw, sRows, sCount, sLimitEnd);

        if (sLimitState.hasDataLimit) {
            sHasDataLimit = true;
            sLimitEnd = sLimitState.limitEnd;
        }

        sDatasets.push(
            buildChartSeriesItem(sSeriesConfig, mapRowsToChartData(sRows), isRaw, includeColor),
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

/**
 * Fetches panel datasets from a panel request wrapper.
 * Intent: Keep request-shape unpacking separate from the main dataset fetch workflow.
 *
 * @param aRequest The panel fetch request wrapper.
 * @param aUseSampling Whether sampling should be enabled for the fetch.
 * @param aIncludeColor Whether colors should be included in the returned datasets.
 * @param aIsNavigator Whether the request is for the navigator chart.
 * @returns The fetched panel datasets, or undefined when there are no series to load.
 */
export async function fetchPanelDatasetsFromRequest(
    aRequest: PanelFetchRequest,
    aUseSampling: boolean,
    aIncludeColor: boolean,
    aIsNavigator: boolean | undefined,
): Promise<FetchPanelDatasetsResult | undefined> {
    const sSeriesConfigSet = aRequest.panelData.tag_set ?? [];
    if (sSeriesConfigSet.length === 0) {
        return undefined;
    }

    return fetchPanelDatasets({
        seriesConfigSet: sSeriesConfigSet,
        panelData: aRequest.panelData,
        panelTime: aRequest.panelTime,
        panelAxes: aRequest.panelAxes,
        boardTime: aRequest.boardTime,
        chartWidth: aRequest.chartWidth || 1,
        isRaw: aRequest.isRaw,
        timeRange: aRequest.timeRange,
        rollupTableList: aRequest.rollupTableList,
        useSampling: aUseSampling,
        includeColor: aIncludeColor,
        isNavigator: aIsNavigator,
    });
}

/**
 * Creates an empty panel fetch result.
 * Intent: Provide a single fallback shape for fetch paths that cannot load data.
 *
 * @returns The empty fetch result.
 */
function createEmptyFetchPanelDatasetsResult(): FetchPanelDatasetsResult {
    return {
        datasets: [],
        interval: EMPTY_INTERVAL_OPTION,
        count: 0,
        hasDataLimit: false,
        limitEnd: 0,
    };
}
