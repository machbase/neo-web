import { createTimeRangeMs } from '../domain/time/range/TimeRangeUtils';
import type {
    ChartRow,
    ChartSeriesData,
    OverlapLoadResult,
} from '../domain/ChartDomain';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import type {
    OverlapPanelInfo,
    OverlapPanelSelectionChangePayload,
    OverlapPanelSelection,
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
    startTimes: number[];
} {
    const sChartSeriesList: ChartSeriesData[] = [];
    const sStartTimes: number[] = [];

    results.forEach((result) => {
        if (typeof result.originTime === 'number') {
            sStartTimes.push(result.originTime);
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
export function mapOverlapRows(
    rows: ChartRow[] | undefined,
): ChartRow[] {
    return rows ?? [];
}
export function getNextOverlapSelections(
    selections: OverlapPanelSelection[],
    payload: OverlapPanelSelectionChangePayload,
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
