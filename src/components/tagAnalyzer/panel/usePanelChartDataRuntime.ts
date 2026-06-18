import { useEffect, useMemo, useRef, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    buildChartSeriesData,
    mapRowsToChartData,
    type ChartRow,
    type ChartSeriesData,
} from '../domain/ChartDomain';
import {
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelSampling,
    type RuntimePanelXAxis,
} from '../domain/PanelDomain';
import type { IntervalOption, TimeRangeMs } from '../domain/time/model/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/interval/TimeIntervalUtils';
import {
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    isSameTimeRange,
    isValidTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import {
    RAW_NAVIGATOR_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
} from '../fetch/PanelSeriesDataRepository';
import {
    hasNumericBaseTimeSeries,
    type PanelSeriesDefinition,
} from '../domain/SeriesDomain';
import type { PanelRangeChangeOptions } from '../board/BoardPanelState';
import type { FetchPanelSeriesRowsResult } from '../fetch/FetchContracts';

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
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    rollupTableList: string[];
    dataRefreshVersion: number;
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ) => void;
};

type UsePanelChartDataRuntimeResult = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
};

type MainRowsState = {
    seriesRows: ChartRow[][];
    resolvedIntervalOption: IntervalOption | undefined;
    isRaw: boolean;
};

type NavigatorRowsState = {
    seriesRows: ChartRow[][];
    isRaw: boolean;
};

const INITIAL_MAIN_ROWS_STATE: MainRowsState = {
    seriesRows: [],
    resolvedIntervalOption: undefined,
    isRaw: false,
};
const INITIAL_NAVIGATOR_ROWS_STATE: NavigatorRowsState = {
    seriesRows: [],
    isRaw: false,
};
const MIN_QUERIED_DATA_RANGE_WIDTH = 1;

export function usePanelChartDataRuntime({
    panelInfo,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRangeStateChange,
}: UsePanelChartDataRuntimeParams): UsePanelChartDataRuntimeResult {
    const sCanFetch =
        chartAreaWidth !== undefined &&
        isValidTimeRange(rangeState.panelRange) &&
        isValidTimeRange(rangeState.navigatorRange) &&
        isValidTimeRange(rangeState.fullRange);
    const sPanelXAxis = panelInfo.axes.x_axis;
    const sMainChartSampling = panelInfo.axes.main_chart_sampling;
    const sLoadConfig = useMemo<PanelChartDataLoadConfig>(
        () => {
            if (
                sMainChartSampling.enabled &&
                sMainChartSampling.sample_count === undefined
            ) {
                throw new Error(
                    'main chart sampling requires a sample count when enabled.',
                );
            }

            return {
                seriesList: panelInfo.data.tag_set,
                queryLimit: panelInfo.data.count ?? -1,
                intervalType: panelInfo.data.interval_type,
                isRaw: panelInfo.general.is_raw,
                useOrderBy: panelInfo.general.is_raw
                    ? panelInfo.general.is_order_by
                    : true,
                xAxis: {
                    show_tickline: false,
                    raw_data_pixels_per_tick:
                        sPanelXAxis.raw_data_pixels_per_tick ?? 0,
                    calculated_data_pixels_per_tick:
                        sPanelXAxis.calculated_data_pixels_per_tick ?? 0,
                    calculated_navigator_pixels_per_tick:
                        sPanelXAxis.calculated_navigator_pixels_per_tick ?? 0,
                },
                mainChartSampling: {
                    enabled: sMainChartSampling.enabled,
                    sample_count: sMainChartSampling.sample_count ?? 0,
                },
            };
        },
        [
            panelInfo.data.count,
            panelInfo.data.interval_type,
            panelInfo.data.tag_set,
            panelInfo.general.is_order_by,
            panelInfo.general.is_raw,
            sMainChartSampling.enabled,
            sMainChartSampling.sample_count,
            sPanelXAxis.calculated_data_pixels_per_tick,
            sPanelXAxis.calculated_navigator_pixels_per_tick,
            sPanelXAxis.raw_data_pixels_per_tick,
        ],
    );
    const sChartWidth =
        typeof chartAreaWidth === 'number' && chartAreaWidth > 0
            ? chartAreaWidth
            : 1;
    const sNavigatorDataRange = hasNumericBaseTimeSeries(sLoadConfig.seriesList)
        ? rangeState.navigatorRange
        : rangeState.fullRange;
    const sSeriesFetchKey = useMemo(
        () =>
            JSON.stringify(
                sLoadConfig.seriesList.map((series) => ({
                    table: series.table,
                    sourceTagName: series.sourceTagName,
                    calculationMode: series.calculationMode,
                    useRollupTable: series.useRollupTable,
                    sourceColumns: series.sourceColumns,
                })),
            ),
        [sLoadConfig.seriesList],
    );
    const sRollupTableList = useMemo(
        () => (Array.isArray(rollupTableList) ? rollupTableList : []),
        [rollupTableList],
    );
    const sRollupListKey = useMemo(
        () => JSON.stringify([...sRollupTableList].sort()),
        [sRollupTableList],
    );
    const sPanelRangeKey = `${rangeState.panelRange.startTime}:${rangeState.panelRange.endTime}`;
    const sNavigatorRangeKey = `${sNavigatorDataRange.startTime}:${sNavigatorDataRange.endTime}`;
    const sMainConfigKey = useMemo(
        () =>
            JSON.stringify({
                queryLimit: sLoadConfig.queryLimit,
                intervalType: sLoadConfig.intervalType,
                isRaw: sLoadConfig.isRaw,
                useOrderBy: sLoadConfig.useOrderBy,
                rawDataPixelsPerTick: sLoadConfig.xAxis.raw_data_pixels_per_tick,
                calculatedDataPixelsPerTick:
                    sLoadConfig.xAxis.calculated_data_pixels_per_tick,
                mainChartSampling: sLoadConfig.mainChartSampling,
            }),
        [
            sLoadConfig.intervalType,
            sLoadConfig.isRaw,
            sLoadConfig.mainChartSampling,
            sLoadConfig.queryLimit,
            sLoadConfig.useOrderBy,
            sLoadConfig.xAxis.calculated_data_pixels_per_tick,
            sLoadConfig.xAxis.raw_data_pixels_per_tick,
        ],
    );
    const sNavigatorConfigKey = useMemo(
        () =>
            JSON.stringify({
                queryLimit: sLoadConfig.queryLimit,
                intervalType: sLoadConfig.intervalType,
                isRaw: sLoadConfig.isRaw,
                rawDataPixelsPerTick: sLoadConfig.xAxis.raw_data_pixels_per_tick,
                calculatedNavigatorPixelsPerTick:
                    sLoadConfig.xAxis.calculated_navigator_pixels_per_tick,
            }),
        [
            sLoadConfig.intervalType,
            sLoadConfig.isRaw,
            sLoadConfig.queryLimit,
            sLoadConfig.xAxis.calculated_navigator_pixels_per_tick,
            sLoadConfig.xAxis.raw_data_pixels_per_tick,
        ],
    );
    const sMainData = useMainPanelData({
        canFetch: sCanFetch,
        loadConfig: sLoadConfig,
        chartWidth: sChartWidth,
        panelRange: rangeState.panelRange,
        panelRangeKey: sPanelRangeKey,
        seriesFetchKey: sSeriesFetchKey,
        configKey: sMainConfigKey,
        rollupListKey: sRollupListKey,
        rollupTableList: sRollupTableList,
        dataRefreshVersion,
        rangeState,
        onRangeStateChange,
    });
    const sNavigatorData = useNavigatorPanelData({
        canFetch: sCanFetch,
        loadConfig: sLoadConfig,
        chartWidth: sChartWidth,
        navigatorDataRange: sNavigatorDataRange,
        navigatorRangeKey: sNavigatorRangeKey,
        seriesFetchKey: sSeriesFetchKey,
        configKey: sNavigatorConfigKey,
        rollupListKey: sRollupListKey,
        rollupTableList: sRollupTableList,
        dataRefreshVersion,
    });
    const sChartData = useMemo(
        () =>
            mapSeriesRowsToChartData(
                sMainData.seriesRows,
                panelInfo.data.tag_set,
                sMainData.isRaw,
            ),
        [panelInfo.data.tag_set, sMainData.isRaw, sMainData.seriesRows],
    );
    const sNavigatorChartData = useMemo(
        () =>
            mapSeriesRowsToChartData(
                sNavigatorData.seriesRows,
                panelInfo.data.tag_set,
                sNavigatorData.isRaw,
            ),
        [
            panelInfo.data.tag_set,
            sNavigatorData.isRaw,
            sNavigatorData.seriesRows,
        ],
    );

    return {
        chartData: sChartData,
        navigatorChartData: sNavigatorChartData,
        resolvedIntervalOption: sMainData.resolvedIntervalOption,
        loadStatus: {
            chart: sMainData.loadStatus,
            navigator: sNavigatorData.loadStatus,
        },
    };
}

function useMainPanelData({
    canFetch,
    chartWidth,
    configKey,
    dataRefreshVersion,
    loadConfig,
    panelRange,
    panelRangeKey,
    rangeState,
    rollupListKey,
    rollupTableList,
    seriesFetchKey,
    onRangeStateChange,
}: {
    canFetch: boolean;
    loadConfig: PanelChartDataLoadConfig;
    chartWidth: number;
    panelRange: TimeRangeMs;
    panelRangeKey: string;
    seriesFetchKey: string;
    configKey: string;
    rollupListKey: string;
    rollupTableList: string[];
    dataRefreshVersion: number;
    rangeState: PanelRangeState;
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ) => void;
}): {
    seriesRows: ChartRow[][];
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: PanelChartLoadStatus;
    isRaw: boolean;
} {
    const [dataState, setDataState] = useState<MainRowsState>(
        INITIAL_MAIN_ROWS_STATE,
    );
    const [loadStatus, setLoadStatus] = useState<PanelChartLoadStatus>(
        PanelChartLoadStatus.Idle,
    );
    const requestIdRef = useRef(0);
    const rangeStateRef = useRef(rangeState);
    const onRangeStateChangeRef = useRef(onRangeStateChange);

    rangeStateRef.current = rangeState;
    onRangeStateChangeRef.current = onRangeStateChange;

    useEffect(() => {
        if (!canFetch) {
            requestIdRef.current += 1;
            setLoadStatus(PanelChartLoadStatus.Idle);
            return;
        }

        const sRequestId = ++requestIdRef.current;

        setLoadStatus(PanelChartLoadStatus.Loading);

        void (async () => {
            try {
                const sQueryLimit = loadConfig.isRaw
                    ? RAW_NAVIGATOR_SAMPLE_COUNT
                    : loadConfig.queryLimit;
                const sFetchResult = await fetchMainPanelSeriesRows(
                    loadConfig.seriesList,
                    sQueryLimit,
                    loadConfig.intervalType,
                    loadConfig.xAxis,
                    loadConfig.mainChartSampling,
                    chartWidth,
                    loadConfig.isRaw,
                    loadConfig.useOrderBy,
                    panelRange,
                    rollupTableList,
                );

                if (sRequestId !== requestIdRef.current) {
                    return;
                }

                if (!sFetchResult) {
                    throw new Error('Main panel fetch did not return a result.');
                }

                if (!hasResolvedIntervalOption(sFetchResult.interval)) {
                    throw new Error('Main panel fetch returned an invalid interval.');
                }

                const sIsLimitReached = sFetchResult.seriesFetchResults.some(
                    ({ isLimitReached }) => isLimitReached === true,
                );
                let sRangeCorrection: TimeRangeMs | undefined;

                if (loadConfig.isRaw && sIsLimitReached) {
                    let sStartTime = Number.POSITIVE_INFINITY;
                    let sEndTime = Number.NEGATIVE_INFINITY;

                    for (const {
                        fetchResult: sSeriesFetchResult,
                    } of sFetchResult.seriesFetchResults) {
                        for (const row of sSeriesFetchResult?.data?.rows ?? []) {
                            const sTimestamp = Number(row[0]);

                            if (Number.isFinite(sTimestamp)) {
                                sStartTime = Math.min(sStartTime, sTimestamp);
                                sEndTime = Math.max(sEndTime, sTimestamp);
                            }
                        }
                    }

                    if (
                        Number.isFinite(sStartTime) &&
                        Number.isFinite(sEndTime)
                    ) {
                        sRangeCorrection = ensureMinimumTimeRangeWidth(
                            createTimeRangeMs(sStartTime, sEndTime),
                            MIN_QUERIED_DATA_RANGE_WIDTH,
                        );
                    }
                }

                if (sIsLimitReached) {
                    Toast.warning('Only limit amount was displayed.', undefined);
                }

                setDataState({
                    seriesRows: mapFetchResultToSeriesRows(sFetchResult),
                    resolvedIntervalOption: sFetchResult.interval,
                    isRaw: loadConfig.isRaw,
                });
                setLoadStatus(PanelChartLoadStatus.Ready);

                if (sRangeCorrection) {
                    const sCurrentRangeState = rangeStateRef.current;

                    if (
                        !isSameTimeRange(
                            sRangeCorrection,
                            sCurrentRangeState.panelRange,
                        )
                    ) {
                        onRangeStateChangeRef.current({
                            panelRange: sRangeCorrection,
                            navigatorRange: sCurrentRangeState.navigatorRange,
                            fullRange: sCurrentRangeState.fullRange,
                        });
                    }
                }
            } catch (error) {
                if (sRequestId !== requestIdRef.current) {
                    return;
                }

                showFetchError(error);
                setLoadStatus(PanelChartLoadStatus.Failed);
            }
        })();
        // Fetches depend on semantic keys so display-only panel edits do not refetch data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        canFetch,
        chartWidth,
        configKey,
        dataRefreshVersion,
        panelRangeKey,
        rollupListKey,
        seriesFetchKey,
    ]);

    return {
        seriesRows: dataState.seriesRows,
        resolvedIntervalOption: dataState.resolvedIntervalOption,
        loadStatus,
        isRaw: dataState.isRaw,
    };
}

function useNavigatorPanelData({
    canFetch,
    chartWidth,
    configKey,
    dataRefreshVersion,
    loadConfig,
    navigatorDataRange,
    navigatorRangeKey,
    rollupListKey,
    rollupTableList,
    seriesFetchKey,
}: {
    canFetch: boolean;
    loadConfig: PanelChartDataLoadConfig;
    chartWidth: number;
    navigatorDataRange: TimeRangeMs;
    navigatorRangeKey: string;
    seriesFetchKey: string;
    configKey: string;
    rollupListKey: string;
    rollupTableList: string[];
    dataRefreshVersion: number;
}): {
    seriesRows: ChartRow[][];
    loadStatus: PanelChartLoadStatus;
    isRaw: boolean;
} {
    const [dataState, setDataState] = useState<NavigatorRowsState>(
        INITIAL_NAVIGATOR_ROWS_STATE,
    );
    const [loadStatus, setLoadStatus] = useState<PanelChartLoadStatus>(
        PanelChartLoadStatus.Idle,
    );
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!canFetch) {
            requestIdRef.current += 1;
            setLoadStatus(PanelChartLoadStatus.Idle);
            return;
        }

        const sRequestId = ++requestIdRef.current;

        setLoadStatus(PanelChartLoadStatus.Loading);

        void (async () => {
            try {
                const sFetchResult = await fetchNavigatorPanelSeriesRows(
                    loadConfig.seriesList,
                    loadConfig.queryLimit,
                    loadConfig.intervalType,
                    loadConfig.xAxis,
                    chartWidth,
                    loadConfig.isRaw,
                    navigatorDataRange,
                    rollupTableList,
                );

                if (sRequestId !== requestIdRef.current) {
                    return;
                }

                setDataState({
                    seriesRows: mapFetchResultToSeriesRows(sFetchResult),
                    isRaw: loadConfig.isRaw,
                });
                setLoadStatus(PanelChartLoadStatus.Ready);
            } catch (error) {
                if (sRequestId !== requestIdRef.current) {
                    return;
                }

                showFetchError(error);
                setLoadStatus(PanelChartLoadStatus.Failed);
            }
        })();
        // Fetches depend on semantic keys so display-only panel edits do not refetch data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        canFetch,
        chartWidth,
        configKey,
        dataRefreshVersion,
        navigatorRangeKey,
        rollupListKey,
        seriesFetchKey,
    ]);

    return {
        seriesRows: dataState.seriesRows,
        loadStatus,
        isRaw: dataState.isRaw,
    };
}

function showFetchError(error: unknown): void {
    const sWasPresented =
        typeof error === 'object' &&
        error !== null &&
        (error as { tagAnalyzerUserPresented?: unknown }).tagAnalyzerUserPresented === true;

    if (sWasPresented) {
        return;
    }

    Toast.error(
        error instanceof Error && error.message
            ? error.message
            : 'Failed to load chart data.',
        undefined,
    );
}

function mapFetchResultToSeriesRows(
    fetchResult: FetchPanelSeriesRowsResult | undefined,
): ChartRow[][] {
    return fetchResult
        ? fetchResult.seriesFetchResults.map(({ fetchResult: seriesFetchResult }) =>
              mapRowsToChartData(seriesFetchResult?.data?.rows),
          )
        : [];
}

function mapSeriesRowsToChartData(
    seriesRows: ChartRow[][],
    seriesList: PanelSeriesDefinition[],
    isRaw: boolean,
): ChartSeriesData[] {
    return seriesRows.flatMap((rows, index) => {
        const sSeriesConfig = seriesList[index];

        return sSeriesConfig
            ? [buildChartSeriesData(sSeriesConfig, rows, isRaw)]
            : [];
    });
}
