import { useEffect, useMemo, useRef, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    mapFetchResultToChartData,
    type ChartSeriesData,
} from '../domain/ChartDomain';
import {
    type PanelDisplayRangeState,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelSampling,
    type RuntimePanelXAxis,
} from '../domain/PanelDomain';
import type { IntervalOption, TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    getIntervalMs,
    hasResolvedIntervalOption,
} from '../domain/time/interval/TimeIntervalUtils';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeWidth,
    isSameTimeRange,
    isTimeRangeWithinTimeRange,
    isValidTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import {
    CALCULATED_FETCH_ROW_BUDGET,
    RAW_MAIN_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
    resolvePanelFetchInterval,
} from '../fetch/PanelSeriesDataRepository';
import {
    type PanelSeriesDefinition,
} from '../domain/SeriesDomain';
import type {
    FetchPanelSeriesRowsResult,
    RollupTableMap,
} from '../fetch/FetchContracts';
import {
    getNavigatorTrackWidth,
    resolveNavigatorRangeForPanel,
} from '../board/PanelNavigatorRangeLimits';

type PanelChartDataLoadConfig = {
    seriesList: PanelSeriesDefinition[];
    queryLimit: number;
    intervalType: string | undefined;
    isRaw: boolean;
    useOrderBy: boolean;
    xAxis: RuntimePanelXAxis;
    mainChartSampling: RuntimePanelSampling;
};

export enum PanelChartLoadStatus {
    Idle = 'idle',
    Loading = 'loading',
    Ready = 'ready',
    Failed = 'failed',
}

type UsePanelChartDataRuntimeParams = {
    panelInfo: PanelInfo;
    isActive: boolean;
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    rollupTableList: RollupTableMap;
    dataRefreshVersion: number;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
};

type UsePanelChartDataRuntimeResult = {
    chartData: ChartSeriesData[];
    visibleChartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    displayRangeState: PanelDisplayRangeState;
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
};

type PanelSeriesFetchState = {
    result: FetchPanelSeriesRowsResult | undefined;
    status: PanelChartLoadStatus;
};

type MainFetchCacheState = {
    baseKey: string;
    fetchedRange: TimeRangeMs | undefined;
    reuseKey: string | undefined;
};

type NavigatorFetchCacheState = {
    baseKey: string;
    fetchedRange: TimeRangeMs | undefined;
};

export type PanelFetchDecision =
    | { kind: 'reuse'; fetchedRange: TimeRangeMs }
    | { kind: 'fetch'; fetchRange: TimeRangeMs };

export type PanelFetchPlan = {
    main: PanelFetchDecision;
    navigator: PanelFetchDecision;
};

const INITIAL_FETCH_STATE: PanelSeriesFetchState = {
    result: undefined,
    status: PanelChartLoadStatus.Idle,
};
const MIN_DISPLAY_DATA_RANGE_WIDTH = 1;
const PANEL_PREFETCH_SIDE_FACTOR = 1;
const NAVIGATOR_PREFETCH_SIDE_FACTOR = 1;

export function usePanelChartDataRuntime({
    panelInfo,
    isActive,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRangeStateChange,
}: UsePanelChartDataRuntimeParams): UsePanelChartDataRuntimeResult {
    const sLoadConfig = buildLoadConfig(panelInfo);
    const sChartWidth = resolveChartWidth(chartAreaWidth);
    const sRequestPanelRange = rangeState.requestPanelRange;
    const sNavigatorRange = resolveRenderableNavigatorRange(
        rangeState.requestNavigatorRange,
        sRequestPanelRange,
        chartAreaWidth,
    );
    const sCanFetch = isActive && isReadyToFetch({
        chartAreaWidth,
        panelRange: sRequestPanelRange,
        navigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
    });
    const sSeriesKey = buildSeriesCacheKey(sLoadConfig.seriesList);
    const sRollupKey = JSON.stringify(rollupTableList);
    const sMainFetchCacheRef = useRef<MainFetchCacheState>({
        baseKey: '',
        fetchedRange: undefined,
        reuseKey: undefined,
    });
    const sNavigatorFetchCacheRef = useRef<NavigatorFetchCacheState>({
        baseKey: '',
        fetchedRange: undefined,
    });
    const sRequestPanelInterval = useMemo(
        () =>
            resolvePanelFetchInterval(
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sRequestPanelRange,
                sChartWidth,
                sLoadConfig.isRaw,
            ),
        [
            sRequestPanelRange,
            sChartWidth,
            sLoadConfig.intervalType,
            sLoadConfig.xAxis,
            sLoadConfig.isRaw,
        ],
    );
    const sMainFetchReuseKey = getMainFetchReuseKey(
        sLoadConfig,
        sRequestPanelInterval,
    );
    const sMainBaseKey = buildMainFetchBaseKey(
        sLoadConfig,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    if (sMainFetchCacheRef.current.baseKey !== sMainBaseKey) {
        sMainFetchCacheRef.current = {
            baseKey: sMainBaseKey,
            fetchedRange: undefined,
            reuseKey: undefined,
        };
    }
    const sNavigatorBaseKey = buildNavigatorFetchBaseKey(
        sLoadConfig,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    if (sNavigatorFetchCacheRef.current.baseKey !== sNavigatorBaseKey) {
        sNavigatorFetchCacheRef.current = {
            baseKey: sNavigatorBaseKey,
            fetchedRange: undefined,
        };
    }
    const sFetchPlan = resolvePanelFetchPlan({
        requestPanelRange: sRequestPanelRange,
        requestNavigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
        loadConfig: sLoadConfig,
        requestInterval: sRequestPanelInterval,
        mainReuseKey: sMainFetchReuseKey,
        mainCacheState: sMainFetchCacheRef.current,
        navigatorCacheState: sNavigatorFetchCacheRef.current,
    });
    const sMainFetchRange = getPanelFetchDecisionRange(sFetchPlan.main);
    const sNavigatorFetchRange = getPanelFetchDecisionRange(sFetchPlan.navigator);
    const sMainKey = buildFetchCacheKey(
        'main',
        sLoadConfig,
        sMainFetchRange,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    const sNavigatorKey = buildFetchCacheKey(
        'navigator',
        sLoadConfig,
        sNavigatorFetchRange,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );

    const sMainFetch = usePanelSeriesFetch({
        canFetch: sCanFetch,
        cacheKey: sMainKey,
        fetchFn: () =>
            fetchMainPanelSeriesRows(
                sLoadConfig.seriesList,
                sLoadConfig.isRaw ? RAW_MAIN_SAMPLE_COUNT : sLoadConfig.queryLimit,
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sLoadConfig.mainChartSampling,
                sChartWidth,
                sLoadConfig.isRaw,
                sLoadConfig.useOrderBy,
                sMainFetchRange,
                rollupTableList,
                sLoadConfig.isRaw ? undefined : sRequestPanelInterval,
            ),
        validate: assertResolvedInterval,
        onSuccess: (result) => {
            handleMainLimitReached(result);
            updateMainFetchCache(
                sMainFetchCacheRef,
                sMainBaseKey,
                sMainFetchRange,
                sMainFetchReuseKey,
                result,
            );
            applyFetchedPanelRangeCorrection({
                result,
                rangeState,
                requestPanelRange: sRequestPanelRange,
                onRangeStateChange,
            });
        },
    });
    const sNavigatorFetch = usePanelSeriesFetch({
        canFetch: sCanFetch,
        cacheKey: sNavigatorKey,
        fetchFn: () =>
            fetchNavigatorPanelSeriesRows(
                sLoadConfig.seriesList,
                sLoadConfig.queryLimit,
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sChartWidth,
                sLoadConfig.isRaw,
                sNavigatorFetchRange,
                rollupTableList,
            ),
        onSuccess: () => {
            updateNavigatorFetchCache(
                sNavigatorFetchCacheRef,
                sNavigatorBaseKey,
                sNavigatorFetchRange,
            );
        },
    });

    const sChartData = useMemo(
        () => mapFetchResultToChartData(sMainFetch.result),
        [sMainFetch.result],
    );
    const sNavigatorChartData = useMemo(
        () => mapFetchResultToChartData(sNavigatorFetch.result),
        [sNavigatorFetch.result],
    );
    const sDisplayPanelRange = useMemo(
        () =>
            resolveDisplayPanelRange(
                sMainFetch.result,
                sRequestPanelRange,
            ),
        [sMainFetch.result, sRequestPanelRange],
    );
    const sVisibleDisplayResult = useMemo(
        () =>
            resolveVisibleDisplayResult(
                sMainFetch.result,
                sDisplayPanelRange,
            ),
        [sMainFetch.result, sDisplayPanelRange],
    );
    const sVisibleChartData = useMemo(
        () => mapFetchResultToChartData(sVisibleDisplayResult),
        [sVisibleDisplayResult],
    );
    const sDisplayNavigatorRange = useMemo(
        () =>
            resolveDisplayNavigatorRange(
                sDisplayPanelRange,
                sNavigatorRange,
                chartAreaWidth,
            ),
        [chartAreaWidth, sDisplayPanelRange, sNavigatorRange],
    );
    const sDisplayRangeState = useMemo<PanelDisplayRangeState>(
        () => ({
            displayPanelRange: sDisplayPanelRange,
            displayNavigatorRange: sDisplayNavigatorRange,
        }),
        [sDisplayPanelRange, sDisplayNavigatorRange],
    );

    return {
        chartData: sChartData,
        visibleChartData: sVisibleChartData,
        navigatorChartData: sNavigatorChartData,
        displayRangeState: sDisplayRangeState,
        resolvedIntervalOption: sMainFetch.result?.interval,
        loadStatus: {
            chart: sMainFetch.status,
            navigator: sNavigatorFetch.status,
        },
    };
}

function buildLoadConfig(panelInfo: PanelInfo): PanelChartDataLoadConfig {
    const sPixelsPerTick = panelInfo.display.pixelsPerTick;
    const sSampling = panelInfo.display.mainChartSampling;

    return {
        seriesList: panelInfo.query.tagSet,
        queryLimit: panelInfo.query.count ?? -1,
        intervalType: panelInfo.query.intervalType,
        isRaw: panelInfo.mode.isRaw,
        useOrderBy: panelInfo.mode.isRaw ? panelInfo.mode.isOrderBy : true,
        xAxis: {
            showTickline: false,
            rawDataPixelsPerTick: sPixelsPerTick.raw ?? 0,
            calculatedDataPixelsPerTick: sPixelsPerTick.calculated ?? 0,
            calculatedNavigatorPixelsPerTick:
                sPixelsPerTick.calculatedNavigator ?? 0,
        },
        mainChartSampling: {
            enabled: sSampling.enabled,
            sampleCount: sSampling.sampleCount ?? 0,
        },
    };
}

function resolveChartWidth(chartAreaWidth: number | undefined): number {
    return chartAreaWidth !== undefined && chartAreaWidth > 0 ? chartAreaWidth : 1;
}

function isReadyToFetch({
    chartAreaWidth,
    panelRange,
    navigatorRange,
    fullRange,
}: {
    chartAreaWidth: number | undefined;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
}): boolean {
    return (
        chartAreaWidth !== undefined &&
        isValidTimeRange(panelRange) &&
        isValidTimeRange(navigatorRange) &&
        isValidTimeRange(fullRange)
    );
}

function resolveRenderableNavigatorRange(
    requestNavigatorRange: TimeRangeMs,
    displayPanelRange: TimeRangeMs,
    chartAreaWidth: number | undefined,
): TimeRangeMs {
    if (!isValidTimeRange(displayPanelRange) || !isValidTimeRange(requestNavigatorRange)) {
        return requestNavigatorRange;
    }

    const sNavigatorTrackPixelWidth =
        chartAreaWidth !== undefined && chartAreaWidth > 0
            ? getNavigatorTrackWidth(chartAreaWidth)
            : undefined;

    return resolveNavigatorRangeForPanel(
        displayPanelRange,
        requestNavigatorRange,
        sNavigatorTrackPixelWidth,
    );
}

function buildSeriesCacheKey(seriesList: PanelSeriesDefinition[]): string {
    return JSON.stringify(
        seriesList.map((s) => ({
            table: s.table,
            sourceTagName: s.sourceTagName,
            calculationMode: s.calculationMode,
            useRollupTable: s.useRollupTable,
            sourceColumns: s.sourceColumns,
        })),
    );
}

function buildMainFetchBaseKey(
    config: PanelChartDataLoadConfig,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    return JSON.stringify({
        queryLimit: config.queryLimit,
        intervalType: config.intervalType,
        isRaw: config.isRaw,
        rawPixelsPerTick: config.xAxis.rawDataPixelsPerTick,
        chartWidth,
        series: seriesKey,
        rollups: rollupKey,
        refreshVersion,
        useOrderBy: config.useOrderBy,
        calculatedPixelsPerTick: config.xAxis.calculatedDataPixelsPerTick,
        mainChartSampling: config.mainChartSampling,
    });
}

function getMainFetchReuseKey(
    config: PanelChartDataLoadConfig,
    requestInterval: IntervalOption,
): string | undefined {
    if (config.isRaw) {
        return config.mainChartSampling.enabled
            ? JSON.stringify({
                  mode: 'raw-sampling',
                  sampleCount: config.mainChartSampling.sampleCount,
              })
            : undefined;
    }

    return JSON.stringify({
        mode: 'calculated',
        intervalType: requestInterval.IntervalType,
        intervalValue: requestInterval.IntervalValue,
    });
}

function buildNavigatorFetchBaseKey(
    config: PanelChartDataLoadConfig,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    return JSON.stringify({
        queryLimit: config.queryLimit,
        intervalType: config.intervalType,
        isRaw: config.isRaw,
        rawPixelsPerTick: config.xAxis.rawDataPixelsPerTick,
        chartWidth,
        series: seriesKey,
        rollups: rollupKey,
        refreshVersion,
        navigatorPixelsPerTick: config.xAxis.calculatedNavigatorPixelsPerTick,
    });
}

type ResolvePanelFetchPlanParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    loadConfig: PanelChartDataLoadConfig;
    requestInterval: IntervalOption;
    mainReuseKey: string | undefined;
    mainCacheState: MainFetchCacheState;
    navigatorCacheState: NavigatorFetchCacheState;
};

export function resolvePanelFetchPlan({
    requestPanelRange,
    requestNavigatorRange,
    fullRange,
    loadConfig,
    requestInterval,
    mainReuseKey,
    mainCacheState,
    navigatorCacheState,
}: ResolvePanelFetchPlanParams): PanelFetchPlan {
    return {
        main: resolveMainPanelFetchDecision({
            requestPanelRange,
            requestNavigatorRange,
            fullRange,
            loadConfig,
            requestInterval,
            reuseKey: mainReuseKey,
            cacheState: mainCacheState,
        }),
        navigator: resolveNavigatorFetchDecision({
            requestNavigatorRange,
            fullRange,
            cacheState: navigatorCacheState,
        }),
    };
}

function resolveMainPanelFetchDecision(
    params: ResolveMainPanelFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;

    if (
        sCachedRange &&
        !isTimeRangeWithinTimeRange(params.requestPanelRange, params.fullRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    if (
        sCachedRange &&
        params.cacheState.reuseKey === params.reuseKey &&
        isTimeRangeWithinTimeRange(params.requestPanelRange, sCachedRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    return {
        kind: 'fetch',
        fetchRange: resolveMainPanelFetchRange(params),
    };
}

function resolveNavigatorFetchDecision(
    params: ResolveNavigatorFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;

    if (
        sCachedRange &&
        (isTimeRangeWithinTimeRange(params.requestNavigatorRange, sCachedRange) ||
            !isTimeRangeWithinTimeRange(params.requestNavigatorRange, params.fullRange))
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    return {
        kind: 'fetch',
        fetchRange: resolveNavigatorFetchRange(params),
    };
}

function getPanelFetchDecisionRange(decision: PanelFetchDecision): TimeRangeMs {
    return decision.kind === 'fetch' ? decision.fetchRange : decision.fetchedRange;
}

type ResolveNavigatorFetchRangeParams = {
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    cacheState: NavigatorFetchCacheState;
};

function resolveNavigatorFetchRange({
    requestNavigatorRange,
    fullRange,
    cacheState,
}: ResolveNavigatorFetchRangeParams): TimeRangeMs {
    if (!cacheState.fetchedRange) {
        return buildNavigatorPrefetchRange(requestNavigatorRange, fullRange);
    }

    if (isTimeRangeWithinTimeRange(requestNavigatorRange, cacheState.fetchedRange)) {
        return cacheState.fetchedRange;
    }

    if (!isTimeRangeWithinTimeRange(requestNavigatorRange, fullRange)) {
        return cacheState.fetchedRange;
    }

    return buildNavigatorPrefetchRange(requestNavigatorRange, fullRange);
}

function buildNavigatorPrefetchRange(
    requestNavigatorRange: TimeRangeMs,
    fullRange: TimeRangeMs,
): TimeRangeMs {
    const sNavigatorWidth = getTimeRangeWidth(requestNavigatorRange);
    if (!Number.isFinite(sNavigatorWidth) || sNavigatorWidth <= 0) {
        return requestNavigatorRange;
    }

    const sPrefetchRange = createTimeRangeMs(
        requestNavigatorRange.startTime - sNavigatorWidth * NAVIGATOR_PREFETCH_SIDE_FACTOR,
        requestNavigatorRange.endTime + sNavigatorWidth * NAVIGATOR_PREFETCH_SIDE_FACTOR,
    );

    return isValidTimeRange(fullRange)
        ? clampTimeRangeToBounds(sPrefetchRange, fullRange)
        : sPrefetchRange;
}

type ResolveMainPanelFetchRangeParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    loadConfig: PanelChartDataLoadConfig;
    requestInterval: IntervalOption;
    reuseKey: string | undefined;
    cacheState: MainFetchCacheState;
};

function resolveMainPanelFetchRange({
    requestPanelRange,
    requestNavigatorRange,
    loadConfig,
    requestInterval,
    reuseKey,
    cacheState,
}: ResolveMainPanelFetchRangeParams): TimeRangeMs {
    if (!reuseKey) {
        return requestPanelRange;
    }

    if (
        cacheState.fetchedRange &&
        cacheState.reuseKey === reuseKey &&
        isTimeRangeWithinTimeRange(requestPanelRange, cacheState.fetchedRange)
    ) {
        return cacheState.fetchedRange;
    }

    if (loadConfig.isRaw) {
        return requestNavigatorRange;
    }

    return resolveSafeCalculatedPrefetchRange({
        requestPanelRange,
        requestNavigatorRange,
        requestInterval,
    });
}

type ResolveSafeCalculatedPrefetchRangeParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    requestInterval: IntervalOption;
};

function resolveSafeCalculatedPrefetchRange({
    requestPanelRange,
    requestNavigatorRange,
    requestInterval,
}: ResolveSafeCalculatedPrefetchRangeParams): TimeRangeMs {
    const sRequestPrediction = predictCalculatedRowCount(
        requestPanelRange,
        requestInterval,
    );

    if (sRequestPrediction > CALCULATED_FETCH_ROW_BUDGET) {
        return requestPanelRange;
    }

    const sPrefetchRange = buildPanelPrefetchRange(
        requestPanelRange,
        requestNavigatorRange,
    );

    if (
        predictCalculatedRowCount(sPrefetchRange, requestInterval) <=
        CALCULATED_FETCH_ROW_BUDGET
    ) {
        return sPrefetchRange;
    }

    return shrinkPrefetchRangeToPredictedRowBudget(
        requestPanelRange,
        sPrefetchRange,
        requestInterval,
    );
}

function predictCalculatedRowCount(
    range: TimeRangeMs,
    interval: IntervalOption,
): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sRangeWidth = getTimeRangeWidth(range);

    if (sIntervalMs <= 0 || sRangeWidth <= 0) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.ceil(sRangeWidth / sIntervalMs);
}

function shrinkPrefetchRangeToPredictedRowBudget(
    requestPanelRange: TimeRangeMs,
    prefetchRange: TimeRangeMs,
    interval: IntervalOption,
): TimeRangeMs {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sRequestWidth = getTimeRangeWidth(requestPanelRange);
    const sMaxPrefetchWidth = sIntervalMs * CALCULATED_FETCH_ROW_BUDGET;
    const sExtraWidthBudget = sMaxPrefetchWidth - sRequestWidth;

    if (sIntervalMs <= 0 || sExtraWidthBudget <= 0) {
        return requestPanelRange;
    }

    const sLeftAvailable = Math.max(
        0,
        requestPanelRange.startTime - prefetchRange.startTime,
    );
    const sRightAvailable = Math.max(
        0,
        prefetchRange.endTime - requestPanelRange.endTime,
    );
    let sLeftPrefetchWidth = Math.min(sLeftAvailable, sExtraWidthBudget / 2);
    const sRightPrefetchWidth = Math.min(
        sRightAvailable,
        sExtraWidthBudget - sLeftPrefetchWidth,
    );
    sLeftPrefetchWidth = Math.min(
        sLeftAvailable,
        sExtraWidthBudget - sRightPrefetchWidth,
    );

    return createTimeRangeMs(
        requestPanelRange.startTime - sLeftPrefetchWidth,
        requestPanelRange.endTime + sRightPrefetchWidth,
    );
}

function buildPanelPrefetchRange(
    requestPanelRange: TimeRangeMs,
    requestNavigatorRange: TimeRangeMs,
): TimeRangeMs {
    if (isValidTimeRange(requestNavigatorRange)) {
        return requestNavigatorRange;
    }

    const sPanelWidth = getTimeRangeWidth(requestPanelRange);
    if (!Number.isFinite(sPanelWidth) || sPanelWidth <= 0) {
        return requestPanelRange;
    }

    return createTimeRangeMs(
        requestPanelRange.startTime - sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
        requestPanelRange.endTime + sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
    );
}


function updateMainFetchCache(
    cacheRef: { current: MainFetchCacheState },
    baseKey: string,
    fetchedRange: TimeRangeMs,
    reuseKey: string | undefined,
    result: FetchPanelSeriesRowsResult,
): void {
    if (!reuseKey || hasFetchLimitReached(result)) {
        cacheRef.current = {
            baseKey,
            fetchedRange: undefined,
            reuseKey: undefined,
        };
        return;
    }

    cacheRef.current = {
        baseKey,
        fetchedRange,
        reuseKey,
    };
}

function updateNavigatorFetchCache(
    cacheRef: { current: NavigatorFetchCacheState },
    baseKey: string,
    fetchedRange: TimeRangeMs,
): void {
    cacheRef.current = {
        baseKey,
        fetchedRange,
    };
}
function hasFetchLimitReached(result: FetchPanelSeriesRowsResult): boolean {
    return result.seriesFetchResults.some(
        ({ isLimitReached }) => isLimitReached === true,
    );
}

function applyFetchedPanelRangeCorrection({
    result,
    rangeState,
    requestPanelRange,
    onRangeStateChange,
}: {
    result: FetchPanelSeriesRowsResult;
    rangeState: PanelRangeState;
    requestPanelRange: TimeRangeMs;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
}): void {
    const sCorrectedPanelRange = resolveFetchedPanelRangeCorrection(
        result,
        requestPanelRange,
    );

    if (!sCorrectedPanelRange) {
        return;
    }

    onRangeStateChange({
        ...rangeState,
        requestPanelRange: sCorrectedPanelRange,
    });
}

function resolveFetchedPanelRangeCorrection(
    result: FetchPanelSeriesRowsResult,
    requestPanelRange: TimeRangeMs,
): TimeRangeMs | undefined {
    if (!shouldRenderFetchedRange(result)) {
        return undefined;
    }

    const sFetchedRowsRange = getFetchedRowsRange(result);
    if (
        !sFetchedRowsRange ||
        isSameTimeRange(sFetchedRowsRange, requestPanelRange)
    ) {
        return undefined;
    }

    return sFetchedRowsRange;
}

function resolveVisibleDisplayResult(
    result: FetchPanelSeriesRowsResult | undefined,
    requestPanelRange: TimeRangeMs,
): FetchPanelSeriesRowsResult | undefined {
    if (!result || !isValidTimeRange(requestPanelRange)) {
        return result;
    }

    return {
        ...result,
        seriesFetchResults: result.seriesFetchResults.map((seriesResult) => ({
            ...seriesResult,
            fetchResult: {
                ...seriesResult.fetchResult,
                data: seriesResult.fetchResult.data
                    ? {
                          ...seriesResult.fetchResult.data,
                          rows: (seriesResult.fetchResult.data.rows ?? []).filter((row) => {
                              const sTimestamp = Number(row[0]);

                              return (
                                  Number.isFinite(sTimestamp) &&
                                  sTimestamp >= requestPanelRange.startTime &&
                                  sTimestamp <= requestPanelRange.endTime
                              );
                          }),
                      }
                    : seriesResult.fetchResult.data,
            },
        })),
    };
}

function buildFetchCacheKey(
    variant: 'main' | 'navigator',
    config: PanelChartDataLoadConfig,
    range: TimeRangeMs,
    chartWidth: number,
    seriesKey: string,
    rollupKey: string,
    refreshVersion: number,
): string {
    const sShared = {
        queryLimit: config.queryLimit,
        intervalType: config.intervalType,
        isRaw: config.isRaw,
        rawPixelsPerTick: config.xAxis.rawDataPixelsPerTick,
        chartWidth,
        series: seriesKey,
        rollups: rollupKey,
        refreshVersion,
    };

    return JSON.stringify(
        variant === 'main'
            ? {
                  ...sShared,
                  useOrderBy: config.useOrderBy,
                  calculatedPixelsPerTick: config.xAxis.calculatedDataPixelsPerTick,
                  mainChartSampling: config.mainChartSampling,
                  requestPanelRange: range,
              }
            : {
                  ...sShared,
                  navigatorPixelsPerTick: config.xAxis.calculatedNavigatorPixelsPerTick,
                  requestNavigatorRange: range,
              },
    );
}

function assertResolvedInterval(result: FetchPanelSeriesRowsResult): void {
    if (!hasResolvedIntervalOption(result.interval)) {
        throw new Error('Main panel fetch returned an invalid interval.');
    }
}

function resolveDisplayNavigatorRange(
    displayPanelRange: TimeRangeMs,
    requestNavigatorRange: TimeRangeMs,
    chartAreaWidth: number | undefined,
): TimeRangeMs {
    if (!isValidTimeRange(displayPanelRange) || !isValidTimeRange(requestNavigatorRange)) {
        return requestNavigatorRange;
    }

    const sNavigatorTrackPixelWidth =
        chartAreaWidth !== undefined && chartAreaWidth > 0
            ? getNavigatorTrackWidth(chartAreaWidth)
            : undefined;

    return resolveNavigatorRangeForPanel(
        displayPanelRange,
        requestNavigatorRange,
        sNavigatorTrackPixelWidth,
    );
}

function resolveDisplayPanelRange(
    result: FetchPanelSeriesRowsResult | undefined,
    fallbackRange: TimeRangeMs,
): TimeRangeMs {
    if (!shouldRenderFetchedRange(result)) {
        return fallbackRange;
    }

    return getFetchedRowsRange(result) ?? fallbackRange;
}

function shouldRenderFetchedRange(
    result: FetchPanelSeriesRowsResult | undefined,
): result is FetchPanelSeriesRowsResult {
    return (
        result?.isRaw === true &&
        result.seriesFetchResults.some(
            ({ isLimitReached }) => isLimitReached === true,
        )
    );
}

function getFetchedRowsRange(
    result: FetchPanelSeriesRowsResult,
): TimeRangeMs | undefined {
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult } of result.seriesFetchResults) {
        for (const row of fetchResult.data?.rows ?? []) {
            const sTimestamp = Number(row[0]);

            if (!Number.isFinite(sTimestamp)) {
                continue;
            }

            sStartTime = Math.min(sStartTime, sTimestamp);
            sEndTime = Math.max(sEndTime, sTimestamp);
        }
    }

    if (!Number.isFinite(sStartTime) || !Number.isFinite(sEndTime)) {
        return undefined;
    }

    return ensureMinimumTimeRangeWidth(
        createTimeRangeMs(sStartTime, sEndTime),
        MIN_DISPLAY_DATA_RANGE_WIDTH,
    );
}

function handleMainLimitReached(
    result: FetchPanelSeriesRowsResult,
): void {
    const sIsLimitReached = result.seriesFetchResults.some(
        ({ isLimitReached }) => isLimitReached === true,
    );
    if (!sIsLimitReached) return;
    Toast.warning('Only limit amount was displayed.', undefined);
}

type UsePanelSeriesFetchTask = {
    fetchFn: () => Promise<FetchPanelSeriesRowsResult | undefined>;
    validate?: (result: FetchPanelSeriesRowsResult) => void;
    onSuccess?: (result: FetchPanelSeriesRowsResult) => void;
};

type UsePanelSeriesFetchParams = UsePanelSeriesFetchTask & {
    canFetch: boolean;
    cacheKey: string;
};

function usePanelSeriesFetch({
    canFetch,
    cacheKey,
    fetchFn,
    validate,
    onSuccess,
}: UsePanelSeriesFetchParams): PanelSeriesFetchState {
    const [state, setState] = useState<PanelSeriesFetchState>(INITIAL_FETCH_STATE);
    const requestIdRef = useRef(0);
    const taskRef = useRef<UsePanelSeriesFetchTask>({ fetchFn, validate, onSuccess });
    taskRef.current = { fetchFn, validate, onSuccess };

    useEffect(() => {
        if (!canFetch) {
            requestIdRef.current += 1;
            setState(INITIAL_FETCH_STATE);
            return;
        }

        const sRequestId = ++requestIdRef.current;
        setState({ result: undefined, status: PanelChartLoadStatus.Loading });

        void (async () => {
            try {
                const sResult = await taskRef.current.fetchFn();
                if (sRequestId !== requestIdRef.current) return;
                if (!sResult) throw new Error('Panel fetch did not return a result.');

                taskRef.current.validate?.(sResult);
                setState({ result: sResult, status: PanelChartLoadStatus.Ready });
                taskRef.current.onSuccess?.(sResult);
            } catch (error) {
                if (sRequestId !== requestIdRef.current) return;
                showFetchError(error);
                setState({ result: undefined, status: PanelChartLoadStatus.Failed });
            }
        })();
    }, [canFetch, cacheKey]);

    return state;
}

function showFetchError(error: unknown): void {
    const sWasPresented =
        typeof error === 'object' &&
        error !== null &&
        (error as { tagAnalyzerUserPresented?: unknown }).tagAnalyzerUserPresented === true;

    if (sWasPresented) return;

    Toast.error(
        error instanceof Error && error.message ? error.message : 'Failed to load chart data.',
        undefined,
    );
}
