import type { ChartData } from '../chart/ChartTypes';
import type { PanelAxes, PanelData, PanelTime } from '../domain/PanelModel';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../time/TimeTypes';
import { fetchPanelDatasets } from './helper/PanelChartDatasetFetcher';

const EMPTY_INTERVAL_OPTION = {
    IntervalType: '',
    IntervalValue: 0,
} as const;

export type PanelChartLoadResult = {
    chartData: ChartData;
    rangeOption: IntervalOption;
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
        };
    }

    return {
        chartData: { datasets: fetchResult.datasets },
        rangeOption: fetchResult.interval,
    };
}
