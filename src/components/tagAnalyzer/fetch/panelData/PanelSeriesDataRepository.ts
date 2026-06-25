import { isRollup } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import type {
    RuntimePanelSampling,
    RuntimePanelXAxis,
} from '../../domain/panel/PanelRuntime';
import {
    isBaseTimeSourceColumns,
    isNumericBaseTimeSourceColumns,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import { getTimeRangeWidth, isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
    normalizeStoredTimeUnit,
} from '../../domain/time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../../domain/time/TimeTypes';
import { TimeUnit } from '../../domain/time/TimeTypes';
import { addAdminSchemaIfNeeded } from './TableNameQualification';
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
    type RollupTableMap,
} from './PanelDataFetchTypes';

function createEmptyChartFetchResponse(): ChartFetchResponse {
    return {
        data: {
            column: [],
            rows: [],
        },
    };
}
type LimitDetectionMode = 'extra-row' | 'returned-count' | 'none';
export const RAW_MAIN_SAMPLE_COUNT = 20000;
export const RAW_NAVIGATOR_MIN_SAMPLE_COUNT = 1000;
export const RAW_NAVIGATOR_MAX_SAMPLE_COUNT = 15000;
export const RAW_NAVIGATOR_SAMPLING_VALUE = 0.01;
export const CALCULATED_FETCH_ROW_BUDGET = 15000;
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
    useOrderBy: boolean,
    timeRange: TimeRangeMs,
    rollupTableList: RollupTableMap,
    intervalOverride?: IntervalOption,
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isValidTimeRange(timeRange)) {
        return undefined;
    }

    const sUseSampling = requestedRawMode && mainChartSampling.enabled;
    const sInterval = intervalOverride ?? resolvePanelFetchInterval(
        intervalType,
        xAxis,
        timeRange,
        chartWidth,
        requestedRawMode,
    );
    const sFetchCount = requestedRawMode
        ? resolveRawFetchCount(
              queryLimit,
              xAxis.rawDataPixelsPerTick,
              chartWidth,
              sUseSampling,
          )
        : resolveCalculatedFetchCount(timeRange, sInterval);
    const sDisplayCount = sFetchCount.displayCount;
    const sLimitDetectionMode = sFetchCount.limitDetectionMode;
    const sQueryCount = sFetchCount.queryCount;
    const sRawSampling = resolveRawFetchSampling(
        sUseSampling,
        mainChartSampling.sampleCount,
    );

    return {
        seriesFetchResults: await Promise.all(
            seriesConfigSet.map((seriesConfig) =>
                fetchPanelSeriesResult({
                    seriesConfig,
                    fetchRows: () =>
                        requestedRawMode
                            ? fetchRawSeriesRows(
                                  seriesConfig,
                                  timeRange,
                                  sInterval,
                                  sQueryCount,
                                  sRawSampling,
                                  useOrderBy,
                              )
                            : fetchCalculatedSeriesRows(
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
    _queryLimit: number,
    _intervalType: string | undefined,
    _xAxis: RuntimePanelXAxis,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rawNavigatorSampling: RuntimePanelSampling,
    rollupTableList: RollupTableMap,
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isValidTimeRange(timeRange)) {
        return undefined;
    }

    const sUsesNumericBaseTime = seriesConfigSet.some((seriesConfig) =>
        isNumericBaseTimeSourceColumns(seriesConfig.sourceColumns),
    );
    const sUseRawNavigatorSampling =
        requestedRawMode &&
        (rawNavigatorSampling.enabled || sUsesNumericBaseTime);
    const sUseRawNavigatorFetch =
        sUseRawNavigatorSampling || (!requestedRawMode && sUsesNumericBaseTime);
    const sNavigatorTargetCount = resolveNavigatorTargetCount(chartWidth);
    const sCalculatedNavigatorTargetCount = CALCULATED_FETCH_ROW_BUDGET;
    const sNavigatorFetchTargetCount = sUseRawNavigatorFetch
        ? sNavigatorTargetCount
        : sCalculatedNavigatorTargetCount;
    const sInterval = resolveTimeBucketIntervalForTargetCount(
        timeRange,
        sNavigatorFetchTargetCount,
    );
    const sFetchCount = resolveNavigatorOverviewFetchCount(
        sNavigatorFetchTargetCount,
    );
    const sDisplayCount = sFetchCount.displayCount;
    const sLimitDetectionMode = sFetchCount.limitDetectionMode;
    const sQueryCount = sFetchCount.queryCount;
    const sRawNavigatorSampling = resolveRawFetchSampling(
        sUseRawNavigatorFetch,
        sUseRawNavigatorSampling
            ? rawNavigatorSampling.sampleCount
            : RAW_NAVIGATOR_SAMPLING_VALUE,
    );

    return {
        seriesFetchResults: await Promise.all(
            seriesConfigSet.map((seriesConfig) =>
                fetchPanelSeriesResult({
                    seriesConfig,
                    fetchRows: () => {
                        if (sUseRawNavigatorFetch) {
                            return fetchRawSeriesRows(
                                seriesConfig,
                                timeRange,
                                sInterval,
                                sQueryCount,
                                sRawNavigatorSampling,
                                true,
                            );
                        }

                        return fetchCalculatedSeriesRows(
                            requestedRawMode
                                ? createAverageNavigatorSeriesConfig(seriesConfig)
                                : seriesConfig,
                            timeRange,
                            sInterval,
                            sQueryCount,
                            rollupTableList,
                        );
                    },
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

function createAverageNavigatorSeriesConfig(
    seriesConfig: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        ...seriesConfig,
        calculationMode: 'avg',
    };
}

async function fetchPanelSeriesResult({
    seriesConfig,
    fetchRows,
    displayCount,
    limitDetectionMode,
}: {
    seriesConfig: PanelSeriesDefinition;
    fetchRows: () => Promise<ChartFetchResponse>;
    displayCount: number;
    limitDetectionMode: LimitDetectionMode;
}): Promise<PanelSeriesFetchResult> {
    try {
        const sFetchResult = await fetchRows();
        return normalizePanelSeriesFetchResult({
            seriesConfig,
            fetchResult: sFetchResult,
            displayCount,
            limitDetectionMode,
        });
    } catch (error) {
        return createPanelSeriesErrorResult(seriesConfig, error);
    }
}

function createPanelSeriesErrorResult(
    seriesConfig: PanelSeriesDefinition,
    error: unknown,
): PanelSeriesFetchResult {
    return {
        seriesConfig,
        fetchResult: createEmptyChartFetchResponse(),
        error: {
            kind: 'request-failed',
            message: getPanelSeriesFetchErrorMessage(error),
        },
    };
}

function getPanelSeriesFetchErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return 'Series data request failed.';
}

export function resolveNavigatorTargetCount(chartWidth: number): number {
    const sRawTargetCount = Math.ceil(chartWidth / 3);
    const sFiniteTargetCount = Number.isFinite(sRawTargetCount) && sRawTargetCount > 0
        ? sRawTargetCount
        : RAW_NAVIGATOR_MIN_SAMPLE_COUNT;

    return Math.min(
        RAW_NAVIGATOR_MAX_SAMPLE_COUNT,
        Math.max(RAW_NAVIGATOR_MIN_SAMPLE_COUNT, sFiniteTargetCount),
    );
}

function resolveTimeBucketIntervalForTargetCount(
    timeRange: TimeRangeMs,
    targetCount: number,
): IntervalOption {
    if (targetCount <= 0) {
        throw new Error('Navigator target sample count must be positive.');
    }

    const sBucketWidthMs = Math.ceil(getTimeRangeWidth(timeRange) / targetCount);

    if (!Number.isFinite(sBucketWidthMs) || sBucketWidthMs <= 0) {
        throw new Error('Navigator range cannot be sampled because it is invalid.');
    }

    if (sBucketWidthMs <= MINUTE_MS) {
        return {
            IntervalType: TimeUnit.Second,
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / SECOND_MS)),
        };
    }

    if (sBucketWidthMs <= HOUR_MS) {
        return {
            IntervalType: TimeUnit.Minute,
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / MINUTE_MS)),
        };
    }

    if (sBucketWidthMs <= DAY_MS) {
        return {
            IntervalType: TimeUnit.Hour,
            IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / HOUR_MS)),
        };
    }

    return {
        IntervalType: TimeUnit.Day,
        IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / DAY_MS)),
    };
}

function resolveRawFetchCount(
    queryLimit: number,
    rawPixelsPerTick: number,
    chartWidth: number,
    useSampling: boolean,
): FetchCountResolution {
    const sDisplayCount = calculateSampleCount(
        queryLimit,
        true,
        0,
        rawPixelsPerTick,
        chartWidth,
    );
    const sLimitDetectionMode = resolveLimitDetectionMode(true, useSampling);

    return {
        displayCount: sDisplayCount,
        queryCount: resolveQueryCount(sDisplayCount, sLimitDetectionMode),
        limitDetectionMode: sLimitDetectionMode,
    };
}

function resolveNavigatorOverviewFetchCount(
    targetCount: number,
): FetchCountResolution {
    return {
        displayCount: targetCount,
        queryCount: targetCount,
        limitDetectionMode: 'none',
    };
}

type FetchCountResolution = {
    displayCount: number;
    queryCount: number;
    limitDetectionMode: LimitDetectionMode;
};

function resolveCalculatedFetchCount(
    timeRange: TimeRangeMs,
    interval: IntervalOption,
): FetchCountResolution {
    const sPredictedRowCount = predictCalculatedRowCount(timeRange, interval);
    const sDisplayCount = Math.min(
        sPredictedRowCount,
        CALCULATED_FETCH_ROW_BUDGET,
    );

    return {
        displayCount: sDisplayCount,
        queryCount: sDisplayCount,
        limitDetectionMode:
            sPredictedRowCount > sDisplayCount ? 'returned-count' : 'none',
    };
}

function predictCalculatedRowCount(
    timeRange: TimeRangeMs,
    interval: IntervalOption,
): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sRangeWidth = getTimeRangeWidth(timeRange);

    if (sIntervalMs <= 0 || sRangeWidth <= 0) {
        return CALCULATED_FETCH_ROW_BUDGET;
    }

    return Math.max(1, Math.ceil(sRangeWidth / sIntervalMs));
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
    const sRows = fetchResult.data.rows;
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
                      data: {
                          ...fetchResult.data,
                          rows: sRowsToDisplay,
                      },
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

export function resolvePanelFetchInterval(
    intervalType: string | undefined,
    xAxis: RuntimePanelXAxis,
    timeRange: TimeRangeMs,
    chartWidth: number,
    fetchRawMode: boolean,
    calculatedPixelsPerTick = xAxis.calculatedDataPixelsPerTick,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        fetchRawMode,
        calculatedPixelsPerTick,
        xAxis.rawDataPixelsPerTick,
        false,
    );
    const sIntervalType = intervalType?.toLowerCase() ?? '';

    if (sIntervalType === '') {
        return calculatedInterval;
    }

    const sExplicitIntervalUnit = normalizeStoredTimeUnit(sIntervalType);
    const explicitInterval = sExplicitIntervalUnit
        ? resolveExplicitFetchInterval(sExplicitIntervalUnit, calculatedInterval)
        : undefined;

    return explicitInterval ?? calculatedInterval;
}

function resolveExplicitFetchInterval(
    intervalType: TimeUnit,
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
    rollupTableList: RollupTableMap,
): Promise<ChartFetchResponse> {
    if (!isValidTimeRange(timeRange)) {
        return createEmptyChartFetchResponse();
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

    return fetchCalculationData(request);
}

function shouldUseCalculatedRollup(
    seriesConfig: PanelSeriesDefinition,
    sourceColumns: PanelSeriesDefinition['sourceColumns'],
    timeRange: TimeRangeMs,
    intervalMs: number,
    rollupTableList: RollupTableMap,
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
    useOrderBy: boolean,
): Promise<ChartFetchResponse> {
    if (!isValidTimeRange(timeRange)) {
        return createEmptyChartFetchResponse();
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
        SortOrder: useOrderBy ? SortOrderEnum.Ascending : SortOrderEnum.Unsorted,
        sampling: sampling,
    };

    return fetchRawData(request);
}
