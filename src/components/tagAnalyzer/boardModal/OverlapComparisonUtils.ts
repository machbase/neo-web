import { getIntervalMs } from '../time/TimeUnitUtils';
import {
    createResolvedTimeRange,
    shiftTimestamp,
} from '../time/TimeRangeUtils';
import type { ChartRow, ChartSeriesData } from '../chart/ChartTypes';
import type { IntervalOption, ResolvedTimeRangeMs } from '../time/TimeTypes';
import type {
    OverlapPanelInfo,
    OverlapShiftDirection,
    OverlapSelectionChangePayload,
} from '../domain/OverlapModel';
import type { OverlapLoadResult } from './BoardModalTypes';
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
): ResolvedTimeRangeMs {
    return createResolvedTimeRange(
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
export function getNextOverlapPanels(
    panels: OverlapPanelInfo[],
    payload: OverlapSelectionChangePayload,
): OverlapPanelInfo[] {
    const { panel, changeType } = payload;
    const sPanelKey = panel.meta.index_key;

    if (changeType === 'delete') {
        const sNextPanels = panels.filter((item) => item.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === panels.length ? panels : sNextPanels;
    }

    if (changeType === 'changed') {
        const { start, end, isRaw } = payload;
        const sDuration = end - start;
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

    const sPanelRange = panel.time.timeKeeper?.panelRange;

    if (!sPanelRange) {
        return panels;
    }

    const sDuration = sPanelRange.endTime - sPanelRange.startTime;

    if (sDuration <= 0) {
        return panels;
    }

    return [
        ...panels,
        {
            start: sPanelRange.startTime,
            duration: sDuration,
            isRaw: panel.toolbar.isRaw,
            board: panel,
        },
    ];
}
