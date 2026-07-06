import { useMemo, useRef } from 'react';
import { type ChartSeriesData } from '../domain/ChartDomain';
import { mapFetchResultToChartData } from '../fetch/panelData/mapFetchResultToChartData';
import {
    type PanelDisplayRangeState,
    type PanelRangeState,
} from '../domain/panel/PanelInfo';
import type { IntervalOption } from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    RAW_MAIN_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
    resolvePanelFetchInterval,
} from '../fetch/panelData/PanelSeriesDataRepository';
import type {
    FetchPanelSeriesRowsResult,
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
            resolvePanelFetchInterval(
                loadConfig.intervalType,
                loadConfig.xAxis,
                sRequestPanelRange,
                sChartWidth,
                loadConfig.isRaw,
            ),
        [
            sRequestPanelRange,
            sChartWidth,
            loadConfig.intervalType,
            loadConfig.xAxis,
            loadConfig.isRaw,
        ],
    );
    const sMainFetchReuseKey = getMainFetchReuseKey(
        loadConfig,
        sRequestPanelInterval,
    );
    const sMainBaseKey = buildMainFetchBaseKey(
        loadConfig,
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
                rollupTableList,
                loadConfig.isRaw ? undefined : sRequestPanelInterval,
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
        displayNotice: sDisplayNotice,
        loadStatus: {
            chart: sMainFetch.status,
            navigator: sNavigatorFetch.status,
        },
    };
}

function assertResolvedInterval(result: FetchPanelSeriesRowsResult): void {
    if (!hasResolvedIntervalOption(result.interval)) {
        throw new Error('Main panel fetch returned an invalid interval.');
    }
}
