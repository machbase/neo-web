import { useEffect, useMemo, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    seriesDataApi,
    type PanelDataFetchResult,
} from '../api/seriesDataApi';
import {
    mapFetchResultToChartData,
    type ChartSeriesData,
} from '../chart/chartData';
import { getNavigatorTrackWidth } from '../chart/chartGeometry';
import {
    enforceChartAreaWidth,
    resolveRangeChange,
} from '../range/rangeResolver';
import {
    resolveNumericIntervalValue,
    calculateInterval,
    getIntervalMs,
    TimeUnit,
    type IntervalOption,
} from '../range/intervalResolver';
import {
    type AxisRange,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import {
    getRangeWidth,
    isSameRange,
} from '../range/rangeArithmetic';
import {
    getPanelSeriesDisplayName,
    hasMixedXAxisValueKinds,
    hasNumericBaseTimeSeries,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
    type RollupTableMap,
} from '../seriesModel';
import {
    DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
    type PanelInfo,
    type PanelSampling,
} from '../panel/panelModel';
import {
    getReusablePanelDataRange,
    NAVIGATOR_QUERY_ROW_LIMIT,
    type NavigatorFetchResolution,
    useNavigatorSeriesFetch,
} from './navigatorDataLoader';
import {
    getUnavailableSeriesCount,
    hasFetchLimitReached,
    hasOnlyNoDataSeriesErrors,
    resolvePanelDisplay,
} from './panelLoadState';
import { buildRangeRequestKey, buildRequestKey } from './requestKey';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../hooks/useLatestAsyncRequest';

const MAIN_CALCULATED_FETCH_ROW_LIMIT = 10000;

const MAIN_NUMERIC_VISIBLE_BUCKET_TARGET = 1000;

type MainSeriesFetchOptions = {
    interval?: IntervalOption;
    numericBucketWidth?: number;
    signal?: AbortSignal;
};

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TIME_BUCKET_UNITS = [
    [MINUTE_MS, TimeUnit.Second, SECOND_MS],
    [HOUR_MS, TimeUnit.Minute, MINUTE_MS],
    [DAY_MS, TimeUnit.Hour, HOUR_MS],
    [Number.POSITIVE_INFINITY, TimeUnit.Day, DAY_MS],
] as const;

function resolveNumericCalculatedIntervalForRange(
    timeRange: AxisRange,
): number | undefined {
    const sNumericInterval = resolveNumericIntervalValue(
        getRangeWidth(timeRange),
        MAIN_NUMERIC_VISIBLE_BUCKET_TARGET,
    );

    return sNumericInterval > 0 ? sNumericInterval : undefined;
}

function resolvePanelFetchInterval(
    intervalType: TimeUnit | undefined,
    calculatedDataPixelsPerTick: number,
    timeRange: AxisRange,
    chartWidth: number,
): IntervalOption {
    const sCalculatedInterval = calculateInterval(
        timeRange.start,
        timeRange.end,
        chartWidth,
        calculatedDataPixelsPerTick,
    );
    if (!intervalType) {
        return sCalculatedInterval;
    }

    const sIntervalUnitMs = getIntervalMs(intervalType, 1);
    if (sIntervalUnitMs <= 0) {
        return sCalculatedInterval;
    }

    const sCalculatedIntervalMs = getIntervalMs(
        sCalculatedInterval.IntervalType,
        sCalculatedInterval.IntervalValue,
    );

    return {
        IntervalType: intervalType,
        IntervalValue: sCalculatedIntervalMs <= 0
            ? 1
            : Math.max(1, Math.ceil(sCalculatedIntervalMs / sIntervalUnitMs)),
    };
}

export function fetchMainSeriesRows(
    panelInfo: PanelInfo,
    range: AxisRange,
    chartWidth: number,
    rollups: RollupTableMap,
    options: MainSeriesFetchOptions = {},
): Promise<PanelDataFetchResult | undefined> {
    const { interval, numericBucketWidth, signal } = options;
    const seriesList = panelInfo.query.tagSet;
    const sampling = panelInfo.display.mainChartSampling;
    const sampleCount = sampling.enabled ? sampling.sampleCount : undefined;

    if (
        sampling.enabled &&
        (typeof sampleCount !== 'number' ||
            !Number.isFinite(sampleCount) ||
            sampleCount <= 0)
    ) {
        throw new Error(
            'main chart sampling requires a positive sample count when enabled.',
        );
    }

    if (panelInfo.mode.isRaw) {
        if (sampleCount === undefined) {
            return seriesDataApi.fetchRawSeriesRows(
                seriesList,
                range,
                panelInfo.mode.isOrderBy,
                signal,
            );
        }

        return seriesDataApi.fetchSampledRawSeriesRows(
            seriesList,
            range,
            sampleCount,
            panelInfo.mode.isOrderBy,
            signal,
        );
    }

    return seriesDataApi.fetchCalculatedSeriesRows(
        seriesList,
        range,
        interval ?? resolvePanelFetchInterval(
            panelInfo.query.intervalType,
            panelInfo.display.pixelsPerTick.calculated ?? 0,
            range,
            chartWidth,
        ),
        MAIN_CALCULATED_FETCH_ROW_LIMIT,
        rollups,
        {
            numericBucketWidth: numericBucketWidth ??
                (hasNumericBaseTimeSeries(seriesList)
                    ? resolveNumericCalculatedIntervalForRange(range)
                    : undefined),
            signal,
        },
    );
}

function resolveNavigatorTimeBucketInterval(
    timeRange: AxisRange,
): IntervalOption {
    const sBucketWidthMs = Math.ceil(
        getRangeWidth(timeRange) / NAVIGATOR_QUERY_ROW_LIMIT,
    );
    if (!Number.isFinite(sBucketWidthMs) || sBucketWidthMs <= 0) {
        throw new Error('Time range cannot be bucketed because it is invalid.');
    }

    const [, sIntervalType, sUnitMs] = TIME_BUCKET_UNITS.find(
        ([sMaxBucketWidth]) => sBucketWidthMs <= sMaxBucketWidth,
    )!;

    return {
        IntervalType: sIntervalType,
        IntervalValue: Math.max(1, Math.ceil(sBucketWidthMs / sUnitMs)),
    };
}

function showPanelDataFeedback(
    result: PanelDataFetchResult,
): void {
    if (hasFetchLimitReached(result)) {
        Toast.warning(
            'The data limit was reached, so only part of the result is displayed.',
            undefined,
        );
    }
    const sUnavailableSeriesCount = getUnavailableSeriesCount(result);

    if (sUnavailableSeriesCount === 0 || hasOnlyNoDataSeriesErrors(result)) {
        return;
    }

    Toast.error(
        sUnavailableSeriesCount === result.length
            ? 'No series data could be loaded.'
            : 'Some series could not be loaded.',
    );
}

type PanelDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    intervalType: TimeUnit | undefined;
    isRaw: boolean;
    useOrderBy: boolean;
    calculatedDataPixelsPerTick: number;
    mainChartSampling: PanelSampling & { sampleCount: number };
    rawNavigatorSampling: PanelSampling & { sampleCount: number };
};

type ResolvePanelDataFetchRequestParams = {
    load: PanelDataLoadConfig;
    chartWidth: number;
    rollups: RollupTableMap;
    refreshVersion: number;
    mainRange: AxisRange;
    navigatorRange: AxisRange;
    fullRange: AxisRange;
};

function resolvePanelDataFetchRequest({
    load,
    chartWidth,
    rollups,
    refreshVersion,
    mainRange,
    navigatorRange,
    fullRange,
}: ResolvePanelDataFetchRequestParams) {
    const sRequestInterval = load.isRaw
        ? undefined
        : resolvePanelFetchInterval(
              load.intervalType,
              load.calculatedDataPixelsPerTick,
              mainRange,
              chartWidth,
          );
    const sNumericInterval =
        !load.isRaw && hasNumericBaseTimeSeries(load.seriesList)
            ? resolveNumericCalculatedIntervalForRange(mainRange)
            : undefined;
    const sBaseKeys = buildPanelFetchBaseKeys(
        load,
        rollups,
        refreshVersion,
        sRequestInterval,
        sNumericInterval,
    );
    const sFetchRangeParams: ResolvePanelFetchRangesParams = {
        mainRange,
        navigatorRange,
        fullRange,
        load,
        requestInterval: sRequestInterval,
    };
    const sMainFetchRange = resolveMainFetchRange(sFetchRangeParams);
    const sNavigatorFetchRange = resolveNavigatorFetchRange(sFetchRangeParams);
    return {
        requestInterval: sRequestInterval,
        numericInterval: sNumericInterval,
        main: {
            baseKey: sBaseKeys.main,
            range: sMainFetchRange,
        },
        navigator: {
            baseKey: sBaseKeys.navigator,
            range: sNavigatorFetchRange,
        },
    };
}

function resolvePanelDataLoadConfig(panelInfo: PanelInfo): PanelDataLoadConfig {
    const { pixelsPerTick, mainChartSampling, rawNavigatorSampling } =
        panelInfo.display;

    return {
        seriesList: panelInfo.query.tagSet,
        intervalType: panelInfo.query.intervalType,
        isRaw: panelInfo.mode.isRaw,
        useOrderBy: panelInfo.mode.isRaw ? panelInfo.mode.isOrderBy : true,
        calculatedDataPixelsPerTick: pixelsPerTick.calculated ?? 0,
        mainChartSampling: {
            enabled: mainChartSampling.enabled,
            sampleCount: mainChartSampling.sampleCount ?? 0,
        },
        rawNavigatorSampling: {
            enabled: rawNavigatorSampling.enabled,
            sampleCount:
                rawNavigatorSampling.sampleCount ??
                DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
        },
    };
}

function buildPanelFetchBaseKeys(
    config: PanelDataLoadConfig,
    rollups: RollupTableMap,
    refreshVersion: number,
    requestInterval: IntervalOption | undefined,
    numericInterval: number | undefined,
) {
    if (!config.isRaw && !requestInterval) {
        throw new Error('Calculated main fetch requires an interval.');
    }

    const sSharedFields = {
        isRaw: config.isRaw,
        series: config.seriesList,
        rollups,
        refreshVersion,
    };

    return {
        main: buildRequestKey({
            ...sSharedFields,
            ...(config.isRaw
                ? {
                      useOrderBy: config.useOrderBy,
                      mainChartSampling: config.mainChartSampling,
                  }
                : {
                      requestInterval,
                      numericInterval: numericInterval ?? null,
                  }),
        }),
        navigator: buildRequestKey({
            ...sSharedFields,
            rawNavigatorSampling: config.isRaw
                ? config.rawNavigatorSampling
                : undefined,
            useOrderBy:
                config.isRaw && config.rawNavigatorSampling.enabled
                    ? config.useOrderBy
                    : undefined,
        }),
    };
}

type ResolvePanelFetchRangesParams = {
    mainRange: AxisRange;
    navigatorRange: AxisRange;
    fullRange: AxisRange;
    load: PanelDataLoadConfig;
    requestInterval: IntervalOption | undefined;
};

function resolveMainFetchRange(
    params: ResolvePanelFetchRangesParams,
): AxisRange {
    const sFetchableMainRange = getOverlappingTimeRange(
        params.mainRange,
        params.fullRange,
    );

    if (!sFetchableMainRange) return params.mainRange;
    if (params.load.isRaw) return sFetchableMainRange;

    const sFetchableNavigatorRange =
        getOverlappingTimeRange(
            params.navigatorRange,
            params.fullRange,
        ) ?? sFetchableMainRange;

    if (hasNumericBaseTimeSeries(params.load.seriesList)) {
        return clipFetchRangeToFullRange(
            expandTimeRange(sFetchableMainRange),
            params.fullRange,
        );
    }

    if (!params.requestInterval) {
        throw new Error('Calculated main prefetch requires an interval.');
    }

    return resolveSafeCalculatedPrefetchRange(
        sFetchableMainRange,
        sFetchableNavigatorRange,
        params.requestInterval,
    );
}

function resolveNavigatorFetchRange(
    params: ResolvePanelFetchRangesParams,
): AxisRange {
    const sFetchableNavigatorRange = getOverlappingTimeRange(
        params.navigatorRange,
        params.fullRange,
    );

    if (!sFetchableNavigatorRange) return params.navigatorRange;

    return clipFetchRangeToFullRange(
        expandTimeRange(sFetchableNavigatorRange),
        params.fullRange,
    );
}

function resolveSafeCalculatedPrefetchRange(
    mainRange: AxisRange,
    navigatorRange: AxisRange,
    requestInterval: IntervalOption,
): AxisRange {
    const sIntervalMs = getIntervalMs(
        requestInterval.IntervalType,
        requestInterval.IntervalValue,
    );
    const sRequestWidth = getRangeWidth(mainRange);

    if (
        sIntervalMs <= 0 ||
        sRequestWidth <= 0 ||
        Math.ceil(sRequestWidth / sIntervalMs) >
            MAIN_CALCULATED_FETCH_ROW_LIMIT
    ) {
        return mainRange;
    }

    const sNavigatorWidth = getRangeWidth(navigatorRange);
    if (
        sNavigatorWidth > 0 &&
        Math.ceil(sNavigatorWidth / sIntervalMs) <=
            MAIN_CALCULATED_FETCH_ROW_LIMIT
    ) {
        return navigatorRange;
    }

    return shrinkPrefetchRangeToPredictedRowBudget(
        mainRange,
        navigatorRange,
        sIntervalMs,
    );
}

function shrinkPrefetchRangeToPredictedRowBudget(
    mainRange: AxisRange,
    prefetchRange: AxisRange,
    intervalMs: number,
): AxisRange {
    const sRequestWidth = getRangeWidth(mainRange);
    const sExtraWidthBudget =
        intervalMs * MAIN_CALCULATED_FETCH_ROW_LIMIT - sRequestWidth;

    if (sExtraWidthBudget <= 0) {
        return mainRange;
    }

    const sLeftAvailable = Math.max(
        0,
        mainRange.start - prefetchRange.start,
    );
    const sRightAvailable = Math.max(
        0,
        prefetchRange.end - mainRange.end,
    );
    let sLeftPrefetchWidth = Math.min(
        sLeftAvailable,
        sExtraWidthBudget / 2,
    );
    const sRightPrefetchWidth = Math.min(
        sRightAvailable,
        sExtraWidthBudget - sLeftPrefetchWidth,
    );
    sLeftPrefetchWidth = Math.min(
        sLeftAvailable,
        sExtraWidthBudget - sRightPrefetchWidth,
    );

    return {
        start: mainRange.start - sLeftPrefetchWidth,
        end: mainRange.end + sRightPrefetchWidth,
    };
}

function expandTimeRange(range: AxisRange): AxisRange {
    const sRangeWidth = getRangeWidth(range);

    if (!Number.isFinite(sRangeWidth) || sRangeWidth <= 0) {
        return range;
    }

    return {
        start: range.start - sRangeWidth,
        end: range.end + sRangeWidth,
    };
}

function clipFetchRangeToFullRange(
    fetchRange: AxisRange,
    fullRange: AxisRange,
): AxisRange {
    return getOverlappingTimeRange(fetchRange, fullRange) ?? fetchRange;
}

function getOverlappingTimeRange(
    range: AxisRange,
    bounds: AxisRange,
): AxisRange | undefined {
    const startTime = Math.max(range.start, bounds.start);
    const endTime = Math.min(range.end, bounds.end);
    return startTime < endTime ? { start: startTime, end: endTime } : undefined;
}

type UsePanelDataLoadingParams = {
    panelInfo: PanelInfo;
    isActive: boolean;
    rangeState: ResolvedRangeState | undefined;
    chartAreaWidth: number | undefined;
    rollupTableList: RollupTableMap;
    dataRefreshVersion: number;
    onRawMainRangeLimited: (range: AxisRange) => void;
};

export function usePanelDataLoading({
    panelInfo,
    isActive,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRawMainRangeLimited,
}: UsePanelDataLoadingParams) {
    const sRequestedRange = rangeState?.range;
    const sChartWidth = chartAreaWidth !== undefined &&
        Number.isFinite(chartAreaWidth) && chartAreaWidth > 0
        ? chartAreaWidth
        : undefined;
    const sVisibleRange = sRequestedRange && sChartWidth !== undefined
        ? enforceChartAreaWidth(sRequestedRange, sChartWidth, 'main')
        : sRequestedRange;
    const sVisibleNavigatorRange = sVisibleRange?.navigatorRange;
    const loadConfig = resolvePanelDataLoadConfig(panelInfo);
    const sFetchRequest = rangeState && sVisibleNavigatorRange &&
        sChartWidth !== undefined
        ? resolvePanelDataFetchRequest({
              load: loadConfig,
              chartWidth: sChartWidth,
              rollups: rollupTableList,
              refreshVersion: dataRefreshVersion,
              mainRange: rangeState.range.mainRange,
              navigatorRange: sVisibleNavigatorRange,
              fullRange: rangeState.fullRange,
          })
        : undefined;
    const sUsesRawNavigatorData: boolean =
        loadConfig.isRaw && loadConfig.rawNavigatorSampling.enabled;
    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(loadConfig.seriesList);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(loadConfig.seriesList);
    const sCanFetch = sFetchRequest !== undefined &&
        isActive &&
        !hasMixedXAxisKinds &&
        loadConfig.seriesList.length > 0;
    const sMainFetchRequest = sCanFetch && sFetchRequest &&
        rangeState && sChartWidth !== undefined
        ? {
              baseKey: sFetchRequest.main.baseKey,
              requestedRange: rangeState.range.mainRange,
              queryRange: sFetchRequest.main.range,
              fetchFn: (queryRange: AxisRange) =>
                  fetchMainSeriesRows(
                      panelInfo,
                      queryRange,
                      sChartWidth,
                      rollupTableList,
                      {
                          interval: sFetchRequest.requestInterval,
                          numericBucketWidth: sFetchRequest.numericInterval,
                      },
                  ),
              onSuccess: (result: PanelDataFetchResult) => {
                  showPanelDataFeedback(result);
                  const sRequestedMainRange =
                      rangeState.range.mainRange;
                  const sFetchedMainRange = resolvePanelDisplay(
                      result,
                      sRequestedMainRange,
                      loadConfig.isRaw,
                  ).range;
                  if (!isSameRange(sFetchedMainRange, sRequestedMainRange)) {
                      onRawMainRangeLimited(sFetchedMainRange);
                  }
              },
          }
        : undefined;
    const {
        result: sMainResult,
        status: sMainStatus,
        error: sMainError,
        queryRange: sMainResultQueryRange,
    } = usePanelSeriesFetch(sMainFetchRequest);
    const sNavigatorFetchRequest = sCanFetch && sFetchRequest &&
        sVisibleNavigatorRange
        ? {
              baseKey: sFetchRequest.navigator.baseKey,
              requestedRange: sVisibleNavigatorRange,
              queryRange: sFetchRequest.navigator.range,
              usesNumericRange: isNumericXAxis,
              fetchFn: (
                  queryRange: AxisRange,
                  resolution: NavigatorFetchResolution,
                  signal: AbortSignal,
              ) => {
                  if (sUsesRawNavigatorData) {
                      return seriesDataApi.fetchSampledRawSeriesRows(
                          loadConfig.seriesList,
                          queryRange,
                          loadConfig.rawNavigatorSampling.sampleCount,
                          loadConfig.useOrderBy,
                          signal,
                      );
                  }

                  const interval: IntervalOption = resolution.interval ??
                      resolveNavigatorTimeBucketInterval(queryRange);
                  const seriesList: PanelSeriesDefinition[] = loadConfig.isRaw
                      ? loadConfig.seriesList.map((series) => ({
                            ...series,
                            calculationMode: PanelSeriesCalculationMode.Average,
                        }))
                      : loadConfig.seriesList;

                  return seriesDataApi.fetchCalculatedSeriesRows(
                      seriesList,
                      queryRange,
                      interval,
                      NAVIGATOR_QUERY_ROW_LIMIT,
                      rollupTableList,
                      {
                          numericBucketWidth: resolution.interval
                              ? undefined
                              : resolution.bucketWidth,
                          signal,
                      },
                  );
              },
          }
        : undefined;
    const {
        result: sNavigatorResult,
        status: sNavigatorStatus,
        error: sNavigatorError,
    } = useNavigatorSeriesFetch(sNavigatorFetchRequest);
    const sLoadError = sMainError ?? sNavigatorError;

    useEffect(() => {
        if (sLoadError) {
            Toast.error(sLoadError, undefined);
        }
    }, [sLoadError]);

    const sMainChartData = useMemo(
        () => mapFetchResultToChartData(
            sMainResult,
            loadConfig.seriesList,
            loadConfig.isRaw,
        ),
        [loadConfig.isRaw, loadConfig.seriesList, sMainResult],
    );
    const sNavigatorChartData = useMemo(
        () => mapFetchResultToChartData(
            sNavigatorResult,
            loadConfig.seriesList,
            loadConfig.isRaw,
        ),
        [loadConfig.isRaw, loadConfig.seriesList, sNavigatorResult],
    );
    const sSeriesRollupStatusList = useMemo(
        () =>
            sMainResult?.flatMap(({ seriesKey, metadata }) => {
                const sSeriesConfig = loadConfig.seriesList.find(
                    (seriesConfig) => seriesConfig.key === seriesKey,
                );
                return sSeriesConfig
                    ? [{
                          seriesName: getPanelSeriesDisplayName(sSeriesConfig),
                          usesRollup:
                              metadata?.kind === 'calculated' &&
                              metadata.usesRollup,
                      }]
                    : [];
            }) ?? [],
        [loadConfig.seriesList, sMainResult],
    );
    const sMainQueryCount = sMainResult
        ? loadConfig.isRaw
            ? loadConfig.mainChartSampling.enabled
                ? undefined
                : seriesDataApi.rawRowLimit
            : MAIN_CALCULATED_FETCH_ROW_LIMIT
        : undefined;
    const sNavigatorQueryCount = sNavigatorResult
        ? sUsesRawNavigatorData
            ? undefined
            : NAVIGATOR_QUERY_ROW_LIMIT
        : undefined;
    const sDataSettingMetrics = useMemo(
        () => ({
            mainChart: createDataSettingMetric(
                sMainQueryCount,
                loadConfig.seriesList.length,
                sMainChartData,
                sChartWidth,
            ),
            navigator: createDataSettingMetric(
                sNavigatorQueryCount,
                loadConfig.seriesList.length,
                sNavigatorChartData,
                sChartWidth === undefined
                    ? undefined
                    : getNavigatorTrackWidth(sChartWidth),
            ),
        }),
        [
            loadConfig.seriesList.length,
            sMainChartData,
            sMainQueryCount,
            sChartWidth,
            sNavigatorChartData,
            sNavigatorQueryCount,
        ],
    );
    const sMainResultMatchesRequest =
        sFetchRequest !== undefined &&
        sMainResultQueryRange !== undefined &&
        isSameRange(
            sMainResultQueryRange,
            sFetchRequest.main.range,
        );
    const sPanelDisplay = useMemo(
        () => sRequestedRange
            ? resolvePanelDisplay(
                sMainResultMatchesRequest ? sMainResult : undefined,
                sRequestedRange.mainRange,
                loadConfig.isRaw,
            )
            : undefined,
        [
            loadConfig.isRaw,
            sRequestedRange,
            sMainResult,
            sMainResultMatchesRequest,
        ],
    );
    const sRenderRange = useMemo<RangeState | undefined>(
        () => {
            if (!sRequestedRange || !sPanelDisplay) return undefined;

            const sResolvedRange = resolveRangeChange(
                sRequestedRange,
                {
                    type: 'main',
                    range: sPanelDisplay.range,
                },
            );
            return sChartWidth === undefined
                ? sResolvedRange
                : enforceChartAreaWidth(sResolvedRange, sChartWidth, 'main');
        },
        [sChartWidth, sPanelDisplay, sRequestedRange],
    );

    return {
        mainChartData: sMainChartData,
        navigatorChartData: sNavigatorChartData,
        renderRange: sRenderRange,
        resolvedIntervalOption: sMainResult
            ? sFetchRequest?.requestInterval
            : undefined,
        resolvedNumericInterval: sMainResult
            ? sFetchRequest?.numericInterval
            : undefined,
        seriesRollupStatusList: sSeriesRollupStatusList,
        dataSettingMetrics: sDataSettingMetrics,
        hasMixedXAxisKinds,
        isNumericXAxis,
        displayNotice: sPanelDisplay?.notice,
        loadStatus: {
            chart: rangeState && sChartWidth !== undefined
                ? sMainStatus
                : 'loading',
            navigator: rangeState && sChartWidth !== undefined
                ? sNavigatorStatus
                : 'loading',
        },
    };
}

function createDataSettingMetric(
    queryCountPerSeries: number | undefined,
    seriesCount: number,
    chartData: ChartSeriesData[],
    pixelWidth: number | undefined,
) {
    return {
        queriedEntries: queryCountPerSeries === undefined
            ? undefined
            : Math.max(0, queryCountPerSeries) * Math.max(0, seriesCount),
        pointCount: queryCountPerSeries === undefined && chartData.length === 0
            ? undefined
            : chartData.reduce((sum, series) => sum + series.data.length, 0),
        pixelWidth,
    };
}

type PanelSeriesFetchState = {
    result: PanelDataFetchResult | undefined;
    status: 'idle' | 'loading' | 'ready' | 'failed';
    error: string | undefined;
    baseKey?: string;
    queryRange?: AxisRange;
};

const INITIAL_FETCH_STATE: PanelSeriesFetchState = {
    result: undefined,
    status: 'idle',
    error: undefined,
};

type PanelSeriesFetchRequest = {
    baseKey: string;
    requestedRange: AxisRange;
    queryRange: AxisRange;
    fetchFn: (queryRange: AxisRange) => Promise<PanelDataFetchResult | undefined>;
    onSuccess?: (result: PanelDataFetchResult) => void;
};

const PANEL_FETCH_IDLE_KEY = 'panel-series:idle';

function usePanelSeriesFetch(
    request: PanelSeriesFetchRequest | undefined,
): PanelSeriesFetchState {
    const [state, setState] = useState<PanelSeriesFetchState>(
        INITIAL_FETCH_STATE,
    );
    const baseKey = request?.baseKey;
    const requestedRange = request?.requestedRange;
    const queryRange = request?.queryRange;
    const canFetch = request !== undefined;
    const sReusableRange =
        baseKey !== undefined && state.result && state.queryRange &&
        state.baseKey === baseKey
            ? getReusablePanelDataRange(
                  state.result,
                  state.queryRange,
              )
            : undefined;
    const sCachedQueryRange =
        requestedRange && state.queryRange && sReusableRange &&
        (requestedRange.start >= state.queryRange.start ||
            requestedRange.start > sReusableRange.start) &&
        (requestedRange.end <= state.queryRange.end ||
            requestedRange.end < sReusableRange.end)
            ? state.queryRange
            : undefined;
    const sQueryRange = sCachedQueryRange ?? queryRange;
    const sRequestKey = baseKey !== undefined && sQueryRange
        ? buildRangeRequestKey(baseKey, sQueryRange)
        : PANEL_FETCH_IDLE_KEY;
    const sShouldUseCache = sCachedQueryRange !== undefined;

    useEffect(() => {
        if (!canFetch) {
            setState(INITIAL_FETCH_STATE);
        } else if (sShouldUseCache) {
            setState((currentState) => ({
                ...currentState,
                status: 'ready',
                error: undefined,
            }));
        }
    }, [canFetch, sRequestKey, sShouldUseCache]);

    useLatestAsyncRequest({
        enabled: canFetch && !sShouldUseCache,
        requestKey: sRequestKey,
        fetch: async () => {
            if (!request || !sQueryRange) {
                throw new Error('Panel fetch request is unavailable.');
            }
            const result = await request.fetchFn(sQueryRange);
            if (!result) {
                throw new Error('Panel fetch did not return a result.');
            }
            return result;
        },
        onStart: () => {
            setState((currentState) => ({
                ...currentState,
                status: 'loading',
                error: undefined,
            }));
        },
        onSuccess: (result) => {
            setState({
                result,
                status: 'ready',
                error: undefined,
                baseKey: request?.baseKey,
                queryRange: sQueryRange,
            });
            request?.onSuccess?.(result);
        },
        onError: (error) => {
            setState({
                ...INITIAL_FETCH_STATE,
                status: 'failed',
                error: getAsyncRequestErrorMessage(
                    error,
                    'Failed to load chart data.',
                ),
            });
        },
    });

    return !request ||
        (state.baseKey !== undefined && state.baseKey !== request.baseKey)
        ? { ...state, result: undefined }
        : state;
}
