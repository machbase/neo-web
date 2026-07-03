import { useMemo, useRef } from 'react';
import { type ChartSeriesData } from '../domain/ChartDomain';
import { mapFetchResultToChartData } from '../fetch/panelData/mapFetchResultToChartData';
import {
    type PanelDisplayRangeState,
    type PanelRangeState,
} from '../domain/panel/PanelInfo';
import {
    getPanelSeriesDisplayName,
    hasNumericBaseTimeSeries,
} from '../domain/SeriesDomain';
import type { IntervalOption } from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    RAW_MAIN_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
    resolveNumericCalculatedIntervalForRange,
    resolvePanelFetchInterval,
} from '../fetch/panelData/PanelSeriesDataRepository';
import type {
    FetchPanelSeriesRowsResult,
    PanelSeriesRollupStatus,
    RollupTableMap,
} from '../fetch/panelData/PanelDataFetchTypes';
import {
    isReadyToFetch,
    type PanelChartDataLoadConfig,
    resolveChartWidth,
} from './data/panelChartLoadConfig';
import {
    buildFetchCacheKey,
    buildMainFetchBaseKey,
    buildNavigatorFetchBaseKey,
    buildSeriesCacheKey,
    getMainFetchReuseKey,
} from './data/panelFetchCacheKeys';
import {
    updateMainFetchCache,
    updateNavigatorFetchCache,
    type MainFetchCacheState,
    type NavigatorFetchCacheState,
} from './data/panelFetchCacheState';
import {
    getPanelFetchDecisionRange,
    resolvePanelFetchPlan,
} from './data/panelFetchPlan';
import {
    PanelChartLoadStatus,
    usePanelSeriesFetch,
} from './data/panelFetchState';
import {
    applyFetchedPanelRangeCorrection,
    createPanelDisplayRangeState,
    resolveDisplayPanelRange,
    resolveInvalidRangeDisplayNotice,
    resolveNavigatorRangeWithPixelWidth,
    resolvePanelDisplayNotice,
    type PanelDisplayNotice,
} from './data/panelDisplayData';
import {
    showPanelFetchLimitToast,
    showSeriesAvailabilityToast,
} from './data/panelFetchResultStatus';

type UsePanelChartDataRuntimeParams = {
    loadConfig: PanelChartDataLoadConfig;
    isActive: boolean;
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    rollupTableList: RollupTableMap;
    dataRefreshVersion: number;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
};

type UsePanelChartDataRuntimeResult = {
    mainChartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    displayRangeState: PanelDisplayRangeState;
    resolvedIntervalOption: IntervalOption | undefined;
    resolvedNumericInterval: number | undefined;
    seriesRollupStatusList: PanelSeriesRollupStatus[];
    mainChartQueryCount: number | undefined;
    navigatorChartQueryCount: number | undefined;
    displayNotice: PanelDisplayNotice | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
};

export function usePanelChartDataRuntime({
    loadConfig,
    isActive,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRangeStateChange,
}: UsePanelChartDataRuntimeParams): UsePanelChartDataRuntimeResult {
    const sChartWidth = resolveChartWidth(chartAreaWidth);
    const sIsDefaultNavigatorRange = rangeState.requestNavigatorRangeInput === undefined;
    const sRequestNavigatorRange = rangeState.requestNavigatorRange;
    const sRequestPanelRange = rangeState.requestPanelRange;
    const sNavigatorRange = resolveNavigatorRangeWithPixelWidth(
        sRequestPanelRange,
        sRequestNavigatorRange,
        chartAreaWidth,
    );
    const sCanFetch = isActive && isReadyToFetch({
        chartAreaWidth,
        panelRange: sRequestPanelRange,
        navigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
    });
    const sSeriesKey = buildSeriesCacheKey(loadConfig.seriesList);
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
            loadConfig.isRaw
                ? undefined
                : resolvePanelFetchInterval(
                      loadConfig.intervalType,
                      loadConfig.xAxis,
                      sRequestPanelRange,
                      sChartWidth,
                  ),
        [
            sRequestPanelRange,
            sChartWidth,
            loadConfig.intervalType,
            loadConfig.xAxis,
            loadConfig.isRaw,
        ],
    );
    const sRequestPanelNumericInterval = useMemo(
        () =>
            !loadConfig.isRaw && hasNumericBaseTimeSeries(loadConfig.seriesList)
                ? resolveNumericCalculatedIntervalForRange(sRequestPanelRange)
                : undefined,
        [
            loadConfig.isRaw,
            loadConfig.seriesList,
            sRequestPanelRange,
        ],
    );
    const sMainFetchReuseKey = getMainFetchReuseKey(
        loadConfig,
        sRequestPanelInterval,
        sRequestPanelNumericInterval,
    );
    const sMainBaseKey = buildMainFetchBaseKey(
        loadConfig,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
        sMainFetchReuseKey,
    );
    if (sMainFetchCacheRef.current.baseKey !== sMainBaseKey) {
        sMainFetchCacheRef.current = {
            baseKey: sMainBaseKey,
            fetchedRange: undefined,
            reuseKey: undefined,
        };
    }

    const sNavigatorBaseKey = buildNavigatorFetchBaseKey(
        loadConfig,
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
        loadConfig,
        requestInterval: sRequestPanelInterval,
        mainReuseKey: sMainFetchReuseKey,
        mainCacheState: sMainFetchCacheRef.current,
        navigatorCacheState: sNavigatorFetchCacheRef.current,
    });
    const sMainFetchRange = getPanelFetchDecisionRange(sFetchPlan.main);
    const sNavigatorFetchRange = getPanelFetchDecisionRange(sFetchPlan.navigator);
    const sMainKey = buildFetchCacheKey(
        'main',
        loadConfig,
        sMainFetchRange,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
        sMainFetchReuseKey,
    );
    const sNavigatorKey = buildFetchCacheKey(
        'navigator',
        loadConfig,
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
                loadConfig.seriesList,
                loadConfig.isRaw ? RAW_MAIN_SAMPLE_COUNT : loadConfig.queryLimit,
                loadConfig.intervalType,
                loadConfig.xAxis,
                loadConfig.mainChartSampling,
                sChartWidth,
                loadConfig.isRaw,
                loadConfig.useOrderBy,
                sMainFetchRange,
                sRequestPanelInterval,
                rollupTableList,
                sRequestPanelRange,
            ),
        validate: assertResolvedInterval,
        onSuccess: (result) => {
            showPanelFetchLimitToast(result);
            showSeriesAvailabilityToast(result);
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
                loadConfig.seriesList,
                loadConfig.queryLimit,
                loadConfig.intervalType,
                loadConfig.xAxis,
                sChartWidth,
                loadConfig.isRaw,
                sNavigatorFetchRange,
                loadConfig.rawNavigatorSampling,
                rollupTableList,
            ),
        onSuccess: (result) => {
            updateNavigatorFetchCache(
                sNavigatorFetchCacheRef,
                sNavigatorBaseKey,
                sNavigatorFetchRange,
                result,
            );
        },
    });

    const sMainChartData = useMemo(
        () => mapFetchResultToChartData(sMainFetch.result),
        [sMainFetch.result],
    );
    const sNavigatorChartData = useMemo(
        () => mapFetchResultToChartData(sNavigatorFetch.result),
        [sNavigatorFetch.result],
    );
    const sSeriesRollupStatusList = useMemo(
        () => buildSeriesRollupStatusList(sMainFetch.result),
        [sMainFetch.result],
    );
    const sDisplayPanelRange = useMemo(
        () =>
            resolveDisplayPanelRange(
                sMainFetch.result,
                sRequestPanelRange,
            ),
        [sMainFetch.result, sRequestPanelRange],
    );
    const sDisplayNotice = useMemo(
        () =>
            resolvePanelDisplayNotice(sMainFetch.result) ??
            resolveInvalidRangeDisplayNotice({
                canFetch: sCanFetch,
                loadConfig,
                rangeState,
            }),
        [sCanFetch, loadConfig, sMainFetch.result, rangeState],
    );
    const sDisplayNavigatorRange = useMemo(
        () =>
            resolveNavigatorRangeWithPixelWidth(
                sDisplayPanelRange,
                sNavigatorRange,
                chartAreaWidth,
            ),
        [chartAreaWidth, sDisplayPanelRange, sNavigatorRange],
    );
    const sDisplayRangeState = useMemo<PanelDisplayRangeState>(
        () => createPanelDisplayRangeState(
            sDisplayPanelRange,
            sDisplayNavigatorRange,
            sIsDefaultNavigatorRange,
        ),
        [sDisplayPanelRange, sDisplayNavigatorRange, sIsDefaultNavigatorRange],
    );

    return {
        mainChartData: sMainChartData,
        navigatorChartData: sNavigatorChartData,
        displayRangeState: sDisplayRangeState,
        resolvedIntervalOption: sMainFetch.result?.interval,
        resolvedNumericInterval: sMainFetch.result?.numericInterval,
        seriesRollupStatusList: sSeriesRollupStatusList,
        mainChartQueryCount: sMainFetch.result?.count,
        navigatorChartQueryCount: sNavigatorFetch.result?.count,
        displayNotice: sDisplayNotice,
        loadStatus: {
            chart: sMainFetch.status,
            navigator: sNavigatorFetch.status,
        },
    };
}

function buildSeriesRollupStatusList(
    result: FetchPanelSeriesRowsResult | undefined,
): PanelSeriesRollupStatus[] {
    if (!result) {
        return [];
    }

    return result.seriesFetchResults.map(({ seriesConfig, usesRollup }) => ({
        seriesName: getPanelSeriesDisplayName(seriesConfig),
        usesRollup,
    }));
}

function assertResolvedInterval(result: FetchPanelSeriesRowsResult): void {
    if (result.isRaw) {
        return;
    }

    if (!hasResolvedIntervalOption(result.interval)) {
        throw new Error('Main panel fetch returned an invalid interval.');
    }
}
