import { getIntervalMs } from '../TagAnalyzerUtils';
import { getSourceTagName } from '../utils/legacy/LegacyConversion';
import type {
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerSeriesConfig,
    TimeRange,
} from '../panel/PanelModel';

// Interval metadata used when overlap loading aligns calculated timestamps.
// Used by TagAnalyzer modal flows to type overlap interval.
export type OverlapInterval = {
    IntervalType: string;
    IntervalValue: number;
};

// One overlap-panel fetch result before the chart state is reassembled.
// Used by TagAnalyzer modal flows to type overlap load result.
export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: TagAnalyzerChartSeriesItem | undefined;
};

/**
 * Converts one overlap fetch result into the chart-series shape used by the overlap chart.
 * @param aTagItem The tag metadata for the overlap series.
 * @param aRows The fetched rows for the overlap series.
 * @param aSeriesStartTime The series-specific start time used to normalize timestamps.
 * @param aIsRaw Whether the overlap series is using raw data.
 * @returns The overlap chart-series item.
 */
export function buildOverlapChartSeries(
    aTagItem: TagAnalyzerSeriesConfig,
    aRows: TagAnalyzerChartRow[] | undefined,
    aSeriesStartTime: number,
    aIsRaw: boolean,
): TagAnalyzerChartSeriesItem {
    return {
        name: buildOverlapSeriesName(aTagItem, aIsRaw),
        data: mapOverlapRows(aRows, aSeriesStartTime),
        yAxis: aTagItem.use_y2 ? 1 : 0,
        marker: {
            symbol: 'circle',
            lineColor: null,
            lineWidth: 1,
        },

        color: undefined,
    };
}

/**
 * Applies a time-shift change to one overlap panel without mutating the rest of the selection.
 * @param aPanelsInfo The current overlap-panel list.
 * @param aPanelKey The panel key to shift.
 * @param aDirection The direction to shift.
 * @param aRange The shift amount in milliseconds.
 * @returns The updated overlap-panel list.
 */
export function shiftOverlapPanels(
    aPanelsInfo: TagAnalyzerOverlapPanelInfo[],
    aPanelKey: string,
    aDirection: '+' | '-',
    aRange: number,
): TagAnalyzerOverlapPanelInfo[] {
    return aPanelsInfo.map((aItem) =>
        aPanelKey === aItem.board.meta.index_key
            ? {
                  ...aItem,
                  start: aDirection === '+' ? aItem.start + aRange : aItem.start - aRange,
              }
            : aItem,
    );
}

/**
 * Splits overlap fetch results into the chart-series list and aligned start-time list.
 * @param aResults The ordered overlap load results.
 * @returns The chart data and start times for the overlap chart.
 */
export function buildOverlapLoadState(aResults: OverlapLoadResult[]): {
    chartSeries: TagAnalyzerChartSeriesItem[];
    startTimes: number[];
} {
    const sChartSeriesList: TagAnalyzerChartSeriesItem[] = [];
    const sStartTimes: number[] = [];

    aResults.forEach((aResult) => {
        if (typeof aResult.startTime === 'number') {
            sStartTimes.push(aResult.startTime);
        }
        if (aResult.chartSeries) {
            sChartSeriesList.push(aResult.chartSeries);
        }
    });

    return {
        chartSeries: sChartSeriesList,
        startTimes: sStartTimes,
    };
}

/**
 * Builds the overlap fetch window from the panel start time and anchor duration.
 * @param aPanelInfo The overlap-panel info being fetched.
 * @param aAnchorDuration The duration supplied by the anchor panel.
 * @returns The time range to fetch for the overlap panel.
 */
export function resolveOverlapTimeRange(
    aPanelInfo: TagAnalyzerOverlapPanelInfo,
    aAnchorDuration: number,
): TimeRange {
    return {
        startTime: aPanelInfo.start,
        endTime: aPanelInfo.start + aAnchorDuration,
    };
}

/**
 * Calculates the overlap fetch count from the current chart width and panel density settings.
 * @param aLimit The stored panel limit, when one exists.
 * @param aPanelInfo The overlap-panel info being fetched.
 * @param aChartWidth The measured overlap chart width.
 * @returns The row count for the overlap fetch.
 */
export function calculateOverlapSampleCount(
    aLimit: number,
    aPanelInfo: TagAnalyzerOverlapPanelInfo,
    aChartWidth: number,
): number {
    if (aLimit >= 0) {
        return -1;
    }

    const sPixelsPerTick = aPanelInfo.isRaw
        ? aPanelInfo.board.axes.pixels_per_tick_raw
        : aPanelInfo.board.axes.pixels_per_tick;

    return sPixelsPerTick > 0 ? Math.ceil(aChartWidth / sPixelsPerTick) : Math.ceil(aChartWidth);
}

/**
 * Aligns overlap fetch bounds to the calculated interval when sampling is interval-based.
 * @param aTime The timestamp to align.
 * @param aInterval The interval driving the overlap fetch.
 * @returns The aligned timestamp for the overlap request.
 */
export function alignOverlapTime(aTime: number, aInterval: OverlapInterval): number {
    const sIntervalMs = getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue);

    if (sIntervalMs <= 0) {
        return aTime;
    }

    return Math.floor(aTime / sIntervalMs) * sIntervalMs;
}

/**
 * Builds the overlap-series display label shown in the comparison chart.
 * @param aTagItem The source series config for the overlap line.
 * @param aIsRaw Whether the overlap line is using raw data.
 * @returns The overlap-series label.
 */
export function buildOverlapSeriesName(aTagItem: TagAnalyzerSeriesConfig, aIsRaw: boolean): string {
    return (
        aTagItem.alias ||
        `${getSourceTagName(aTagItem)}(${aIsRaw ? 'raw' : aTagItem.calculationMode.toLowerCase()})`
    );
}

/**
 * Normalizes overlap rows so every compared series starts at zero on the shared chart axis.
 * @param aRows The fetched overlap rows.
 * @param aSeriesStartTime The series-specific time origin for the overlap chart.
 * @returns The normalized overlap rows.
 */
export function mapOverlapRows(
    aRows: TagAnalyzerChartRow[] | undefined,
    aSeriesStartTime: number,
): TagAnalyzerChartRow[] {
    return aRows?.map(([aTimestamp, aValue]) => [aTimestamp - aSeriesStartTime, aValue]) ?? [];
}
