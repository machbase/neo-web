import type { PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    createTimeRangeMs,
    hasVisibleTimeRangeChanged,
    isValidTimeRange,
    isSameTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import type {
    ApplyPanelRange,
    ApplyPanelRangeRequest,
    BoardPanelRecord,
    BoardPanelStore,
    RequestPanelDataRefresh,
} from './BoardPanelState';
import {
    getNavigatorTrackWidth,
    limitNavigatorRangeAmountForSelection,
    recenterNavigatorRangeIfPanelOutside,
} from './PanelNavigatorRangeLimits';

type ApplyPanelRangeDependencies = {
    panelStore: BoardPanelStore;
};

export function useApplyPanelRange({ panelStore }: ApplyPanelRangeDependencies): {
    applyPanelRange: ApplyPanelRange;
    requestPanelDataRefresh: RequestPanelDataRefresh;
} {
    const { getBoardPanelRecord, updateBoardPanelRecord } = panelStore;

    function applyPanelRange(
        request: ApplyPanelRangeRequest,
    ): PanelRangeState | undefined {
        const sBoardPanelRecord = getBoardPanelRecord(request.panelKey);
        const sNextRangeState = resolveRangeState(sBoardPanelRecord, request);
        const sCurrentRangeState = sBoardPanelRecord.rangeState;

        const sRangeChanged =
            hasVisibleTimeRangeChanged(
                sNextRangeState.panelRange,
                sNextRangeState.navigatorRange,
                sCurrentRangeState,
            ) || !isSameTimeRange(sNextRangeState.fullRange, sCurrentRangeState.fullRange);

        if (!sRangeChanged) {
            return undefined;
        }

        updateBoardPanelRecord(request.panelKey, (record) => ({
            ...record,
            rangeState: sNextRangeState,
        }));
        return sNextRangeState;
    }

    function requestPanelDataRefresh(panelKey: string): void {
        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            dataRefreshVersion: record.dataRefreshVersion + 1,
        }));
    }

    return {
        applyPanelRange,
        requestPanelDataRefresh,
    };
}

function resolveRangeState(
    boardPanelRecord: BoardPanelRecord,
    request: ApplyPanelRangeRequest,
): PanelRangeState {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot apply panel range before chart width is measured.');
    }

    if (!isValidTimeRange(request.rangeState.panelRange)) {
        throw new Error('Cannot apply an invalid panel range.');
    }

    if (!isValidTimeRange(request.rangeState.navigatorRange)) {
        throw new Error('Cannot apply an invalid navigator range.');
    }

    if (!isValidTimeRange(request.rangeState.fullRange)) {
        throw new Error('Cannot apply an invalid full range.');
    }


    const sNavigatorRange = getNavigatorRangeForPanel(
        boardPanelRecord,
        request.rangeState.panelRange,
        request.rangeState.navigatorRange,
        request.navigatorSelectionCenterRatio,
    );

    return {
        panelRange: request.rangeState.panelRange,
        navigatorRange: sNavigatorRange,
        fullRange: request.rangeState.fullRange,
    };
}

function getNavigatorRangeForPanel(
    boardPanelRecord: BoardPanelRecord,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorSelectionCenterRatio: number | undefined,
): TimeRangeMs {
    const sChartAreaWidth = boardPanelRecord.chartAreaWidth;
    const sNavigatorTrackPixelWidth =
        typeof sChartAreaWidth === 'number' && sChartAreaWidth > 0
            ? getNavigatorTrackWidth(sChartAreaWidth)
            : undefined;
    let sNavigatorRange = growNavigatorRangeToContainPanel(
        panelRange,
        navigatorRange,
    );

    if (sNavigatorTrackPixelWidth !== undefined) {
        sNavigatorRange = limitNavigatorRangeAmountForSelection(
            panelRange,
            sNavigatorRange,
            sNavigatorTrackPixelWidth,
            navigatorSelectionCenterRatio,
        );
    }

    return recenterNavigatorRangeIfPanelOutside(
        panelRange,
        sNavigatorRange,
        navigatorSelectionCenterRatio,
    );
}

function growNavigatorRangeToContainPanel(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return createTimeRangeMs(
        Math.min(navigatorRange.startTime, panelRange.startTime),
        Math.max(navigatorRange.endTime, panelRange.endTime),
    );
}
