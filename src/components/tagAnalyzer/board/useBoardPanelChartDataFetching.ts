import { useRef } from 'react';
import { Toast } from '@/design-system/components';
import {
    buildChartSeriesData,
    mapRowsToChartData,
    type ChartSeriesData,
} from '../domain/ChartDomain';
import type { PanelInfo } from '../domain/PanelDomain';
import type { TimeRangeMs, IntervalOption } from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
} from '../fetch/PanelSeriesDataRepository';
import type {
    FetchPanelSeriesRowsResult,
    PanelSeriesFetchResult,
} from '../fetch/FetchContracts';
import {
    PanelChartLoadStatus,
    type BoardPanelRecord,
    type PanelChartDataLoadConfig,
    type PanelChartDataState,
    type PanelDataRefreshResult,
    type PanelRangeApplyOptions,
} from './BoardPanelState';

type MainPanelSeriesLoadResult = {
    chartData: ChartData;
    resolvedIntervalOption: IntervalOption;
    isLimitReached?: boolean | undefined;
    limitedDataRange?: TimeRangeMs | undefined;
};

type NavigatorPanelSeriesLoadResult = {
    chartData: ChartData;
};

type ChartData = {
    datasets: ChartSeriesData[];
};

type LimitedQueryResultAnalysis = {
    isLimitReached: boolean;
    limitedDataRange?: TimeRangeMs | undefined;
};

const EMPTY_INTERVAL_OPTION = {
    IntervalType: '',
    IntervalValue: 0,
} as const;

function showLimitReachedWarning(): void {
    Toast.warning('Only limit amount was displayed.', undefined);
}

function getChartLoadErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
        ? error.message
        : 'Failed to load chart data.';
}

function wasChartLoadErrorPresented(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { tagAnalyzerUserPresented?: unknown }).tagAnalyzerUserPresented === true
    );
}

function getPanelLoadConfig(
    panelInfo: PanelInfo,
    loadConfigOverride?: Partial<PanelChartDataLoadConfig>,
): PanelChartDataLoadConfig {
    return {
        seriesList: panelInfo.data.tag_set,
        queryLimit: panelInfo.data.count,
        intervalType: panelInfo.data.interval_type,
        isRaw: panelInfo.toolbar.isRaw,
        xAxis: panelInfo.axes.x_axis,
        navigatorSampling: panelInfo.axes.sampling,
        mainChartSampling: panelInfo.axes.main_chart_sampling,
        ...loadConfigOverride,
    };
}

function getMainDataLoadConfig(
    loadConfig: PanelChartDataLoadConfig,
    forceRawSampling: boolean,
): PanelChartDataLoadConfig {
    if (!forceRawSampling || !loadConfig.isRaw) {
        return loadConfig;
    }

    return {
        ...loadConfig,
        mainChartSampling: {
            enabled: true,
            sample_count:
                loadConfig.mainChartSampling.sample_count ||
                loadConfig.navigatorSampling.sample_count,
        },
    };
}

async function loadMainPanelSeriesChartData(
    loadConfig: PanelChartDataLoadConfig,
    chartWidth: number,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<MainPanelSeriesLoadResult> {
    const sFetchResult = await fetchMainPanelSeriesRows(
        loadConfig.seriesList,
        loadConfig.queryLimit,
        loadConfig.intervalType,
        loadConfig.xAxis,
        loadConfig.mainChartSampling,
        chartWidth,
        loadConfig.isRaw,
        timeRange,
        rollupTableList,
    );

    if (!sFetchResult) {
        return {
            chartData: { datasets: [] },
            resolvedIntervalOption: EMPTY_INTERVAL_OPTION,
        };
    }

    const sLimitAnalysis = analyzeLimitedQueryResult(
        sFetchResult.seriesFetchResults,
    );

    return {
        chartData: mapPanelSeriesRowsToChartData(sFetchResult),
        resolvedIntervalOption: sFetchResult.interval,
        ...(sLimitAnalysis.isLimitReached
            ? { isLimitReached: true }
            : {}),
        ...(sLimitAnalysis.limitedDataRange
            ? { limitedDataRange: sLimitAnalysis.limitedDataRange }
            : {}),
    };
}

async function loadNavigatorPanelSeriesChartData(
    loadConfig: PanelChartDataLoadConfig,
    chartWidth: number,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<NavigatorPanelSeriesLoadResult> {
    const sFetchResult = await fetchNavigatorPanelSeriesRows(
        loadConfig.seriesList,
        loadConfig.queryLimit,
        loadConfig.intervalType,
        loadConfig.xAxis,
        loadConfig.navigatorSampling,
        chartWidth,
        loadConfig.isRaw,
        timeRange,
        rollupTableList,
    );

    return {
        chartData: mapPanelSeriesRowsToChartData(sFetchResult),
    };
}

function mapPanelSeriesRowsToChartData(
    fetchResult: FetchPanelSeriesRowsResult | undefined,
): ChartData {
    if (!fetchResult) {
        return { datasets: [] };
    }

    const datasets = fetchResult.seriesFetchResults.map(
        ({ seriesConfig, fetchResult: seriesFetchResult }) =>
            buildChartSeriesData(
                seriesConfig,
                mapRowsToChartData(seriesFetchResult?.data?.rows),
                fetchResult.isRaw,
            ),
    );

    return { datasets: datasets };
}

function analyzeLimitedQueryResult(
    seriesFetchResults: PanelSeriesFetchResult[],
): LimitedQueryResultAnalysis {
    let sIsLimitReached = false;
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult, isLimitReached } of seriesFetchResults) {
        if (!isLimitReached) {
            continue;
        }

        sIsLimitReached = true;
        const rows = fetchResult?.data?.rows ?? [];
        for (const row of rows) {
            const sTimestamp = Number(row[0]);
            if (!Number.isFinite(sTimestamp)) {
                continue;
            }

            sStartTime = Math.min(sStartTime, sTimestamp);
            sEndTime = Math.max(sEndTime, sTimestamp);
        }
    }

    const sLimitedDataRange =
        !Number.isFinite(sStartTime) ||
        !Number.isFinite(sEndTime) ||
        sEndTime <= sStartTime
            ? undefined
            : {
                  startTime: sStartTime,
                  endTime: sEndTime,
              };

    return {
        isLimitReached: sIsLimitReached,
        ...(sLimitedDataRange
            ? { limitedDataRange: sLimitedDataRange }
            : {}),
    };
}

export function useBoardPanelChartDataFetching({
    rollupTableList,
    getBoardPanelRecord,
    getChartLoadWidth,
    normalizeNavigatorRangeForVisiblePanel,
    updateChartDataState,
    setChartLoadStatus,
    setNavigatorLoadStatus,
}: {
    rollupTableList: string[];
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    getChartLoadWidth: (panelKey: string) => number;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
    updateChartDataState: (
        panelKey: string,
        patch: Partial<PanelChartDataState>,
    ) => void;
    setChartLoadStatus: (
        panelKey: string,
        chartLoadStatus: PanelChartLoadStatus,
    ) => void;
    setNavigatorLoadStatus: (
        panelKey: string,
        navigatorLoadStatus: PanelChartLoadStatus,
    ) => void;
}) {
    const panelLoadRequestIdByKeyRef = useRef<Record<string, number>>({});
    const navigatorLoadRequestIdByKeyRef = useRef<Record<string, number>>({});

    async function loadPanelData(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange,
            dataLoadConfigOverride,
            reloadNavigatorData = false,
            preserveNavigatorRange = false,
            forceRawMainSampling = false,
        }: PanelRangeApplyOptions,
    ): Promise<PanelDataRefreshResult> {
        const sPanelKey = panelInfo.meta.index_key;
        const sLoadConfig = getPanelLoadConfig(panelInfo, dataLoadConfigOverride);
        const sRequestId = (panelLoadRequestIdByKeyRef.current[sPanelKey] ?? 0) + 1;
        let sNavigatorLoadStarted = false;
        let sNavigatorRequestId: number | undefined;

        panelLoadRequestIdByKeyRef.current = {
            ...panelLoadRequestIdByKeyRef.current,
            [sPanelKey]: sRequestId,
        };
        setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Loading);

        try {
            const sRequestedNavigatorRange = navigatorRange ?? panelRange;
            const sMainLoadConfig = getMainDataLoadConfig(
                sLoadConfig,
                forceRawMainSampling,
            );
            const sLoadState = await loadMainPanelSeriesChartData(
                sMainLoadConfig,
                getChartLoadWidth(sPanelKey),
                panelRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdByKeyRef.current[sPanelKey]) {
                return {
                    isStale: true,
                };
            }

            const sLimitedDataRange = isConcreteTimeRange(sLoadState.limitedDataRange)
                ? sLoadState.limitedDataRange
                : undefined;
            const sAppliedPanelRange = preserveNavigatorRange
                ? panelRange
                : sLimitedDataRange ?? panelRange;
            const sAppliedNavigatorRange = preserveNavigatorRange
                ? sRequestedNavigatorRange
                : normalizeNavigatorRangeForVisiblePanel(
                      sPanelKey,
                      sAppliedPanelRange,
                      sRequestedNavigatorRange,
                  );
            const sShouldFetchNavigator =
                reloadNavigatorData &&
                !isSameTimeRange(sAppliedNavigatorRange, sAppliedPanelRange);
            if (sShouldFetchNavigator) {
                sNavigatorLoadStarted = true;
                sNavigatorRequestId =
                    (navigatorLoadRequestIdByKeyRef.current[sPanelKey] ?? 0) + 1;
                navigatorLoadRequestIdByKeyRef.current = {
                    ...navigatorLoadRequestIdByKeyRef.current,
                    [sPanelKey]: sNavigatorRequestId,
                };
                setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Loading);
            }
            const sNavigatorLoadState = sShouldFetchNavigator
                ? await loadNavigatorPanelSeriesChartData(
                      sLoadConfig,
                      getChartLoadWidth(sPanelKey),
                      sAppliedNavigatorRange,
                      rollupTableList,
                  )
                : { chartData: sLoadState.chartData };

            if (sRequestId !== panelLoadRequestIdByKeyRef.current[sPanelKey]) {
                if (
                    sNavigatorLoadStarted &&
                    sNavigatorRequestId === navigatorLoadRequestIdByKeyRef.current[sPanelKey]
                ) {
                    setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);
                }
                return {
                    isStale: true,
                };
            }

            if (sLoadState.isLimitReached) {
                showLimitReachedWarning();
            }

            updateChartDataState(sPanelKey, {
                chartData: sLoadState.chartData.datasets,
                ...(reloadNavigatorData
                    ? {
                          navigatorChartData: sNavigatorLoadState.chartData.datasets,
                          loadedNavigatorRange: sAppliedNavigatorRange,
                      }
                    : {}),
                resolvedIntervalOption: hasResolvedIntervalOption(
                    sLoadState.resolvedIntervalOption,
                )
                    ? sLoadState.resolvedIntervalOption
                    : hasResolvedIntervalOption(
                            getBoardPanelRecord(sPanelKey).chartDataState.resolvedIntervalOption,
                        )
                      ? getBoardPanelRecord(sPanelKey).chartDataState.resolvedIntervalOption
                      : sLoadState.resolvedIntervalOption,
                loadedDataRange: sAppliedPanelRange,
            });
            setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);
            if (
                sNavigatorLoadStarted &&
                sNavigatorRequestId === navigatorLoadRequestIdByKeyRef.current[sPanelKey]
            ) {
                setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);
            }

            return {
                isStale: false,
                panelRange: sAppliedPanelRange,
                navigatorRange: sAppliedNavigatorRange,
            };
        } catch (error) {
            if (sRequestId !== panelLoadRequestIdByKeyRef.current[sPanelKey]) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Failed);
            if (
                sNavigatorLoadStarted &&
                sNavigatorRequestId === navigatorLoadRequestIdByKeyRef.current[sPanelKey]
            ) {
                setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Failed);
            }

            return {
                isStale: false,
            };
        }
    }

    async function loadNavigatorData(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange,
            dataLoadConfigOverride,
        }: PanelRangeApplyOptions,
    ): Promise<PanelDataRefreshResult> {
        const sPanelKey = panelInfo.meta.index_key;
        const sLoadConfig = getPanelLoadConfig(panelInfo, dataLoadConfigOverride);
        const sRequestedNavigatorRange = navigatorRange ?? panelRange;
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelKey,
            panelRange,
            sRequestedNavigatorRange,
        );
        const sRequestId = (panelLoadRequestIdByKeyRef.current[sPanelKey] ?? 0) + 1;
        const sNavigatorRequestId =
            (navigatorLoadRequestIdByKeyRef.current[sPanelKey] ?? 0) + 1;

        panelLoadRequestIdByKeyRef.current = {
            ...panelLoadRequestIdByKeyRef.current,
            [sPanelKey]: sRequestId,
        };
        navigatorLoadRequestIdByKeyRef.current = {
            ...navigatorLoadRequestIdByKeyRef.current,
            [sPanelKey]: sNavigatorRequestId,
        };
        setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Loading);

        try {
            const sLoadState = await loadNavigatorPanelSeriesChartData(
                sLoadConfig,
                getChartLoadWidth(sPanelKey),
                sNavigatorRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdByKeyRef.current[sPanelKey]) {
                if (
                    sNavigatorRequestId ===
                    navigatorLoadRequestIdByKeyRef.current[sPanelKey]
                ) {
                    setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);
                }
                return {
                    isStale: true,
                };
            }

            updateChartDataState(sPanelKey, {
                navigatorChartData: sLoadState.chartData.datasets,
                loadedNavigatorRange: sNavigatorRange,
            });
            if (
                sNavigatorRequestId ===
                navigatorLoadRequestIdByKeyRef.current[sPanelKey]
            ) {
                setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);
            }

            return {
                isStale: false,
                navigatorRange: sNavigatorRange,
            };
        } catch (error) {
            if (sRequestId !== panelLoadRequestIdByKeyRef.current[sPanelKey]) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            if (
                sNavigatorRequestId ===
                navigatorLoadRequestIdByKeyRef.current[sPanelKey]
            ) {
                setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Failed);
            }

            return {
                isStale: false,
            };
        }
    }

    return {
        loadPanelData,
        loadNavigatorData,
    };
}
