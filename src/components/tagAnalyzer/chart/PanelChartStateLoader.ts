import {
    buildChartSeriesItem,
    mapRowsToChartData,
} from '../utils/fetch/ChartSeriesMapper';
import { calculateSampleCount } from '../utils/fetch/FetchSampleCountResolver';
import {
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from '../utils/fetch/ChartSeriesRowsLoader';
import type { TagFetchRow } from '../utils/fetch/FetchContracts';
import type { PanelAxes, PanelData, PanelTime } from '../utils/panelModelTypes';
import type { ChartData, ChartSeriesItem } from '../utils/series/seriesTypes';
import {
    calculateInterval,
    convertIntervalUnit,
} from '../utils/time/IntervalUtils';
import {
    normalizeBoardTimeRangeInput,
    normalizePanelTimeRangeSource,
    setTimeRange,
} from '../utils/time/PanelTimeRangeResolver';
import { isConcreteTimeRange } from '../utils/time/TimeBoundaryParsing';
import type {
    InputTimeBounds,
    IntervalOption,
    TimeRangeMs,
} from '../utils/time/timeTypes';
import type {
    FetchPanelDatasetsParams,
    FetchPanelDatasetsResult,
    PanelChartLoadState,
    PanelDataLimitState,
    PanelFetchRequest,
} from './PanelChartLoadContracts';

const EMPTY_INTERVAL_OPTION: IntervalOption = {
    IntervalType: '',
    IntervalValue: 0,
};

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

    const sOverflowRange =
        sFetchResult.hasDataLimit && sFetchResult.datasets[0]?.data?.[0]
            ? {
                  startTime: sFetchResult.datasets[0].data[0][0],
                  endTime: sFetchResult.limitEnd,
              }
            : undefined;

    return {
        chartData: { datasets: sFetchResult.datasets },
        rangeOption: sFetchResult.interval,
        overflowRange: sOverflowRange,
    };
}

/**
 * Checks whether a time range can be used for fetching.
 * Intent: Reject invalid or incomplete ranges before the fetch layer runs.
 *
 * @param aTimeRange The time range candidate to validate.
 * @returns True when the range is concrete and ordered.
 */
export function isFetchableTimeRange(
    aTimeRange: TimeRangeMs | undefined,
): aTimeRange is TimeRangeMs {
    return isConcreteTimeRange(aTimeRange);
}

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
    const sCount = calculatePanelFetchCount(
        panelData.count,
        useSampling,
        isRaw,
        panelAxes,
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
                      useSampling || undefined,
                      useSampling ? panelAxes.sampling.sample_count : undefined,
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
 * Calculates the fetch count for a panel request.
 * Intent: Keep panel count selection aligned with the shared sampling helper.
 *
 * @param aLimit The panel limit value.
 * @param aUseSampling Whether sampling is enabled.
 * @param aIsRaw Whether the panel is loading raw data.
 * @param aAxes The panel axes configuration.
 * @param aChartWidth The visible chart width in pixels.
 * @returns The count to request for the panel fetch.
 */
export function calculatePanelFetchCount(
    aLimit: number,
    aUseSampling: boolean,
    aIsRaw: boolean,
    aAxes: PanelAxes,
    aChartWidth: number,
): number {
    return calculateSampleCount(
        aLimit,
        aUseSampling,
        aIsRaw,
        aAxes.x_axis.calculated_data_pixels_per_tick,
        aAxes.x_axis.raw_data_pixels_per_tick,
        aChartWidth,
    );
}

/**
 * Resolves the time range used for a panel fetch.
 * Intent: Prefer an explicit range when present and fall back to the panel and board time sources.
 *
 * @param aPanelTime The panel time configuration.
 * @param aBoardTime The board-level time bounds.
 * @param aTimeRange The explicit time range override, when provided.
 * @returns The resolved fetch time range.
 */
export function resolvePanelFetchTimeRange(
    aPanelTime: PanelTime,
    aBoardTime: InputTimeBounds,
    aTimeRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (aTimeRange) {
        return aTimeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeBoardTimeRangeInput(aBoardTime),
    );
}

/**
 * Resolves the interval used for a panel fetch.
 * Intent: Honor an explicit interval type when present and otherwise calculate one from chart context.
 *
 * @param aPanelData The panel data that may define an interval type.
 * @param aAxes The panel axes configuration.
 * @param aTimeRange The resolved time range for the fetch.
 * @param aChartWidth The visible chart width in pixels.
 * @param aIsRaw Whether the panel is loading raw data.
 * @param aIsNavigator Whether the request is for the navigator chart.
 * @returns The resolved interval option.
 */
export function resolvePanelFetchInterval(
    aPanelData: PanelData,
    aAxes: PanelAxes,
    aTimeRange: TimeRangeMs,
    aChartWidth: number,
    aIsRaw: boolean,
    aIsNavigator = false,
): IntervalOption {
    const sIntervalType = aPanelData.interval_type?.toLowerCase() ?? '';

    if (sIntervalType !== '') {
        return {
            IntervalType: convertIntervalUnit(sIntervalType),
            IntervalValue: 0,
        };
    }

    return calculateInterval(
        aTimeRange.startTime,
        aTimeRange.endTime,
        aChartWidth,
        aIsRaw,
        aAxes.x_axis.calculated_data_pixels_per_tick,
        aAxes.x_axis.raw_data_pixels_per_tick,
        aIsNavigator,
    );
}

/**
 * Determines whether the fetched panel data hit a limit.
 * Intent: Preserve the final visible timestamp when raw data is truncated by the fetch result.
 *
 * @param aIsRaw Whether the current request is loading raw data.
 * @param aRows The fetched rows for the current series.
 * @param aCount The expected row count for a full fetch.
 * @param aCurrentLimitEnd The current limit boundary carried across series.
 * @returns The updated limit state for the current series.
 */
export function analyzePanelDataLimit(
    aIsRaw: boolean,
    aRows: TagFetchRow[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
): PanelDataLimitState {
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLastTimestamp = aRows[aRows.length - 1]?.[0];
    const sPreviousTimestamp = aRows[aRows.length - 2]?.[0];
    const sShouldUseLastTimestamp = aCurrentLimitEnd !== 0 && aCurrentLimitEnd !== sLastTimestamp;
    const sLimitEnd = sShouldUseLastTimestamp
        ? sLastTimestamp
        : (sPreviousTimestamp ?? sLastTimestamp);

    return {
        hasDataLimit: true,
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
async function fetchPanelDatasetsFromRequest(
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
