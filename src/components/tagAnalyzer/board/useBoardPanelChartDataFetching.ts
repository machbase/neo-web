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
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
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
    type PanelMainDataRefreshResult,
    type PanelRangeApplyOptions,
} from './BoardPanelState';

type MainPanelSeriesLoadResult = {
    chartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption;
    isLimitReached?: boolean | undefined;
    limitedDataRange?: TimeRangeMs | undefined;
};

type NavigatorPanelSeriesLoadResult = {
    chartData: ChartSeriesData[];
};

type LimitedQueryResultAnalysis = {
    isLimitReached: boolean;
    limitedDataRange?: TimeRangeMs | undefined;
};

type AppliedPanelLoadRanges = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

type NavigatorDataFromMainPanelOptions = {
    chartData: ChartSeriesData[];
    navigatorRange: TimeRangeMs;
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

function applyRawMainSamplingOverride(
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
            chartData: [],
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
): ChartSeriesData[] {
    if (!fetchResult) {
        return [];
    }

    return fetchResult.seriesFetchResults.map(
        ({ seriesConfig, fetchResult: seriesFetchResult }) =>
            buildChartSeriesData(
                seriesConfig,
                mapRowsToChartData(seriesFetchResult?.data?.rows),
                fetchResult.isRaw,
            ),
    );
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

function getConcreteLimitedDataRange(
    loadState: MainPanelSeriesLoadResult,
): TimeRangeMs | undefined {
    return isConcreteTimeRange(loadState.limitedDataRange)
        ? loadState.limitedDataRange
        : undefined;
}

function getAppliedPanelLoadRanges({
    panelKey,
    panelRange,
    requestedNavigatorRange,
    preserveNavigatorRange,
    limitedDataRange,
    normalizeNavigatorRangeForVisiblePanel,
}: {
    panelKey: string;
    panelRange: TimeRangeMs;
    requestedNavigatorRange: TimeRangeMs;
    preserveNavigatorRange: boolean;
    limitedDataRange: TimeRangeMs | undefined;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
}): AppliedPanelLoadRanges {
    const sPanelRange = preserveNavigatorRange
        ? panelRange
        : limitedDataRange ?? panelRange;

    return {
        panelRange: sPanelRange,
        navigatorRange: preserveNavigatorRange
            ? requestedNavigatorRange
            : normalizeNavigatorRangeForVisiblePanel(
                  panelKey,
                  sPanelRange,
                  requestedNavigatorRange,
              ),
    };
}

function getResolvedPanelIntervalOption(
    loadedIntervalOption: IntervalOption,
    currentIntervalOption: IntervalOption | undefined,
): IntervalOption {
    if (hasResolvedIntervalOption(loadedIntervalOption)) {
        return loadedIntervalOption;
    }

    return hasResolvedIntervalOption(currentIntervalOption)
        ? currentIntervalOption
        : loadedIntervalOption;
}

function getPanelDataStatePatch({
    mainLoadState,
    appliedRanges,
    currentIntervalOption,
}: {
    mainLoadState: MainPanelSeriesLoadResult;
    appliedRanges: AppliedPanelLoadRanges;
    currentIntervalOption: IntervalOption | undefined;
}): Partial<PanelChartDataState> {
    return {
        chartData: mainLoadState.chartData,
        resolvedIntervalOption: getResolvedPanelIntervalOption(
            mainLoadState.resolvedIntervalOption,
            currentIntervalOption,
        ),
        loadedDataRange: appliedRanges.panelRange,
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

    function startPanelLoadRequest(panelKey: string): number {
        const sRequestId = (panelLoadRequestIdByKeyRef.current[panelKey] ?? 0) + 1;

        panelLoadRequestIdByKeyRef.current = {
            ...panelLoadRequestIdByKeyRef.current,
            [panelKey]: sRequestId,
        };

        return sRequestId;
    }

    function isCurrentPanelLoadRequest(
        panelKey: string,
        requestId: number,
    ): boolean {
        return requestId === panelLoadRequestIdByKeyRef.current[panelKey];
    }

    function startNavigatorLoadRequest(panelKey: string): number {
        const sRequestId =
            (navigatorLoadRequestIdByKeyRef.current[panelKey] ?? 0) + 1;

        navigatorLoadRequestIdByKeyRef.current = {
            ...navigatorLoadRequestIdByKeyRef.current,
            [panelKey]: sRequestId,
        };

        return sRequestId;
    }

    function setNavigatorLoadStatusIfCurrent(
        panelKey: string,
        requestId: number | undefined,
        navigatorLoadStatus: PanelChartLoadStatus,
    ): void {
        if (
            requestId !== undefined &&
            requestId === navigatorLoadRequestIdByKeyRef.current[panelKey]
        ) {
            setNavigatorLoadStatus(panelKey, navigatorLoadStatus);
        }
    }

    function commitPanelLoadResult(
        panelKey: string,
        mainLoadState: MainPanelSeriesLoadResult,
        appliedRanges: AppliedPanelLoadRanges,
    ): void {
        if (mainLoadState.isLimitReached) {
            showLimitReachedWarning();
        }

        updateChartDataState(
            panelKey,
            getPanelDataStatePatch({
                mainLoadState,
                appliedRanges,
                currentIntervalOption:
                    getBoardPanelRecord(panelKey).chartDataState
                        .resolvedIntervalOption,
            }),
        );
    }

    async function loadMainPanelData(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange,
            dataLoadConfigOverride,
            preserveNavigatorRange = false,
            forceRawMainSampling = false,
        }: PanelRangeApplyOptions,
    ): Promise<PanelMainDataRefreshResult> {
        const sPanelKey = panelInfo.meta.index_key;
        const sLoadConfig = getPanelLoadConfig(panelInfo, dataLoadConfigOverride);
        const sRequestId = startPanelLoadRequest(sPanelKey);

        setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Loading);

        try {
            const sRequestedNavigatorRange = navigatorRange ?? panelRange;
            const sMainLoadState = await loadMainPanelSeriesChartData(
                applyRawMainSamplingOverride(
                    sLoadConfig,
                    forceRawMainSampling,
                ),
                getChartLoadWidth(sPanelKey),
                panelRange,
                rollupTableList,
            );

            if (!isCurrentPanelLoadRequest(sPanelKey, sRequestId)) {
                return {
                    isStale: true,
                };
            }

            const sAppliedRanges = getAppliedPanelLoadRanges({
                panelKey: sPanelKey,
                panelRange,
                requestedNavigatorRange: sRequestedNavigatorRange,
                preserveNavigatorRange,
                limitedDataRange: getConcreteLimitedDataRange(sMainLoadState),
                normalizeNavigatorRangeForVisiblePanel,
            });

            commitPanelLoadResult(
                sPanelKey,
                sMainLoadState,
                sAppliedRanges,
            );
            setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Ready);

            return {
                isStale: false,
                panelRange: sAppliedRanges.panelRange,
                navigatorRange: sAppliedRanges.navigatorRange,
                chartData: sMainLoadState.chartData,
            };
        } catch (error) {
            if (!isCurrentPanelLoadRequest(sPanelKey, sRequestId)) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            setChartLoadStatus(sPanelKey, PanelChartLoadStatus.Failed);

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
        const sRequestId = startPanelLoadRequest(sPanelKey);
        const sNavigatorRequestId = startNavigatorLoadRequest(sPanelKey);

        setNavigatorLoadStatus(sPanelKey, PanelChartLoadStatus.Loading);

        try {
            const sLoadState = await loadNavigatorPanelSeriesChartData(
                sLoadConfig,
                getChartLoadWidth(sPanelKey),
                sNavigatorRange,
                rollupTableList,
            );

            if (!isCurrentPanelLoadRequest(sPanelKey, sRequestId)) {
                setNavigatorLoadStatusIfCurrent(
                    sPanelKey,
                    sNavigatorRequestId,
                    PanelChartLoadStatus.Ready,
                );
                return {
                    isStale: true,
                };
            }

            updateChartDataState(sPanelKey, {
                navigatorChartData: sLoadState.chartData,
                loadedNavigatorRange: sNavigatorRange,
            });
            setNavigatorLoadStatusIfCurrent(
                sPanelKey,
                sNavigatorRequestId,
                PanelChartLoadStatus.Ready,
            );

            return {
                isStale: false,
                navigatorRange: sNavigatorRange,
            };
        } catch (error) {
            if (!isCurrentPanelLoadRequest(sPanelKey, sRequestId)) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            setNavigatorLoadStatusIfCurrent(
                sPanelKey,
                sNavigatorRequestId,
                PanelChartLoadStatus.Failed,
            );

            return {
                isStale: false,
            };
        }
    }

    function commitNavigatorDataFromMainPanelData(
        panelInfo: PanelInfo,
        {
            chartData,
            navigatorRange,
        }: NavigatorDataFromMainPanelOptions,
    ): PanelDataRefreshResult {
        updateChartDataState(panelInfo.meta.index_key, {
            navigatorChartData: chartData,
            loadedNavigatorRange: navigatorRange,
        });

        return {
            isStale: false,
            navigatorRange,
        };
    }

    return {
        loadMainPanelData,
        loadNavigatorData,
        commitNavigatorDataFromMainPanelData,
    };
}
