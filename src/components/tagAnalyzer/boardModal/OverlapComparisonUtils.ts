import { getIntervalMs } from '../domain/time/TimeIntervalUtils';
import {
    createTimeRangeMs,
    shiftTimestamp,
} from '../domain/time/TimeRangeUtils';
import type {
    ChartRow,
    ChartSeriesData,
    OverlapLoadResult,
} from '../domain/ChartDataModel';
import type { IntervalOption, TimeRangeMs } from '../domain/time/TimeTypes';
import type {
    OverlapPanelInfo,
    OverlapPanelSelection,
    OverlapShiftDirection,
    OverlapSelectionChangePayload,
} from '../domain/OverlapModel';
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
                  start: shiftTimestamp(
                      item.start,
                      direction === '+' ? range : -range,
                  ),
              }
            : item,
    );
}
export function buildOverlapLoadState(results: OverlapLoadResult[]): {
    chartSeries: ChartSeriesData[];
    startTimes: number[];
} {
    const sChartSeriesList: ChartSeriesData[] = [];
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
export function resolveOverlapTimeRange(
    panelInfo: OverlapPanelInfo,
    anchorDuration: number,
): TimeRangeMs {
    return createTimeRangeMs(
        panelInfo.start,
        panelInfo.start + anchorDuration,
    );
}
export function alignOverlapTime(time: number, interval: IntervalOption): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);

    if (sIntervalMs <= 0) {
        return time;
    }

    return Math.floor(time / sIntervalMs) * sIntervalMs;
}
export function mapOverlapRows(
    rows: ChartRow[] | undefined,
    seriesStartTime: number,
): ChartRow[] {
    return rows?.map(([aTimestamp, aValue]) => [aTimestamp - seriesStartTime, aValue]) ?? [];
}
export function getNextOverlapSelections(
    selections: OverlapPanelSelection[],
    payload: OverlapSelectionChangePayload,
): OverlapPanelSelection[] {
    const { panelKey, changeType } = payload;

    if (changeType === 'delete') {
        const sNextSelections = selections.filter((item) => item.panelKey !== panelKey);
        return sNextSelections.length === selections.length ? selections : sNextSelections;
    }

    if (changeType === 'changed') {
        const { start, end, isRaw } = payload;
        const sDuration = end - start;
        const sExistingSelection = selections.find((item) => item.panelKey === panelKey);
        if (!sExistingSelection) {
            return selections;
        }

        if (
            sExistingSelection.isRaw === isRaw &&
            sExistingSelection.start === start &&
            sExistingSelection.duration === sDuration
        ) {
            return selections;
        }

        return selections.map((item) =>
            item.panelKey === panelKey
                ? { ...item, isRaw, start, duration: sDuration }
                : item,
        );
    }

    if (selections.some((item) => item.panelKey === panelKey)) {
        return selections.filter((item) => item.panelKey !== panelKey);
    }

    const { start, end, isRaw } = payload;
    const sDuration = end - start;

    if (sDuration <= 0) {
        return selections;
    }

    return [
        ...selections,
        {
            panelKey,
            start: start,
            duration: sDuration,
            isRaw: isRaw,
        },
    ];
}
