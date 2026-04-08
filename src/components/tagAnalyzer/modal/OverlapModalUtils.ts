import { getIntervalMs } from '../TagAnalyzerUtils';
import { getSourceTagName } from '../TagAnalyzerSeriesNaming';
import type {
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';

export type OverlapInterval = {
    IntervalType: string;
    IntervalValue: number;
};

export type OverlapLoadResult = {
    startTime?: number;
    chartSeries?: TagAnalyzerChartSeriesItem;
};

export const alignOverlapTime = (aTime: number, aInterval: OverlapInterval) => {
    const sIntervalMs = getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue);

    if (sIntervalMs <= 0) {
        return aTime;
    }

    return Math.floor(aTime / sIntervalMs) * sIntervalMs;
};

export const calculateOverlapSampleCount = (
    aLimit: number,
    aPanelInfo: TagAnalyzerOverlapPanelInfo,
    aChartWidth: number,
) => {
    if (aLimit >= 0) {
        return -1;
    }

    const sPixelsPerTick = aPanelInfo.isRaw ? aPanelInfo.board.axes.pixels_per_tick_raw : aPanelInfo.board.axes.pixels_per_tick;

    return sPixelsPerTick > 0 ? Math.ceil(aChartWidth / sPixelsPerTick) : Math.ceil(aChartWidth);
};

export const resolveOverlapTimeRange = (
    aPanelInfo: TagAnalyzerOverlapPanelInfo,
    aAnchorDuration: number,
): TagAnalyzerTimeRange => ({
    startTime: aPanelInfo.start,
    endTime: aPanelInfo.start + aAnchorDuration,
});

export const buildOverlapSeriesName = (
    aTagItem: TagAnalyzerTagItem,
    aIsRaw: boolean,
) => aTagItem.alias || `${getSourceTagName(aTagItem)}(${aIsRaw ? 'raw' : aTagItem.calculationMode.toLowerCase()})`;

export const mapOverlapRows = (
    aRows: TagAnalyzerChartRow[] | undefined,
    aSeriesStartTime: number,
): TagAnalyzerChartRow[] => {
    return aRows?.map(([aTimestamp, aValue]) => [aTimestamp - aSeriesStartTime, aValue]) ?? [];
};

export const buildOverlapChartSeries = ({
    tagItem,
    rows,
    seriesStartTime,
    isRaw,
}: {
    tagItem: TagAnalyzerTagItem;
    rows: TagAnalyzerChartRow[] | undefined;
    seriesStartTime: number;
    isRaw: boolean;
}): TagAnalyzerChartSeriesItem => ({
    name: buildOverlapSeriesName(tagItem, isRaw),
    data: mapOverlapRows(rows, seriesStartTime),
    yAxis: tagItem.use_y2 === 'Y' ? 1 : 0,
    marker: {
        symbol: 'circle',
        lineColor: null,
        lineWidth: 1,
    },
});
