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
 * @param {OverlapPanelInfo[]} panelsInfo The current overlap-panel list.
 * @param {string} panelKey The panel key to shift.
 * @param {OverlapShiftDirection} direction The direction to shift.
 * @param {number} range The shift amount in milliseconds.
 * @returns {OverlapPanelInfo[]} The updated overlap-panel list.
 */
export function shiftOverlapPanels(
    panelsInfo: OverlapPanelInfo[],
    panelKey: string,
    direction: OverlapShiftDirection,
    range: number,
): OverlapPanelInfo[] {
    return panelsInfo.map((item) =>
        panelKey === item.board.meta.index_key
            ? {
                  ...item,
                  start: direction === '+' ? item.start + range : item.start - range,
              }
            : item,
    );
}

/**
 * Splits overlap fetch results into the chart-series list and aligned start-time list.
 * Intent: Preserve the loaded result order while separating chart data from start times.
 * @param {OverlapLoadResult[]} results The ordered overlap load results.
 * @returns {{ chartSeries: ChartSeriesItem[]; startTimes: number[] }} The chart data and start times for the overlap chart.
 */
export function buildOverlapLoadState(results: OverlapLoadResult[]): {
    chartSeries: ChartSeriesItem[];
    startTimes: number[];
} {
    const sChartSeriesList: ChartSeriesItem[] = [];
    const sStartTimes: number[] = [];

    results.forEach((result) => {
        if (typeof result.startTime === 'number') {
            sStartTimes.push(result.startTime);
        }
        if (result.chartSeries) {
            sChartSeriesList.push(result.chartSeries);
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
 * @param {OverlapPanelInfo} panelInfo The overlap-panel info being fetched.
 * @param {number} anchorDuration The duration supplied by the anchor panel.
 * @returns {TimeRangeMs} The time range to fetch for the overlap panel.
 */
export function resolveOverlapTimeRange(
    panelInfo: OverlapPanelInfo,
    anchorDuration: number,
): TimeRangeMs {
    return {
        startTime: panelInfo.start,
        endTime: panelInfo.start + anchorDuration,
    };
}

/**
 * Aligns overlap fetch bounds to the calculated interval when sampling is interval-based.
 * Intent: Snap overlap fetch timestamps to the same interval grid used by the overlap chart.
 * @param {number} time The timestamp to align.
 * @param {OverlapInterval} interval The interval driving the overlap fetch.
 * @returns {number} The aligned timestamp for the overlap request.
 */
export function alignOverlapTime(time: number, interval: OverlapInterval): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);

    if (sIntervalMs <= 0) {
        return time;
    }

    return Math.floor(time / sIntervalMs) * sIntervalMs;
}

/**
 * Normalizes overlap rows so every compared series starts at zero on the shared chart axis.
 * Intent: Rebase each series to its own origin before plotting them together.
 * @param {ChartRow[] | undefined} rows The fetched overlap rows.
 * @param {number} seriesStartTime The series-specific time origin for the overlap chart.
 * @returns {ChartRow[]} The normalized overlap rows.
 */
export function mapOverlapRows(
    rows: ChartRow[] | undefined,
    seriesStartTime: number,
): ChartRow[] {
    return rows?.map(([aTimestamp, aValue]) => [aTimestamp - seriesStartTime, aValue]) ?? [];
}

/**
 * Returns the next overlap-panel selection list after applying the requested change.
 * Intent: Apply overlap selection changes without mutating the existing panel array in place.
 * @param {OverlapPanelInfo[]} panels The current overlap-panel selection list.
 * @param {OverlapSelectionChangePayload} payload The overlap-selection payload that should be applied.
 * @returns {OverlapPanelInfo[]} The next overlap-panel selection list.
 */
export function getNextOverlapPanels(
    panels: OverlapPanelInfo[],
    payload: OverlapSelectionChangePayload,
): OverlapPanelInfo[] {
    const { start, end, panel, isRaw, changeType } = payload;
    const sPanelKey = panel.meta.index_key;
    const sDuration = end - start;

    if (changeType === 'delete') {
        const sNextPanels = panels.filter((item) => item.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === panels.length ? panels : sNextPanels;
    }

    if (changeType === 'changed') {
        const sExistingPanel = panels.find((item) => item.board.meta.index_key === sPanelKey);
        if (!sExistingPanel) {
            return panels;
        }

        if (
            sExistingPanel.isRaw === isRaw &&
            sExistingPanel.start === start &&
            sExistingPanel.duration === sDuration
        ) {
            return panels;
        }

        return panels.map((item) =>
            item.board.meta.index_key === sPanelKey
                ? { ...item, isRaw, start, duration: sDuration }
                : item,
        );
    }

    if (panels.some((item) => item.board.meta.index_key === sPanelKey)) {
        return panels.filter((item) => item.board.meta.index_key !== sPanelKey);
    }

    return [...panels, { start, duration: sDuration, isRaw, board: panel }];
}
