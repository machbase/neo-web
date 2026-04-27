import type { ChartData } from '../series/PanelSeriesTypes';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../time/types/TimeTypes';
import type {
    FetchPanelDatasetsResult,
    PanelChartLoadState,
} from './FetchTypes';
import { fetchPanelDatasets } from './PanelChartDatasetFetcher';

const EMPTY_INTERVAL_OPTION = {
    IntervalType: '',
    IntervalValue: 0,
} as const;

export async function loadNavigatorChartState(
    panelData: PanelData,
    panelTime: PanelTime,
    panelAxes: PanelAxes,
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
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
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
    rollupTableList: string[],
): Promise<PanelChartLoadState> {
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
    boardTime: InputTimeBounds,
    chartWidth: number,
    isRaw: boolean,
    timeRange: TimeRangeMs | undefined,
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
): TimeRangeMs | undefined {
    if (!fetchResult.hasDataLimit || !fetchResult.datasets[0]?.data?.[0]) {
        return undefined;
    }

    return {
        startTime: fetchResult.datasets[0].data[0][0],
        endTime: fetchResult.limitEnd,
    };
}
