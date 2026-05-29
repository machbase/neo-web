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
} from '../domain/time/TimeIntervalUtils';
import { normalizeStoredTimeUnit } from '../domain/time/TimeUnitUtils';
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
    navigatorSampling: RuntimePanelSampling,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isConcreteTimeRange(timeRange)) {
        return undefined;
    }

    const sUseSampling = requestedRawMode;
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
        navigatorSampling.sample_count,
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
