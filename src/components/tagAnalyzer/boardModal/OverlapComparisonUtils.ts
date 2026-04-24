import { getIntervalMs } from '../utils/time/IntervalUtils';
import type { ChartRow, ChartSeriesItem } from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type {
    OverlapPanelInfo,
    OverlapShiftDirection,
    OverlapSelectionChangePayload,
} from '../utils/boardTypes';
import type { OverlapInterval, OverlapLoadResult } from './BoardModalTypes';

/**
 * Applies a time-shift change to one overlap panel without mutating the rest of the selection.
 * Intent: Keep overlap adjustments isolated to the targeted panel row.
 * @param {OverlapPanelInfo[]} aPanelsInfo The current overlap-panel list.
 * @param {string} aPanelKey The panel key to shift.
 * @param {OverlapShiftDirection} aDirection The direction to shift.
 * @param {number} aRange The shift amount in milliseconds.
 * @returns {OverlapPanelInfo[]} The updated overlap-panel list.
 */
export function shiftOverlapPanels(
    aPanelsInfo: OverlapPanelInfo[],
    aPanelKey: string,
    aDirection: OverlapShiftDirection,
    aRange: number,
): OverlapPanelInfo[] {
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
 * Intent: Preserve the loaded result order while separating chart data from start times.
 * @param {OverlapLoadResult[]} aResults The ordered overlap load results.
 * @returns {{ chartSeries: ChartSeriesItem[]; startTimes: number[] }} The chart data and start times for the overlap chart.
 */
export function buildOverlapLoadState(aResults: OverlapLoadResult[]): {
    chartSeries: ChartSeriesItem[];
    startTimes: number[];
} {
    const sChartSeriesList: ChartSeriesItem[] = [];
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
 * Intent: Derive the comparison window from the panel start time and the anchor duration.
 * @param {OverlapPanelInfo} aPanelInfo The overlap-panel info being fetched.
 * @param {number} aAnchorDuration The duration supplied by the anchor panel.
 * @returns {TimeRangeMs} The time range to fetch for the overlap panel.
 */
export function resolveOverlapTimeRange(
    aPanelInfo: OverlapPanelInfo,
    aAnchorDuration: number,
): TimeRangeMs {
    return {
        startTime: aPanelInfo.start,
        endTime: aPanelInfo.start + aAnchorDuration,
    };
}

/**
 * Aligns overlap fetch bounds to the calculated interval when sampling is interval-based.
 * Intent: Snap overlap fetch timestamps to the same interval grid used by the overlap chart.
 * @param {number} aTime The timestamp to align.
 * @param {OverlapInterval} aInterval The interval driving the overlap fetch.
 * @returns {number} The aligned timestamp for the overlap request.
 */
export function alignOverlapTime(aTime: number, aInterval: OverlapInterval): number {
    const sIntervalMs = getIntervalMs(aInterval.IntervalType, aInterval.IntervalValue);

    if (sIntervalMs <= 0) {
        return aTime;
    }

    return Math.floor(aTime / sIntervalMs) * sIntervalMs;
}

/**
 * Normalizes overlap rows so every compared series starts at zero on the shared chart axis.
 * Intent: Rebase each series to its own origin before plotting them together.
 * @param {ChartRow[] | undefined} aRows The fetched overlap rows.
 * @param {number} aSeriesStartTime The series-specific time origin for the overlap chart.
 * @returns {ChartRow[]} The normalized overlap rows.
 */
export function mapOverlapRows(
    aRows: ChartRow[] | undefined,
    aSeriesStartTime: number,
): ChartRow[] {
    return aRows?.map(([aTimestamp, aValue]) => [aTimestamp - aSeriesStartTime, aValue]) ?? [];
}

/**
 * Returns the next overlap-panel selection list after applying the requested change.
 * Intent: Apply overlap selection changes without mutating the existing panel array in place.
 * @param {OverlapPanelInfo[]} aPanels The current overlap-panel selection list.
 * @param {OverlapSelectionChangePayload} aPayload The overlap-selection payload that should be applied.
 * @returns {OverlapPanelInfo[]} The next overlap-panel selection list.
 */
export function getNextOverlapPanels(
    aPanels: OverlapPanelInfo[],
    aPayload: OverlapSelectionChangePayload,
): OverlapPanelInfo[] {
    const { start, end, panel, isRaw, changeType } = aPayload;
    const sPanelKey = panel.meta.index_key;
    const sDuration = end - start;

    if (changeType === 'delete') {
        const sNextPanels = aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === aPanels.length ? aPanels : sNextPanels;
    }

    if (changeType === 'changed') {
        const sExistingPanel = aPanels.find((aItem) => aItem.board.meta.index_key === sPanelKey);
        if (!sExistingPanel) {
            return aPanels;
        }

        if (
            sExistingPanel.isRaw === isRaw &&
            sExistingPanel.start === start &&
            sExistingPanel.duration === sDuration
        ) {
            return aPanels;
        }

        return aPanels.map((aItem) =>
            aItem.board.meta.index_key === sPanelKey
                ? { ...aItem, isRaw, start, duration: sDuration }
                : aItem,
        );
    }

    if (aPanels.some((aItem) => aItem.board.meta.index_key === sPanelKey)) {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    return [...aPanels, { start, duration: sDuration, isRaw, board: panel }];
}
