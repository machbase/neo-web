import { getIntervalMs } from '../domain/time/TimeIntervalUtils';
import { createTimeRangeMs } from '../domain/time/TimeRangeUtils';
import type {
    ChartRow,
    ChartSeriesData,
    OverlapLoadResult,
} from '../domain/ChartDomain';
import type { IntervalOption, TimeRangeMs } from '../domain/time/TimeTypes';
import type {
    OverlapPanelInfo,
    OverlapPanelSelection,
    OverlapSelectionChangePayload,
} from '../domain/BoardDomain';

export function hasOverlapPanelDraftChanged(
    appliedPanelsInfo: OverlapPanelInfo[],
    draftPanelsInfo: OverlapPanelInfo[],
): boolean {
    if (appliedPanelsInfo.length !== draftPanelsInfo.length) {
        return true;
    }

    return draftPanelsInfo.some((draftPanel, index) => {
        const sAppliedPanel = appliedPanelsInfo[index];

        return (
            !sAppliedPanel ||
            sAppliedPanel.board.data.index_key !== draftPanel.board.data.index_key ||
            sAppliedPanel.start !== draftPanel.start ||
            sAppliedPanel.duration !== draftPanel.duration ||
            sAppliedPanel.isRaw !== draftPanel.isRaw
        );
    });
}

export function buildOverlapLoadState(results: OverlapLoadResult[]): {
    chartSeries: ChartSeriesData[];
    originTimes: number[];
    emptySeriesLabels: string[];
} {
    const sChartSeriesList: ChartSeriesData[] = [];
    const sOriginTimes: number[] = [];
    const sEmptySeriesLabels: string[] = [];

    results.forEach((result) => {
        if (typeof result.originTime === 'number' && result.chartSeries) {
            sOriginTimes.push(result.originTime);
            sChartSeriesList.push(result.chartSeries);
        }

        if (result.emptySeriesLabel) {
            sEmptySeriesLabels.push(result.emptySeriesLabel);
        }
    });

    return {
        chartSeries: sChartSeriesList,
        originTimes: sOriginTimes,
        emptySeriesLabels: sEmptySeriesLabels,
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
    originTime: number,
): ChartRow[] {
    return rows?.map(([aTimestamp, aValue]) => [aTimestamp - originTime, aValue]) ?? [];
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
