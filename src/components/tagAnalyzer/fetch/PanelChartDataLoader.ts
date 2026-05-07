import type { ChartData } from '../chart/ChartTypes';
import type { PanelAxes, PanelData, PanelTime } from '../domain/PanelModel';
import type {
    IntervalOption,
    TimeRangeConfig,
    ResolvedTimeRangeMs,
} from '../time/TimeTypes';
import type { FetchPanelDatasetsResult } from './FetchContracts';
import { fetchPanelDatasets } from './helper/PanelChartDatasetFetcher';

const EMPTY_INTERVAL_OPTION = {
    IntervalType: '',
    IntervalValue: 0,
} as const;

export type PanelChartLoadResult = {
    chartData: ChartData;
    rangeOption: IntervalOption;
    overflowRange: ResolvedTimeRangeMs | undefined;
};

export async function loadPanelChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: ResolvedTimeRangeMs | undefined,
    rollupTableList: string[],
): Promise<PanelChartLoadResult> {
    const seriesConfigSet = panelData.tag_set ?? [];
    const fetchResult = seriesConfigSet.length === 0
        ? undefined
        : await fetchPanelDatasets(
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
        );
    if (!fetchResult) {
        return {
            chartData: { datasets: [] },
            rangeOption: EMPTY_INTERVAL_OPTION,
            overflowRange: undefined,
        };
    }

    return {
        chartData: { datasets: fetchResult.datasets },
        rangeOption: fetchResult.interval,
        overflowRange: createPanelOverflowRange(fetchResult),
    };
}

function createPanelOverflowRange(
    fetchResult: FetchPanelDatasetsResult,
): ResolvedTimeRangeMs | undefined {
    if (!fetchResult.hasDataLimit || !fetchResult.datasets[0]?.data?.[0]) {
        return undefined;
    }

    return {
        startTime: fetchResult.datasets[0].data[0][0],
        endTime: fetchResult.limitEnd,
    };
}
