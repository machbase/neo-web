import { ADMIN_ID } from '@/utils/constants';
import {
    findRollupColumnMatch,
    getRollupColumnNameCandidates,
} from '@/utils/rollupColumnCandidates';
import type {
    RuntimePanelSampling,
    RuntimePanelXAxis,
} from '../../domain/panel/PanelRuntime';
import {
    hasNumericBaseTimeSeries,
    isBaseTimeSourceColumns,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import { getTimeRangeWidth, isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import {
    calculateInterval,
    calculateSampleCount,
    getIntervalMs,
} from '../../domain/time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../../domain/time/TimeTypes';
import { TimeUnit } from '../../domain/time/TimeTypes';
import { resolveNumericIntervalForRange } from '../../domain/time/NumericIntervalUtils';
import { addAdminSchemaIfNeeded } from './TableNameQualification';
import { getUnknownErrorMessage } from '../QueryResponseUtils';
import { findRollupTableEntry } from '../metadata/RollupMetadata';
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
type PanelSeriesRowsFetchResult = {
    fetchResult: ChartFetchResponse;
    usesRollup: boolean;
};
export const RAW_MAIN_SAMPLE_COUNT = 20000;
export const RAW_NAVIGATOR_MIN_SAMPLE_COUNT = 1000;
export const RAW_NAVIGATOR_MAX_SAMPLE_COUNT = 15000;
export const RAW_NAVIGATOR_SAMPLING_VALUE = 0.01;
export const MAIN_CALCULATED_FETCH_ROW_LIMIT = 10000;
export const MAIN_NUMERIC_VISIBLE_BUCKET_TARGET = 1000;
export const NAVIGATOR_CALCULATED_FETCH_ROW_LIMIT = 1000;
const DATA_DOES_NOT_EXIST_PREFIX = 'Data does not exist';
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export async function fetchMainPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    queryLimit: number,
    intervalType: TimeUnit | undefined,
    xAxis: RuntimePanelXAxis,
    mainChartSampling: RuntimePanelSampling,
    chartWidth: number,
    requestedRawMode: boolean,
    useOrderBy: boolean,
    timeRange: TimeRangeMs,
    intervalOverride?: IntervalOption,
    rollupTableList: RollupTableMap = {},
    numericVisibleRange: TimeRangeMs = timeRange,
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isValidTimeRange(timeRange)) {
        return undefined;
    }

    const sUseSampling = requestedRawMode && mainChartSampling.enabled;
    const sUsesNumericCalculated =
        !requestedRawMode && hasNumericBaseTimeSeries(seriesConfigSet);
    const sInterval = requestedRawMode
        ? intervalOverride
        : intervalOverride ?? resolvePanelFetchInterval(
              intervalType,
              xAxis,
              timeRange,
              chartWidth,
          );
    const sFetchCount = requestedRawMode
        ? resolveRawFetchCount(
              queryLimit,
              xAxis.rawDataPixelsPerTick,
              chartWidth,
              sUseSampling,
          )
        : sUsesNumericCalculated
        ? resolveNumericCalculatedFetchCount(timeRange, numericVisibleRange)
        : resolveCalculatedFetchCount(MAIN_CALCULATED_FETCH_ROW_LIMIT);
    const sDisplayCount = sFetchCount.displayCount;
    const sLimitDetectionMode = sFetchCount.limitDetectionMode;
    const sQueryCount = sFetchCount.queryCount;
    const sNumericInterval = !requestedRawMode
        ? resolveNumericFetchInterval(seriesConfigSet, timeRange, sQueryCount)
        : undefined;
    const sRawSampling = resolveRawFetchSampling(
        sUseSampling,
        mainChartSampling.sampleCount,
    );
    return {
        seriesFetchResults: await Promise.all(
            seriesConfigSet.map((seriesConfig) =>
                fetchPanelSeriesResult({
                    seriesConfig,
                    fetchRows: async () => {
                        if (requestedRawMode) {
                            return {
                                fetchResult: await fetchRawSeriesRows(
                                    seriesConfig,
                                    timeRange,
                                    sQueryCount,
                                    sRawSampling,
                                    useOrderBy,
                                ),
                                usesRollup: false,
                            };
                        }

                        if (!sInterval) {
                            throw new Error('Calculated main fetch requires an interval.');
                        }

                        return fetchCalculatedSeriesRows(
                            seriesConfig,
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
        ...(sInterval ? { interval: sInterval } : {}),
        ...(sNumericInterval ? { numericInterval: sNumericInterval } : {}),
        count: sDisplayCount,
        isRaw: requestedRawMode,
    };
}

export async function fetchNavigatorPanelSeriesRows(
    seriesConfigSet: PanelSeriesDefinition[],
    _queryLimit: number,
    _intervalType: TimeUnit | undefined,
    _xAxis: RuntimePanelXAxis,
    chartWidth: number,
    requestedRawMode: boolean,
    timeRange: TimeRangeMs,
    rawNavigatorSampling: RuntimePanelSampling,
    rollupTableList: RollupTableMap = {},
): Promise<FetchPanelSeriesRowsResult | undefined> {
    if (seriesConfigSet.length === 0 || !isValidTimeRange(timeRange)) {
        return undefined;
    }

    const sUseRawNavigatorSampling =
        requestedRawMode && rawNavigatorSampling.enabled;
    const sUseRawNavigatorFetch = sUseRawNavigatorSampling;
    const sNavigatorTargetCount = resolveNavigatorTargetCount(chartWidth);
    const sCalculatedNavigatorTargetCount = NAVIGATOR_CALCULATED_FETCH_ROW_LIMIT;
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
    const sNumericInterval = !sUseRawNavigatorFetch
        ? resolveNumericFetchInterval(seriesConfigSet, timeRange, sQueryCount)
        : undefined;
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
                    fetchRows: async () => {
                        if (sUseRawNavigatorFetch) {
                            return {
                                fetchResult: await fetchRawSeriesRows(
                                    seriesConfig,
                                    timeRange,
                                    sQueryCount,
                                    sRawNavigatorSampling,
                                    true,
                                ),
                                usesRollup: false,
                            };
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
        ...(sNumericInterval ? { numericInterval: sNumericInterval } : {}),
        count: sDisplayCount,
        isRaw: requestedRawMode,
    };
}

function resolveNumericFetchInterval(
    seriesConfigSet: PanelSeriesDefinition[],
    timeRange: TimeRangeMs,
    targetCount: number,
): number | undefined {
    if (!hasNumericBaseTimeSeries(seriesConfigSet)) {
        return undefined;
    }

    const sNumericInterval = resolveNumericIntervalForRange(timeRange, targetCount);
    return sNumericInterval > 0 ? sNumericInterval : undefined;
}

export function resolveNumericCalculatedIntervalForRange(
    timeRange: TimeRangeMs,
): number | undefined {
    const sNumericInterval = resolveNumericIntervalForRange(
        timeRange,
        MAIN_NUMERIC_VISIBLE_BUCKET_TARGET,
    );

    return sNumericInterval > 0 ? sNumericInterval : undefined;
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
    fetchRows: () => Promise<PanelSeriesRowsFetchResult>;
    displayCount: number;
    limitDetectionMode: LimitDetectionMode;
}): Promise<PanelSeriesFetchResult> {
    try {
        const { fetchResult, usesRollup } = await fetchRows();
        return normalizePanelSeriesFetchResult({
            seriesConfig,
            fetchResult,
            usesRollup,
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
    const sMessage = getUnknownErrorMessage(error, 'Series data request failed.');

    return {
        seriesConfig,
        fetchResult: createEmptyChartFetchResponse(),
        usesRollup: false,
        error: {
            kind: isDataDoesNotExistMessage(sMessage)
                ? 'no-data'
                : 'request-failed',
            message: sMessage,
        },
    };
}

function isDataDoesNotExistMessage(message: string): boolean {
    return message.trim().startsWith(DATA_DOES_NOT_EXIST_PREFIX);
}

function resolveNavigatorTargetCount(chartWidth: number): number {
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

function resolveCalculatedFetchCount(rowLimit: number): FetchCountResolution {
    return {
        displayCount: rowLimit,
        queryCount: rowLimit,
        limitDetectionMode: 'returned-count',
    };
}

function resolveNumericCalculatedFetchCount(
    fetchRange: TimeRangeMs,
    visibleRange: TimeRangeMs,
): FetchCountResolution {
    const sNumericInterval =
        resolveNumericCalculatedIntervalForRange(visibleRange) ??
        resolveNumericCalculatedIntervalForRange(fetchRange);
    const sFetchRangeWidth = getTimeRangeWidth(fetchRange);
    const sTargetCount =
        sNumericInterval !== undefined && sFetchRangeWidth > 0
            ? Math.ceil(sFetchRangeWidth / sNumericInterval)
            : MAIN_NUMERIC_VISIBLE_BUCKET_TARGET;
    const sDisplayCount = Math.min(
        MAIN_CALCULATED_FETCH_ROW_LIMIT,
        Math.max(1, sTargetCount),
    );

    return {
        displayCount: sDisplayCount,
        queryCount: sDisplayCount,
        limitDetectionMode:
            sTargetCount > MAIN_CALCULATED_FETCH_ROW_LIMIT
                ? 'returned-count'
                : 'none',
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
    usesRollup,
    displayCount,
    limitDetectionMode,
}: {
    seriesConfig: PanelSeriesDefinition;
    fetchResult: ChartFetchResponse;
    usesRollup: boolean;
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
        usesRollup,
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
    intervalType: TimeUnit | undefined,
    xAxis: RuntimePanelXAxis,
    timeRange: TimeRangeMs,
    chartWidth: number,
    calculatedPixelsPerTick = xAxis.calculatedDataPixelsPerTick,
): IntervalOption {
    const calculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        false,
        calculatedPixelsPerTick,
        xAxis.rawDataPixelsPerTick,
        false,
    );
    if (!intervalType) {
        return calculatedInterval;
    }

    return resolveExplicitFetchInterval(intervalType, calculatedInterval) ??
        calculatedInterval;
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

async function fetchCalculatedSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
    interval: IntervalOption,
    count: number,
    rollupTableList: RollupTableMap,
): Promise<PanelSeriesRowsFetchResult> {
    if (!isValidTimeRange(timeRange)) {
        return {
            fetchResult: createEmptyChartFetchResponse(),
            usesRollup: false,
        };
    }

    const sourceColumns = seriesConfig.sourceColumns;
    const sRollupColumnName = resolveCalculatedRollupColumnName(
        seriesConfig,
        sourceColumns,
        interval,
        rollupTableList,
    );
    const sUsesRollup = sRollupColumnName !== undefined;
    const request: CalculationFetchRequest = {
        Table: addAdminSchemaIfNeeded(seriesConfig.table, ADMIN_ID),
        TagNames: seriesConfig.sourceTagName,
        Start: timeRange.startTime,
        End: timeRange.endTime,
        isRollup: sUsesRollup,
        ...(sRollupColumnName ? { rollupColumnName: sRollupColumnName } : {}),
        CalculationMode: seriesConfig.calculationMode.toLowerCase(),
        ...interval,
        columnMap: sourceColumns,
        Count: count,
    };

    return {
        fetchResult: await fetchCalculationData(request),
        usesRollup: sUsesRollup,
    };
}

function resolveCalculatedRollupColumnName(
    seriesConfig: PanelSeriesDefinition,
    sourceColumns: PanelSeriesDefinition['sourceColumns'],
    interval: IntervalOption,
    rollupTableList: RollupTableMap,
): string | undefined {
    if (!isBaseTimeSourceColumns(sourceColumns)) {
        return undefined;
    }

    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sTableRollups = findRollupTableEntry(rollupTableList, seriesConfig.table);
    if (!sTableRollups || sIntervalMs <= 0) {
        return undefined;
    }

    return findRollupColumnMatch(
        sTableRollups,
        getRollupColumnNameCandidates(sourceColumns.value, sourceColumns.jsonKey),
        sIntervalMs,
    )?.columnName;
}

async function fetchRawSeriesRows(
    seriesConfig: PanelSeriesDefinition,
    timeRange: TimeRangeMs | undefined,
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
        columnMap: sourceColumns,
        Count: count,
        SortOrder: useOrderBy ? SortOrderEnum.Ascending : SortOrderEnum.Unsorted,
        sampling: sampling,
    };

    return fetchRawData(request);
}
