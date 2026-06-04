import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import type {
    ApplyPanelRangeState,
    BoardPanelRecord,
    BoardPanelStore,
    PanelRangeApplyOptions,
} from './BoardPanelState';
import {
    getNavigatorTrackWidth,
    getRecenteredNavigator,
    getZoomedNavigator,
    isPanelOutsideNavigator,
    isSelectionTooSmall,
} from './PanelNavigatorRangeLimits';

type ApplyPanelRangeDependencies = {
    panelStore: BoardPanelStore;
    handlers: {
        onRangeApplied: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
    };
};

export function useApplyPanelRange({ panelStore, handlers }: ApplyPanelRangeDependencies): {
    applyPanelRangeState: ApplyPanelRangeState;
} {
    const { getBoardPanelRecord, updateBoardPanelRecord } = panelStore;
    const { onRangeApplied } = handlers;

    function applyPanelRangeState(panelInfo: PanelInfo, options: PanelRangeApplyOptions): void {
        const sPanelKey = panelInfo.data.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        const sNextRangeState = resolveRangeState(sBoardPanelRecord, options);
        const sCurrentRangeState = sBoardPanelRecord.rangeState;
        const sReloadData = options.reloadData !== false;

        const sRangeChanged =
            hasVisibleTimeRangeChanged(
                sNextRangeState.panelRange,
                sNextRangeState.navigatorRange,
                sCurrentRangeState,
            ) || !isSameTimeRange(sNextRangeState.fullRange, sCurrentRangeState.fullRange);

        if (!sRangeChanged && !sReloadData) {
            return;
        }

        updateBoardPanelRecord(sPanelKey, (record) => ({
            ...record,
            rangeState: sNextRangeState,
            dataRefreshVersion: sReloadData
                ? record.dataRefreshVersion + 1
                : record.dataRefreshVersion,
        }));
        onRangeApplied(panelInfo, sNextRangeState);
    }

    return { applyPanelRangeState };
}

function resolveRangeState(
    boardPanelRecord: BoardPanelRecord,
    options: PanelRangeApplyOptions,
): PanelRangeState {
    const sPanelRange = options.panelRange;

    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot apply panel range before chart width is measured.');
    }

    if (!isConcreteTimeRange(sPanelRange)) {
        throw new Error('Cannot apply an invalid panel range.');
    }

    if (!isConcreteTimeRange(options.navigatorRange)) {
        throw new Error('Cannot apply an invalid navigator range.');
    }

    const sNavigatorRange = options.preserveNavigatorRange
        ? options.navigatorRange
        : getNavigatorRangeForPanel(boardPanelRecord, sPanelRange, options.navigatorRange);

    return {
        panelRange: sPanelRange,
        navigatorRange: sNavigatorRange,
        fullRange: getNextFullDataRange(boardPanelRecord.rangeState.fullRange, options.fullRange),
    };
}

function getNextFullDataRange(
    currentFullDataRange: TimeRangeMs,
    requestedFullDataRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (requestedFullDataRange !== undefined) {
        if (!isConcreteTimeRange(requestedFullDataRange)) {
            throw new Error('Cannot apply an invalid full range.');
        }

        return requestedFullDataRange;
    }

    if (!isConcreteTimeRange(currentFullDataRange)) {
        throw new Error('Cannot preserve full data range before it is initialized.');
    }

    return currentFullDataRange;
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
        isSelectionTooSmall(panelRange, sNavigatorRange, sNavigatorTrackPixelWidth)
    ) {
        sNavigatorRange = getZoomedNavigator(panelRange, sNavigatorTrackPixelWidth);
    }

    return sNavigatorRange;
}
