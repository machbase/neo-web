import { createTimeRangeMs } from '../domain/time/range/TimeRangeUtils';
import type {
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
    if (appliedPanelsInfo.length !== draftPanelsInfo.length) return true;

    return draftPanelsInfo.some((draftPanel, index) => {
        const sAppliedPanel = appliedPanelsInfo[index];
        return (
            !sAppliedPanel ||
            sAppliedPanel.panelKey !== draftPanel.panelKey ||
            sAppliedPanel.start !== draftPanel.start ||
            sAppliedPanel.duration !== draftPanel.duration ||
            sAppliedPanel.isRaw !== draftPanel.isRaw
        );
    });
}

export function buildOverlapLoadState(results: OverlapLoadResult[]): {
    chartSeries: ChartSeriesData[];
} {
    return {
        chartSeries: results
            .map((result) => result.chartSeries)
            .filter((series): series is ChartSeriesData => series !== undefined),
    };
}

export function resolveOverlapTimeRange(
    panelInfo: OverlapPanelInfo,
    anchorDuration: number,
): TimeRangeMs {
    return createTimeRangeMs(panelInfo.start, panelInfo.start + anchorDuration);
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
