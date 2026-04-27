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
    ChartFetchResponse,
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
    seriesConfigSet: PanelSeriesConfig[],
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
): Promise<FetchPanelDatasetsResult> {
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
        return EMPTY_FETCH_PANEL_DATASETS_RESULT;
    }

    const sInterval = resolvePanelFetchInterval(
        panelData,
        panelAxes,
        sTimeRange,
        chartWidth,
        isRaw,
        isNavigator,
    );
    const sSeriesFetchResults = await fetchPanelSeriesResults(
        seriesConfigSet,
        sTimeRange,
        sInterval,
        sCount,
        isRaw,
        useSampling,
        panelAxes.sampling.sample_count,
        rollupTableList,
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

type PanelSeriesFetchResult = {
    seriesConfig: PanelSeriesConfig;
    fetchResult: ChartFetchResponse;
};

async function fetchPanelSeriesResults(
    seriesConfigSet: PanelSeriesConfig[],
    timeRange: TimeRangeMs,
    interval: FetchPanelDatasetsResult['interval'],
    count: number,
    isRaw: boolean,
    useSampling: boolean,
    sampleCount: number,
    rollupTableList: string[],
): Promise<PanelSeriesFetchResult[]> {
    const sSampling = resolveRawFetchSampling(useSampling, sampleCount);

    return Promise.all(
        seriesConfigSet.map((seriesConfig) =>
            fetchPanelSeriesResult(
                seriesConfig,
                timeRange,
                interval,
                count,
                isRaw,
                sSampling,
                rollupTableList,
            ),
        ),
    );
}

async function fetchPanelSeriesResult(
    seriesConfig: PanelSeriesConfig,
    timeRange: TimeRangeMs,
    interval: FetchPanelDatasetsResult['interval'],
    count: number,
    isRaw: boolean,
    sampling: Parameters<typeof fetchRawSeriesRows>[4],
    rollupTableList: string[],
): Promise<PanelSeriesFetchResult> {
    const sFetchResult = isRaw
        ? await fetchRawSeriesRows(
              seriesConfig,
              timeRange,
              interval,
              count,
              sampling,
          )
        : await fetchCalculatedSeriesRows(
              seriesConfig,
              timeRange,
              interval,
              count,
              rollupTableList,
          );

    return {
        seriesConfig: seriesConfig,
        fetchResult: sFetchResult,
    };
}
