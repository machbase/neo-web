import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type {
    RuntimePanelSampling,
    RuntimePanelXAxis,
} from '../domain/PanelDomain';
import {
    isBaseTimeSourceColumns,
    isNumericBaseTimeSourceColumns,
    type PanelSeriesDefinition,
} from '../domain/SeriesDomain';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
    normalizeStoredTimeUnit,
} from '../domain/time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { addAdminSchemaIfNeeded } from './TableNameSchema';
import {
    fetchCalculationData,
    fetchRawData,
} from './ChartSeriesDataFetcher';
import {
    SortOrderEnum,
    type CalculationFetchRequest,
    type ChartFetchResponse,
    type FetchPanelSeriesRowsResult,
    type PanelSeriesFetchResult,
    type RawFetchRequest,
    type RawFetchSampling,
} from './FetchContracts';

const EMPTY_CHART_FETCH_RESPONSE: ChartFetchResponse = {
    data: {
        column: [],
        rows: [],
    },
};
type LimitDetectionMode = 'extra-row' | 'returned-count' | 'none';
export const RAW_NAVIGATOR_SAMPLE_COUNT = 20000;
export const RAW_NAVIGATOR_SAMPLING_VALUE = 0.01;
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export async function fetchMainPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: string | undefined,
    xAxis: RuntimePanelXAxis,
    mainChartSampling: RuntimePanelSampling,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isConcreteTimeRange(timeRange)) {
        return undefined;
    }

    const sUseSampling = requestedRawMode && mainChartSampling.enabled;
    const sInterval = resolvePanelFetchInterval(
        intervalType,
        xAxis,
        timeRange,
        chartWidth,
        requestedRawMode,
    );
    const sDisplayCount = calculateSampleCount(
        queryLimit,
        requestedRawMode,
        xAxis.calculated_data_pixels_per_tick,
        xAxis.raw_data_pixels_per_tick,
        chartWidth,
    );
    const sLimitDetectionMode = resolveLimitDetectionMode(
        requestedRawMode,
        sUseSampling,
    );
    const sQueryCount = resolveQueryCount(sDisplayCount, sLimitDetectionMode);
    const sRawSampling = resolveRawFetchSampling(
        sUseSampling,
        mainChartSampling.sample_count,
    );

    return {
        seriesFetchResults: await Promise.all(
            seriesConfigSet.map(async (seriesConfig) =>
                normalizePanelSeriesFetchResult({
                    seriesConfig,
                    fetchResult: requestedRawMode
                        ? await fetchRawSeriesRows(
                              seriesConfig,
                              timeRange,
                              sInterval,
                              sQueryCount,
                              sRawSampling,
                          )
                        : await fetchCalculatedSeriesRows(
                              seriesConfig,
                              timeRange,
                              sInterval,
                              sQueryCount,
                              rollupTableList,
                          ),
                    displayCount: sDisplayCount,
                    limitDetectionMode: sLimitDetectionMode,
                }),
            ),
        ),
        interval: sInterval,
        count: sDisplayCount,
        isRaw: requestedRawMode,
    };
}

export async function fetchNavigatorPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: string | undefined,
    xAxis: RuntimePanelXAxis,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isConcreteTimeRange(timeRange)) {
        return undefined;
    }

    const sUsesNumericBaseTime = seriesConfigSet.some((seriesConfig) =>
        isNumericBaseTimeSourceColumns(seriesConfig.sourceColumns),
    );
    const sUseNavigatorOverviewCount =
        requestedRawMode || sUsesNumericBaseTime;
    const sInterval = sUseNavigatorOverviewCount
        ? resolveTimeBucketIntervalForTargetCount(
              timeRange,
              RAW_NAVIGATOR_SAMPLE_COUNT,
          )
        : resolvePanelFetchInterval(
              intervalType,
              xAxis,
              timeRange,
              chartWidth,
              requestedRawMode,
          );
    const sDisplayCount = sUseNavigatorOverviewCount
        ? RAW_NAVIGATOR_SAMPLE_COUNT
        : calculateSampleCount(
              queryLimit,
              requestedRawMode,
              xAxis.calculated_data_pixels_per_tick,
              xAxis.raw_data_pixels_per_tick,
              chartWidth,
          );
    const sLimitDetectionMode = sUseNavigatorOverviewCount
        ? 'none'
        : resolveLimitDetectionMode(false, false);
    const sQueryCount = resolveQueryCount(sDisplayCount, sLimitDetectionMode);
    const sRawNavigatorSampling = resolveRawFetchSampling(
        true,
        RAW_NAVIGATOR_SAMPLING_VALUE,
    );

    return {
        seriesFetchResults: await Promise.all(
            seriesConfigSet.map(async (seriesConfig) => {
                let sFetchResult: ChartFetchResponse;

                if (sUsesNumericBaseTime) {
                    sFetchResult = await fetchRawSeriesRows(
                        seriesConfig,
                        timeRange,
                        sInterval,
                        sQueryCount,
                        sRawNavigatorSampling,
                    );
                } else if (requestedRawMode) {
                    sFetchResult = await fetchCalculatedSeriesRows(
                        getRawNavigatorOverviewSeriesConfig(seriesConfig),
                        timeRange,
                        sInterval,
                        sQueryCount,
                        rollupTableList,
                    );
                } else {
                    sFetchResult = await fetchCalculatedSeriesRows(
                        seriesConfig,
                        timeRange,
                        sInterval,
                        sQueryCount,
                        rollupTableList,
                    );
                }

                return normalizePanelSeriesFetchResult({
                    seriesConfig,
                    fetchResult: sFetchResult,
                    displayCount: sDisplayCount,
                    limitDetectionMode: sLimitDetectionMode,
                });
            }),
        ),
        interval: sInterval,
        count: sDisplayCount,
        isRaw: requestedRawMode,
    };
}

function getRawNavigatorOverviewSeriesConfig(
    seriesConfig: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        ...seriesConfig,
        calculationMode: 'avg',
    };
}

function resolveTimeBucketIntervalForTargetCount(
    timeRange: TimeRangeMs,
    targetCount: number,
): IntervalOption {
    if (targetCount <= 0) {
        throw new Error('Navigator target sample count must be positive.');
    }

    const sBucketWidthMs = Math.ceil(
        (timeRange.endTime - timeRange.startTime) / targetCount,
    );

    if (!Number.isFinite(sBucketWidthMs) || sBucketWidthMs <= 0) {
        throw new Error('Navigator range cannot be sampled because it is invalid.');
    }

    if (sBucketWidthMs <= MINUTE_MS) {
        return {
            IntervalType: 'sec',
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / SECOND_MS)),
        };
    }

    if (sBucketWidthMs <= HOUR_MS) {
        return {
            IntervalType: 'min',
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / MINUTE_MS)),
        };
    }

    if (sBucketWidthMs <= DAY_MS) {
        return {
            IntervalType: 'hour',
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / HOUR_MS)),
        };
    }

    return {
        IntervalType: 'day',
        IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / DAY_MS)),
    };
}

function resolveLimitDetectionMode(
    isRaw: boolean,
    useSampling: boolean,
): LimitDetectionMode {
    if (!isRaw) {
        return 'returned-count';
    }

    return useSampling ? 'none' : 'extra-row';
}

function resolveQueryCount(
    displayCount: number,
    limitDetectionMode: LimitDetectionMode,
): number {
    return limitDetectionMode === 'extra-row' && displayCount > 0
        ? displayCount + 1
        : displayCount;
}

function normalizePanelSeriesFetchResult({
    seriesConfig,
    fetchResult,
    displayCount,
    limitDetectionMode,
}: {
    seriesConfig: PanelSeriesDefinition;
    fetchResult: ChartFetchResponse;
    displayCount: number;
    limitDetectionMode: LimitDetectionMode;
}): PanelSeriesFetchResult {
    const sRows = fetchResult.data?.rows ?? [];
    const sIsLimitReached = isLimitReached(
        sRows.length,
        displayCount,
        limitDetectionMode,
    );
    const sRowsToDisplay =
        limitDetectionMode === 'extra-row' && sIsLimitReached
            ? sRows.slice(0, displayCount)
            : sRows;

    return {
        seriesConfig,
        fetchResult:
            sRowsToDisplay === sRows
                ? fetchResult
                : {
                      ...fetchResult,
                      data: fetchResult.data
                          ? {
                                ...fetchResult.data,
                                rows: sRowsToDisplay,
                            }
                          : fetchResult.data,
                  },
        ...(sIsLimitReached ? { isLimitReached: true } : {}),
    };
}

function isLimitReached(
    returnedRowCount: number,
    displayCount: number,
    limitDetectionMode: LimitDetectionMode,
): boolean {
    if (displayCount <= 0 || limitDetectionMode === 'none') {
        return false;
    }

    return limitDetectionMode === 'extra-row'
        ? returnedRowCount > displayCount
        : returnedRowCount === displayCount;
}

function resolveRawFetchSampling(
    useSampling: boolean,
    samplingValue: number,
): RawFetchSampling {
    return useSampling
        ? {
              kind: 'enabled',
              value: samplingValue,
          }
        : { kind: 'disabled' };
}

function resolvePanelFetchInterval(
    intervalType: string | undefined,
    xAxis: RuntimePanelXAxis,
    timeRange: TimeRangeMs,
    chartWidth: number,
    fetchRawMode: boolean,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        fetchRawMode,
        xAxis.calculated_data_pixels_per_tick,
        xAxis.raw_data_pixels_per_tick,
        false,
    );
    const sIntervalType = intervalType?.toLowerCase() ?? '';

    if (sIntervalType === '') {
        return calculatedInterval;
    }

    const explicitInterval = resolveExplicitFetchInterval(
        normalizeStoredTimeUnit(sIntervalType) ?? sIntervalType,
        calculatedInterval,
    );

    return explicitInterval ?? calculatedInterval;
}

function resolveExplicitFetchInterval(
    intervalType: string,
    calculatedInterval: IntervalOption,
): IntervalOption | undefined {
    const intervalUnitMs = getIntervalMs(intervalType, 1);
    if (intervalUnitMs <= 0) {
        return undefined;
    }

    const calculatedIntervalMs = getIntervalMs(
        calculatedInterval.IntervalType,
        calculatedInterval.IntervalValue,
    );
    if (calculatedIntervalMs <= 0) {
        return {
            IntervalType: intervalType,
            IntervalValue: 1,
        };
    }

    return {
        IntervalType: intervalType,
        IntervalValue: Math.max(1, Math.ceil(calculatedIntervalMs / intervalUnitMs)),
    };
}

export async function fetchCalculatedSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
    interval: IntervalOption,
    count: number,
    rollupTableList: string[],
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sourceColumns = seriesConfig.sourceColumns;
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const request: CalculationFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: seriesConfig.sourceTagName,
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: shouldUseCalculatedRollup(
            seriesConfig,
            sourceColumns,
            timeRange,
            sIntervalMs,
            rollupTableList,
        ),
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        RollupList: rollupTableList,
    };

    return (await fetchCalculationData(request)) as ChartFetchResponse;
}

function shouldUseCalculatedRollup(
    seriesConfig: PanelSeriesDefinition,
    sourceColumns: PanelSeriesDefinition['sourceColumns'],
    timeRange: TimeRangeMs,
    intervalMs: number,
    rollupTableList: string[],
): boolean {
    if (
        !isBaseTimeSourceColumns(sourceColumns) ||
        !isRollup(
            rollupTableList,
            seriesConfig.table,
            intervalMs,
            sourceColumns.value,
            sourceColumns.jsonKey,
        )
    ) {
        return false;
    }

    return !isNumericBaseTimeSourceColumns(sourceColumns) ||
        canDisplayNumericBaseTimeRollupBucket(timeRange, intervalMs);
}

function canDisplayNumericBaseTimeRollupBucket(
    timeRange: TimeRangeMs,
    intervalMs: number,
): boolean {
    if (intervalMs <= 0) {
        return false;
    }

    const sFirstBucketStart = Math.floor(timeRange.startTime / intervalMs) * intervalMs;
    const sLastBucketStart = Math.floor(timeRange.endTime / intervalMs) * intervalMs;

    return sFirstBucketStart >= timeRange.startTime ||
        sLastBucketStart >= timeRange.startTime;
}

export async function fetchRawSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
    interval: IntervalOption,
    count: number,
    sampling: RawFetchSampling,
): Promise<ChartFetchResponse> {
    if (!isConcreteTimeRange(timeRange)) {
        return EMPTY_CHART_FETCH_RESPONSE;
    }

    const sourceColumns = seriesConfig.sourceColumns;
    const request: RawFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: seriesConfig.sourceTagName,
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: seriesConfig.useRollupTable,
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
        SortOrder: SortOrderEnum.Ascending,
        sampling: sampling,
    };

    return (await fetchRawData(request)) as ChartFetchResponse;
}
