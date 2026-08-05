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
import {
    getNavigatorTrackWidth,
    resolveNavigatorDisplayRange,
} from '../panel/panelRangeResolution';
import type { PanelRangeSourceState } from '../panel/panelRangeSourceState';
import {
    resolveNumericIntervalValue,
    calculateInterval,
    getIntervalMs,
    TimeUnit,
    type IntervalOption,
    type AxisRange,
    type PanelRangeState,
} from '../range/rangeModel';
import {
    getRangeWidth,
    isSameRange,
    isValidRange,
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
} from '../model';
import {
    getReusablePanelDataRange,
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
        timeRange.startTime,
        timeRange.endTime,
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

function resolveTimeBucketIntervalForTargetCount(
    timeRange: AxisRange,
    targetCount: number,
): IntervalOption {
    if (targetCount <= 0) {
        throw new Error('Target row count must be positive.');
    }

    const sBucketWidthMs = Math.ceil(getRangeWidth(timeRange) / targetCount);
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

type PanelFetchSampling = {
    enabled: boolean;
    sampleCount: number;
};

type PanelDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    intervalType: TimeUnit | undefined;
    isRaw: boolean;
    useOrderBy: boolean;
    calculatedDataPixelsPerTick: number;
    mainChartSampling: PanelFetchSampling;
    rawNavigatorSampling: PanelFetchSampling;
};

type ResolvePanelDataFetchRequestParams = {
    panelInfo: PanelInfo;
    chartWidth: number;
    rollups: RollupTableMap;
    refreshVersion: number;
    panelRange: AxisRange;
    navigatorRange: AxisRange;
    fullRange: AxisRange;
};

function resolvePanelDataFetchRequest({
    panelInfo,
    chartWidth,
    rollups,
    refreshVersion,
    panelRange,
    navigatorRange,
    fullRange,
}: ResolvePanelDataFetchRequestParams) {
    const sLoad = resolvePanelDataLoadConfig(panelInfo);
    const sRequestInterval = sLoad.isRaw
        ? undefined
        : resolvePanelFetchInterval(
              sLoad.intervalType,
              sLoad.calculatedDataPixelsPerTick,
              panelRange,
              chartWidth,
          );
    const sNumericInterval =
        !sLoad.isRaw && hasNumericBaseTimeSeries(sLoad.seriesList)
            ? resolveNumericCalculatedIntervalForRange(panelRange)
            : undefined;
    const sBaseKeys = buildPanelFetchBaseKeys(
        sLoad,
        rollups,
        refreshVersion,
        sRequestInterval,
        sNumericInterval,
    );
    const sFetchRangeParams: ResolvePanelFetchRangesParams = {
        panelRange,
        navigatorRange,
        fullRange,
        load: sLoad,
        requestInterval: sRequestInterval,
    };
    const sMainFetchRange = resolveMainFetchRange(sFetchRangeParams);
    const sNavigatorFetchRange = resolveNavigatorFetchRange(sFetchRangeParams);
    return {
        load: sLoad,
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
    panelRange: AxisRange;
    navigatorRange: AxisRange;
    fullRange: AxisRange;
    load: PanelDataLoadConfig;
    requestInterval: IntervalOption | undefined;
};

function resolveMainFetchRange(
    params: ResolvePanelFetchRangesParams,
): AxisRange {
    const sFetchablePanelRange = getOverlappingTimeRange(
        params.panelRange,
        params.fullRange,
    );

    if (!sFetchablePanelRange) return params.panelRange;
    if (params.load.isRaw) return sFetchablePanelRange;

    const sFetchableNavigatorRange =
        getOverlappingTimeRange(
            params.navigatorRange,
            params.fullRange,
        ) ?? sFetchablePanelRange;

    if (hasNumericBaseTimeSeries(params.load.seriesList)) {
        return clipFetchRangeToFullRange(
            expandTimeRange(sFetchablePanelRange),
            params.fullRange,
        );
    }

    if (!params.requestInterval) {
        throw new Error('Calculated main prefetch requires an interval.');
    }

    return resolveSafeCalculatedPrefetchRange(
        sFetchablePanelRange,
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
    panelRange: AxisRange,
    navigatorRange: AxisRange,
    requestInterval: IntervalOption,
): AxisRange {
    const sIntervalMs = getIntervalMs(
        requestInterval.IntervalType,
        requestInterval.IntervalValue,
    );
    const sRequestWidth = getRangeWidth(panelRange);

    if (
        sIntervalMs <= 0 ||
        sRequestWidth <= 0 ||
        Math.ceil(sRequestWidth / sIntervalMs) >
            MAIN_CALCULATED_FETCH_ROW_LIMIT
    ) {
        return panelRange;
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
        panelRange,
        navigatorRange,
        sIntervalMs,
    );
}

function shrinkPrefetchRangeToPredictedRowBudget(
    panelRange: AxisRange,
    prefetchRange: AxisRange,
    intervalMs: number,
): AxisRange {
    const sRequestWidth = getRangeWidth(panelRange);
    const sExtraWidthBudget =
        intervalMs * MAIN_CALCULATED_FETCH_ROW_LIMIT - sRequestWidth;

    if (sExtraWidthBudget <= 0) {
        return panelRange;
    }

    const sLeftAvailable = Math.max(
        0,
        panelRange.startTime - prefetchRange.startTime,
    );
    const sRightAvailable = Math.max(
        0,
        prefetchRange.endTime - panelRange.endTime,
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
        startTime: panelRange.startTime - sLeftPrefetchWidth,
        endTime: panelRange.endTime + sRightPrefetchWidth,
    };
}

function expandTimeRange(range: AxisRange): AxisRange {
    const sRangeWidth = getRangeWidth(range);

    if (!Number.isFinite(sRangeWidth) || sRangeWidth <= 0) {
        return range;
    }

    return {
        startTime: range.startTime - sRangeWidth,
        endTime: range.endTime + sRangeWidth,
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
    const sOverlappingRange: AxisRange = {
        startTime: Math.max(range.startTime, bounds.startTime),
        endTime: Math.min(range.endTime, bounds.endTime),
    };

    return isValidRange(sOverlappingRange)
        ? sOverlappingRange
        : undefined;
}

type UsePanelDataLoadingParams = {
    panelInfo: PanelInfo;
    isActive: boolean;
    rangeState: PanelRangeSourceState;
    chartAreaWidth: number | undefined;
    rollupTableList: RollupTableMap;
    dataRefreshVersion: number;
    onRawMainRangeLimited: (range: AxisRange) => void;
};

// Render-only placeholder while the chart mounts and measures its width. It is
// never stored as Panel state, fetched, or passed to range command calculations.
const UNRESOLVED_AXIS_RANGE: AxisRange = { startTime: 0, endTime: 0 };

export function usePanelDataLoading({
    panelInfo,
    isActive,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRawMainRangeLimited,
}: UsePanelDataLoadingParams) {
    const sResolvedRangeState = rangeState.status === 'ready'
        ? rangeState
        : undefined;
    const sRequestedPanelRange =
        sResolvedRangeState?.range.panelRange ?? UNRESOLVED_AXIS_RANGE;
    const sRequestedNavigatorRange =
        sResolvedRangeState?.range.navigatorRange ?? UNRESOLVED_AXIS_RANGE;
    const sFullRange = sResolvedRangeState?.fullRange ?? UNRESOLVED_AXIS_RANGE;
    const sVisibleNavigatorRange = resolveNavigatorDisplayRange(
        sRequestedPanelRange,
        sRequestedNavigatorRange,
        chartAreaWidth,
    );
    const sChartWidth = chartAreaWidth !== undefined && chartAreaWidth > 0
        ? chartAreaWidth
        : 1;
    const sFetchRequest = resolvePanelDataFetchRequest({
        panelInfo,
        chartWidth: sChartWidth,
        rollups: rollupTableList,
        refreshVersion: dataRefreshVersion,
        panelRange: sRequestedPanelRange,
        navigatorRange: sVisibleNavigatorRange,
        fullRange: sFullRange,
    });
    const loadConfig = sFetchRequest.load;
    const sRequestPanelInterval = sFetchRequest.requestInterval;
    const sUsesRawNavigatorData: boolean =
        loadConfig.isRaw && loadConfig.rawNavigatorSampling.enabled;
    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(loadConfig.seriesList);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(loadConfig.seriesList);
    const usesNumericNavigatorRange = isNumericXAxis;
    const sCanFetch = sResolvedRangeState !== undefined &&
        isActive &&
        !hasMixedXAxisKinds &&
        loadConfig.seriesList.length > 0 &&
        chartAreaWidth !== undefined && chartAreaWidth > 0 &&
        [sRequestedPanelRange, sVisibleNavigatorRange, sFullRange].every(
            isValidRange,
        );
    const {
        result: sMainResult,
        status: sMainStatus,
        error: sMainError,
        queryRange: sMainResultQueryRange,
    } = usePanelSeriesFetch({
        canFetch: sCanFetch,
        baseKey: sFetchRequest.main.baseKey,
        requestedRange: sRequestedPanelRange,
        queryRange: sFetchRequest.main.range,
        rejectLimitedResult: true,
        fetchFn: (queryRange) =>
            fetchMainSeriesRows(
                panelInfo,
                queryRange,
                sChartWidth,
                rollupTableList,
                {
                    interval: sRequestPanelInterval,
                    numericBucketWidth: sFetchRequest.numericInterval,
                },
            ),
        onSuccess: (result) => {
            showPanelDataFeedback(result);
            const sFetchedPanelRange = resolvePanelDisplay(
                result,
                sRequestedPanelRange,
                loadConfig.isRaw,
            ).range;
            if (
                sResolvedRangeState &&
                !isSameRange(sFetchedPanelRange, sRequestedPanelRange)
            ) {
                onRawMainRangeLimited(sFetchedPanelRange);
            }
        },
    });
    const {
        result: sNavigatorResult,
        status: sNavigatorStatus,
        error: sNavigatorError,
        rowLimit: navigatorRowLimit,
    } = useNavigatorSeriesFetch({
        canFetch: sCanFetch,
        baseKey: sFetchRequest.navigator.baseKey,
        requestedRange: sVisibleNavigatorRange,
        queryRange: sFetchRequest.navigator.range,
        usesNumericRange: usesNumericNavigatorRange,
        rejectLimitedResult: true,
        fetchFn: (
            queryRange: AxisRange,
            resolution,
            rowLimit: number,
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
                resolveTimeBucketIntervalForTargetCount(
                    queryRange,
                    rowLimit,
                );
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
                rowLimit,
                rollupTableList,
                {
                    numericBucketWidth: resolution.interval
                        ? undefined
                        : resolution.bucketWidth,
                    signal,
                },
            );
        },
    });
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
            : navigatorRowLimit
        : undefined;
    const sMetricWidth = chartAreaWidth !== undefined &&
        Number.isFinite(chartAreaWidth) && chartAreaWidth > 0
        ? chartAreaWidth
        : undefined;
    const sDataSettingMetrics = useMemo(
        () => ({
            mainChart: createDataSettingMetric(
                sMainQueryCount,
                loadConfig.seriesList.length,
                sMainChartData,
                sMetricWidth,
            ),
            navigator: createDataSettingMetric(
                sNavigatorQueryCount,
                loadConfig.seriesList.length,
                sNavigatorChartData,
                sMetricWidth === undefined
                    ? undefined
                    : getNavigatorTrackWidth(sMetricWidth),
            ),
        }),
        [
            loadConfig.seriesList.length,
            sMainChartData,
            sMainQueryCount,
            sMetricWidth,
            sNavigatorChartData,
            sNavigatorQueryCount,
        ],
    );
    const sMainResultMatchesRequest =
        sMainResultQueryRange !== undefined &&
        isSameRange(
            sMainResultQueryRange,
            sFetchRequest.main.range,
        );
    const sPanelDisplay = useMemo(
        () =>
            resolvePanelDisplay(
                sMainResultMatchesRequest ? sMainResult : undefined,
                sRequestedPanelRange,
                loadConfig.isRaw,
            ),
        [
            loadConfig.isRaw,
            sRequestedPanelRange,
            sMainResult,
            sMainResultMatchesRequest,
        ],
    );
    const sDisplayNotice = sPanelDisplay.notice ??
        (loadConfig.seriesList.length > 0 &&
        !isValidRange(sFullRange)
            ? 'No Data'
            : undefined);
    const sRenderRange = useMemo<PanelRangeState>(
        () => ({
            panelRange: sPanelDisplay.range,
            navigatorRange: resolveNavigatorDisplayRange(
                sPanelDisplay.range,
                sRequestedNavigatorRange,
                chartAreaWidth,
            ),
        }),
        [
            chartAreaWidth,
            sRequestedNavigatorRange,
            sPanelDisplay,
        ],
    );

    return {
        mainChartData: sMainChartData,
        navigatorChartData: sNavigatorChartData,
        renderRange: sRenderRange,
        resolvedIntervalOption: sMainResult
            ? sRequestPanelInterval
            : undefined,
        resolvedNumericInterval: sMainResult
            ? sFetchRequest.numericInterval
            : undefined,
        seriesRollupStatusList: sSeriesRollupStatusList,
        dataSettingMetrics: sDataSettingMetrics,
        hasMixedXAxisKinds,
        isNumericXAxis,
        displayNotice: sDisplayNotice,
        loadStatus: {
            chart: sResolvedRangeState ? sMainStatus : 'loading',
            navigator: sResolvedRangeState ? sNavigatorStatus : 'loading',
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

function usePanelSeriesFetch({
    canFetch,
    baseKey,
    requestedRange,
    queryRange,
    rejectLimitedResult,
    fetchFn,
    onSuccess,
}: {
    canFetch: boolean;
    baseKey: string;
    requestedRange: AxisRange;
    queryRange: AxisRange;
    rejectLimitedResult: boolean;
    fetchFn: (queryRange: AxisRange) => Promise<PanelDataFetchResult | undefined>;
    onSuccess?: (result: PanelDataFetchResult) => void;
}): PanelSeriesFetchState {
    const [state, setState] = useState<PanelSeriesFetchState>(
        INITIAL_FETCH_STATE,
    );
    const sReusableRange =
        state.result && state.queryRange && state.baseKey === baseKey
            ? getReusablePanelDataRange(
                  state.result,
                  state.queryRange,
                  rejectLimitedResult,
              )
            : undefined;
    const sCachedQueryRange =
        state.queryRange && sReusableRange &&
        (requestedRange.startTime >= state.queryRange.startTime ||
            requestedRange.startTime > sReusableRange.startTime) &&
        (requestedRange.endTime <= state.queryRange.endTime ||
            requestedRange.endTime < sReusableRange.endTime)
            ? state.queryRange
            : undefined;
    const sQueryRange = sCachedQueryRange ?? queryRange;
    const sRequestKey = buildRangeRequestKey(baseKey, sQueryRange);
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
            const result = await fetchFn(sQueryRange);
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
                baseKey,
                queryRange: sQueryRange,
            });
            onSuccess?.(result);
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

    return state.baseKey !== undefined && state.baseKey !== baseKey
        ? { ...state, result: undefined }
        : state;
}
