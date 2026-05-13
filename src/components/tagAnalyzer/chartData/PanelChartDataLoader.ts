import type { ChartData } from '../domain/ChartDataModel';
import type { PanelAxes, PanelData, PanelTime } from '../domain/PanelModel';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../time/TimeTypes';
import {
    fetchPanelSeriesRows,
    type PanelDatasetFetchPurpose,
} from '../fetch/helper/PanelChartDatasetFetcher';
import {
    buildChartSeriesData,
    mapRowsToChartData,
} from '../chart/ChartSeriesMapper';
import { analyzeLimitedQueryResult } from './LimitedQueryResultAnalyzer';

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

export async function loadPanelChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
    fetchPurpose: PanelDatasetFetchPurpose = 'main',
): Promise<PanelChartLoadResult> {
    const seriesConfigSet = panelData.tag_set ?? [];
    const fetchResult = seriesConfigSet.length === 0
        ? undefined
        : await fetchPanelSeriesRows(
            seriesConfigSet,
            panelData,
            panelTime,
            panelAxes,
            boardTime,
            chartWidth,
            isRaw,
            timeRange,
            rollupTableList,
            panelAxes.sampling.enabled,
            fetchPurpose,
        );
    if (!fetchResult) {
        return {
            chartData: { datasets: [] },
            rangeOption: EMPTY_INTERVAL_OPTION,
        };
    }

    const sLimitAnalysis = fetchPurpose === 'main'
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
