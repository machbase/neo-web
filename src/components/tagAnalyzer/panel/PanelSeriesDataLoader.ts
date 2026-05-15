import type {
    PanelAxes,
    PanelData,
} from '../domain/PanelModel';
import type { ChartData } from '../domain/ChartDataModel';
import {
    buildChartSeriesData,
    mapRowsToChartData,
} from '../chart/ChartSeriesMapper';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import {
    resolvePanelSeriesFetchPlan,
    type PanelDatasetLoadPurpose,
} from '../domain/PanelSeriesFetchPlan';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import type {
    FetchPanelSeriesRowsResult,
    PanelSeriesFetchResult,
} from '../fetch/FetchContracts';
import {
    fetchPanelSeriesRows,
} from '../fetch/PanelSeriesDataRepository';

const EMPTY_INTERVAL_OPTION = {
    IntervalType: '',
    IntervalValue: 0,
} as const;

export type PanelChartLoadResult = {
    chartData: ChartData;
    rangeOption: IntervalOption;
    isLimitReached?: boolean | undefined;
    limitedDataRange?: TimeRangeMs | undefined;
};

type LimitedQueryResultAnalysis = {
    isLimitReached: boolean;
    limitedDataRange?: TimeRangeMs | undefined;
};

type LoadPanelChartDataRequest = {
    seriesConfigSet: PanelSeriesDefinition[];
    panelData: PanelData;
    panelAxes: PanelAxes;
    chartWidth: number;
    requestedRawMode: boolean;
    timeRange: TimeRangeMs;
    rollupTableList: string[];
    loadPurpose?: PanelDatasetLoadPurpose | undefined;
};

export async function loadPanelChartData({
    seriesConfigSet,
    panelData,
    panelAxes,
    chartWidth,
    requestedRawMode,
    timeRange,
    rollupTableList,
    loadPurpose = 'main',
}: LoadPanelChartDataRequest): Promise<PanelChartLoadResult> {
    const sFetchPlan =
        seriesConfigSet.length === 0
            ? undefined
            : resolvePanelSeriesFetchPlan({
                  panelData: panelData,
                  panelAxes: panelAxes,
                  chartWidth: chartWidth,
                  requestedRawMode: requestedRawMode,
                  timeRange: timeRange,
                  loadPurpose: loadPurpose,
              });
    const sFetchResult = sFetchPlan
        ? {
              seriesFetchResults: await fetchPanelSeriesRows({
                  seriesConfigSet: seriesConfigSet,
                  timeRange: sFetchPlan.timeRange,
                  interval: sFetchPlan.interval,
                  count: sFetchPlan.count,
                  isRaw: sFetchPlan.isRaw,
                  useSampling: sFetchPlan.useRawSampling,
                  sampleCount: sFetchPlan.sampleCount,
                  rollupTableList: rollupTableList,
              }),
              interval: sFetchPlan.interval,
              count: sFetchPlan.count,
              isRaw: sFetchPlan.isRaw,
          }
        : undefined;

    return mapPanelSeriesRowsToChartLoadResult(sFetchResult, loadPurpose);
}

function mapPanelSeriesRowsToChartLoadResult(
    fetchResult: FetchPanelSeriesRowsResult | undefined,
    loadPurpose: PanelDatasetLoadPurpose,
): PanelChartLoadResult {
    if (!fetchResult) {
        return {
            chartData: { datasets: [] },
            rangeOption: EMPTY_INTERVAL_OPTION,
        };
    }

    const sLimitAnalysis = loadPurpose === 'main'
        ? analyzeLimitedQueryResult(
              fetchResult.seriesFetchResults,
              fetchResult.count,
          )
        : undefined;
    const datasets = fetchResult.seriesFetchResults.map(
        ({ seriesConfig, fetchResult: seriesFetchResult }) =>
            buildChartSeriesData(
                seriesConfig,
                mapRowsToChartData(seriesFetchResult?.data?.rows),
                fetchResult.isRaw,
            ),
    );

    return {
        chartData: { datasets: datasets },
        rangeOption: fetchResult.interval,
        ...(sLimitAnalysis?.isLimitReached
            ? { isLimitReached: true }
            : {}),
        ...(sLimitAnalysis?.limitedDataRange
            ? { limitedDataRange: sLimitAnalysis.limitedDataRange }
            : {}),
    };
}

function analyzeLimitedQueryResult(
    seriesFetchResults: PanelSeriesFetchResult[],
    count: number,
): LimitedQueryResultAnalysis {
    if (count <= 0) {
        return { isLimitReached: false };
    }

    let sIsLimitReached = false;
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult } of seriesFetchResults) {
        const rows = fetchResult?.data?.rows ?? [];
        if (rows.length !== count) {
            continue;
        }

        sIsLimitReached = true;
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


