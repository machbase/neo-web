import type { ChartData } from '../chart/ChartTypes';
import type { PanelAxes, PanelData, PanelTime } from '../PanelModelTypes';
import type {
    IntervalOption,
    TimeRangeConfig,
    ResolvedTimeRangeMs,
} from '../time/TimeTypes';
import type { FetchPanelDatasetsResult } from './FetchTypes';
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

export async function loadNavigatorChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: ResolvedTimeRangeMs | undefined,
    rollupTableList: string[],
): Promise<ChartData> {
    const fetchResult = await loadPanelDatasets(
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        panelAxes.sampling.enabled,
        false,
        true,
    );
    if (!fetchResult) {
        return { datasets: [] };
    }

    return { datasets: fetchResult.datasets };
}
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
    const fetchResult = await loadPanelDatasets(
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        false,
        true,
        undefined,
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

async function loadPanelDatasets(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: TimeRangeConfig | undefined,
    chartWidth: number,
    isRaw: boolean,
    timeRange: ResolvedTimeRangeMs | undefined,
    rollupTableList: string[],
    useSampling: boolean,
    includeColor: boolean,
    isNavigator: boolean | undefined,
): Promise<FetchPanelDatasetsResult | undefined> {
    const seriesConfigSet = panelData.tag_set ?? [];
    if (seriesConfigSet.length === 0) {
        return undefined;
    }

    return fetchPanelDatasets(
        seriesConfigSet,
        panelData,
        panelTime,
        panelAxes,
        boardTime,
        chartWidth,
        isRaw,
        timeRange,
        rollupTableList,
        useSampling,
        includeColor,
        isNavigator,
    );
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
