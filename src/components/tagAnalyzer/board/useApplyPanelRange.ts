import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import type { PanelRangeApplyOptions } from '../panel/PanelDataRuntimeState';
import type { BoardPanelRecord } from './BoardPanelState';
import {
    getNavigatorTrackWidth,
    getRecenteredNavigator,
    getZoomedNavigator,
    isPanelOutsideNavigator,
    isSelectionTooSmall,
} from './PanelNavigatorRangeLimits';

type PanelRangeStore = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateBoardPanelRecord: (
        panelKey: string,
        updater: (record: BoardPanelRecord) => BoardPanelRecord,
    ) => void;
};

type PanelRangeHandlers = {
    onRangeApplied: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
};

type ApplyPanelRangeDependencies = {
    panelStore: PanelRangeStore;
    handlers: PanelRangeHandlers;
};

function assertCanApplyPanelRange(
    boardPanelRecord: BoardPanelRecord,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    fullRange: TimeRangeMs | undefined,
): void {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot apply panel range before chart width is measured.');
    }

    if (!isConcreteTimeRange(panelRange)) {
        throw new Error('Cannot apply an invalid panel range.');
    }

    if (!isConcreteTimeRange(navigatorRange)) {
        throw new Error('Cannot apply an invalid navigator range.');
    }

    if (fullRange !== undefined && !isConcreteTimeRange(fullRange)) {
        throw new Error('Cannot apply an invalid full range.');
    }
}

export function useApplyPanelRange({
    panelStore,
    handlers,
}: ApplyPanelRangeDependencies) {
    const {
        getBoardPanelRecord,
        updateBoardPanelRecord,
    } = panelStore;
    const { onRangeApplied } = handlers;

    function applyPanelRangeState(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange = panelRange,
            fullRange,
            preserveNavigatorRange = false,
            reloadData = true,
        }: PanelRangeApplyOptions,
    ): void {
        const sPanelKey = panelInfo.data.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        assertCanApplyPanelRange(
            sBoardPanelRecord,
            panelRange,
            navigatorRange,
            fullRange,
        );

        const sNavigatorRange = preserveNavigatorRange
            ? navigatorRange
            : getNavigatorRangeForPanel(
                  sBoardPanelRecord,
                  panelRange,
                  navigatorRange,
              );
        const sCurrentRangeState = sBoardPanelRecord.rangeState;
        const sFullRange =
            fullRange ??
            (isConcreteTimeRange(sCurrentRangeState.fullRange)
                ? sCurrentRangeState.fullRange
                : sNavigatorRange);
        const sNextRangeState: PanelRangeState = {
            panelRange,
            navigatorRange: sNavigatorRange,
            fullRange: sFullRange,
        };
        const sRangeChanged =
            hasVisibleTimeRangeChanged(
                sNextRangeState.panelRange,
                sNextRangeState.navigatorRange,
                sCurrentRangeState,
            ) || !isSameTimeRange(sNextRangeState.fullRange, sCurrentRangeState.fullRange);

        if (!sRangeChanged && reloadData === false) {
            return;
        }

        updateBoardPanelRecord(sPanelKey, (record) => ({
            ...record,
            rangeState: sNextRangeState,
            dataRefreshVersion:
                reloadData !== false
                    ? record.dataRefreshVersion + 1
                    : record.dataRefreshVersion,
        }));
        onRangeApplied(panelInfo, sNextRangeState);
    }

    return { applyPanelRangeState };
}

function getNavigatorRangeForPanel(
    boardPanelRecord: BoardPanelRecord,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    const sChartAreaWidth = boardPanelRecord.chartAreaWidth;
    const sNavigatorTrackPixelWidth =
        typeof sChartAreaWidth === 'number' && sChartAreaWidth > 0
            ? getNavigatorTrackWidth(sChartAreaWidth)
            : undefined;
    let sNavigatorRange = navigatorRange;

    if (isPanelOutsideNavigator(panelRange, sNavigatorRange)) {
        sNavigatorRange = getRecenteredNavigator(panelRange, sNavigatorRange);
    }

    if (
        sNavigatorTrackPixelWidth !== undefined &&
        isSelectionTooSmall(
            panelRange,
            sNavigatorRange,
            sNavigatorTrackPixelWidth,
        )
    ) {
        sNavigatorRange = getZoomedNavigator(
            panelRange,
            sNavigatorTrackPixelWidth,
        );
    }

    return sNavigatorRange;
}
