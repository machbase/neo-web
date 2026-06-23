import type { PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isValidTimeRange,
    isSameTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import type {
    ApplyPanelRange,
    ApplyPanelRangeRequest,
    PanelRangeApplyResult,
    BoardPanelRecord,
    BoardPanelStore,
    RequestPanelDataRefresh,
} from './BoardPanelState';
import {
    getNavigatorTrackWidth,
    resolveNavigatorRangeForPanel,
} from './PanelNavigatorRangeLimits';

type ApplyPanelRangeDependencies = {
    panelStore: BoardPanelStore;
};

export function createApplyPanelRange({ panelStore }: ApplyPanelRangeDependencies): {
    applyPanelRange: ApplyPanelRange;
    requestPanelDataRefresh: RequestPanelDataRefresh;
} {
    const { getBoardPanelRecord, updateBoardPanelRecord } = panelStore;

    function applyPanelRange(
        request: ApplyPanelRangeRequest,
    ): PanelRangeApplyResult {
        const sBoardPanelRecord = getBoardPanelRecord(request.panelKey);
        const sApplyResult = resolvePanelRangeApplyResult(
            sBoardPanelRecord,
            request,
        );

        if (sApplyResult.didChange) {
            updateBoardPanelRecord(request.panelKey, (record) => ({
                ...record,
                rangeState: sApplyResult.resolvedRangeState,
            }));
        }

        return sApplyResult;
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

export function resolvePanelRangeApplyResult(
    boardPanelRecord: BoardPanelRecord,
    request: ApplyPanelRangeRequest,
): PanelRangeApplyResult {
    const sResolvedRangeState = resolveRangeState(boardPanelRecord, request);
    const sCurrentRangeState = boardPanelRecord.rangeState;
    const sDidChange =
        hasVisibleTimeRangeChanged(
            sResolvedRangeState.requestPanelRange,
            sResolvedRangeState.requestNavigatorRange,
            sCurrentRangeState,
        ) || !isSameTimeRange(sResolvedRangeState.fullRange, sCurrentRangeState.fullRange);

    return {
        resolvedRangeState: sResolvedRangeState,
        didChange: sDidChange,
    };
}

function resolveRangeState(
    boardPanelRecord: BoardPanelRecord,
    request: ApplyPanelRangeRequest,
): PanelRangeState {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot apply panel range before chart width is measured.');
    }

    if (!isValidTimeRange(request.rangeState.requestPanelRange)) {
        throw new Error('Cannot apply an invalid panel range.');
    }

    if (!isValidTimeRange(request.rangeState.requestNavigatorRange)) {
        throw new Error('Cannot apply an invalid navigator range.');
    }

    if (!isValidTimeRange(request.rangeState.fullRange)) {
        throw new Error('Cannot apply an invalid full range.');
    }

    const sPanelRange = request.rangeState.requestPanelRange;
    const sNavigatorRange = getNavigatorRangeForPanel(
        boardPanelRecord,
        sPanelRange,
        request.rangeState.requestNavigatorRange,
        request.navigatorSelectionCenterRatio,
    );

    return {
        requestPanelRange: sPanelRange,
        requestNavigatorRange: sNavigatorRange,
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
    return resolveNavigatorRangeForPanel(
        panelRange,
        navigatorRange,
        sNavigatorTrackPixelWidth,
        navigatorSelectionCenterRatio,
    );
}
