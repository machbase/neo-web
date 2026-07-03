import type { PanelRangeState } from '../panel/PanelConfig';
import type { TimeRangeMs } from '../time/TimeTypes';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import {
    createTimeRangeFromCenterAndWidth,
    createTimeRangeMs,
    getCoveringTimeRange,
    getTimeRangeCenter,
    getTimeRangeWidth,
    hasVisibleTimeRangeChanged,
    isSameTimeRange,
    isTimeRangeWithinTimeRange,
    isValidTimeRange,
} from '../time/TimeRangeUtils';

export type PanelRangeApplyRequest = {
    rangeState: PanelRangeState;
    navigatorSelectionCenterRatio?: number;
};

export type PanelRangeChangeOptions = {
    navigatorSelectionCenterRatio?: number;
};

export type BoardPanelRecord = {
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
};

export type PanelRangeApplyResult = {
    resolvedRangeState: PanelRangeState;
    didChange: boolean;
};

export function createInitialPanelRangeState(): PanelRangeState {
    return {
        requestPanelRange: EMPTY_TIME_RANGE,
        requestNavigatorRange: EMPTY_TIME_RANGE,
        fullRange: EMPTY_TIME_RANGE,
    };
}

export function hasConcretePanelRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.requestPanelRange) &&
        isValidTimeRange(rangeState.requestNavigatorRange) &&
        isValidTimeRange(rangeState.fullRange)
    );
}
// --- Navigator range geometry -------------------------------------------------

const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
export const MIN_PANEL_RANGE_MS = 10;
export const MIN_NUMERIC_RANGE_AMOUNT = 0.000001;
const TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH = 40;
const MIN_RANGE_AMOUNT_FRACTION = 0.000001;

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }

    return Math.max(chartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1);
}

export function getMinimumRangeAmount(
    referenceRange: TimeRangeMs,
    floorRangeAmount: number,
): number {
    if (!Number.isFinite(floorRangeAmount) || floorRangeAmount <= 0) {
        throw new Error('Minimum range amount floor must be positive.');
    }

    const sReferenceTotalRangeAmount = Math.abs(getTimeRangeWidth(referenceRange));
    const sRelativeRangeAmount = Number.isFinite(sReferenceTotalRangeAmount)
        ? sReferenceTotalRangeAmount * MIN_RANGE_AMOUNT_FRACTION
        : 0;

    return Math.max(sRelativeRangeAmount, floorRangeAmount);
}

export function resolveNavigatorRangeForPanel(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number | undefined,
    selectionCenterRatio?: number,
): TimeRangeMs {
    let sNavigatorRange = getCoveringTimeRange(panelRange, navigatorRange);

    if (navigatorPixelWidth !== undefined) {
        sNavigatorRange = limitNavigatorRangeAmountForSelection(
            panelRange,
            sNavigatorRange,
            navigatorPixelWidth,
            selectionCenterRatio,
        );
    }

    if (isPanelRangeOutsideNavigatorRange(panelRange, sNavigatorRange)) {
        return recenterNavigatorRange(
            panelRange,
            sNavigatorRange,
            selectionCenterRatio,
        );
    }

    return sNavigatorRange;
}

function limitNavigatorRangeAmountForSelection(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number,
    selectionCenterRatio?: number,
): TimeRangeMs {
    const sPanelTotalRangeAmount = getTimeRangeWidth(panelRange);
    const sNavigatorTotalRangeAmount = getTimeRangeWidth(navigatorRange);
    const sNavigatorPixelWidth = Math.max(navigatorPixelWidth, 1);
    const sMinimumSelectionPixelWidth = Math.min(
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH,
        sNavigatorPixelWidth,
    );
    const sTargetSelectionPixelWidth = Math.min(
        Math.max(
            TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH,
            MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH,
        ),
        sNavigatorPixelWidth,
    );

    if (sPanelTotalRangeAmount <= 0) {
        throw new Error('Cannot limit navigator range amount for an invalid panel range.');
    }

    const sMaxAllowedNavigatorTotalRangeAmount =
        (sPanelTotalRangeAmount * sNavigatorPixelWidth) /
        sMinimumSelectionPixelWidth;
    if (sNavigatorTotalRangeAmount <= sMaxAllowedNavigatorTotalRangeAmount) {
        return navigatorRange;
    }

    const sTargetNavigatorTotalRangeAmount =
        (sPanelTotalRangeAmount * sNavigatorPixelWidth) /
        sTargetSelectionPixelWidth;
    if (selectionCenterRatio !== undefined) {
        return createNavigatorRangeForSelectionCenter(
            panelRange,
            sTargetNavigatorTotalRangeAmount,
            selectionCenterRatio,
        );
    }

    const sNavigatorCenter = getTimeRangeCenter(navigatorRange);
    return createTimeRangeFromCenterAndWidth(
        sNavigatorCenter,
        sTargetNavigatorTotalRangeAmount,
    );
}

function isPanelRangeOutsideNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): boolean {
    return !isTimeRangeWithinTimeRange(panelRange, navigatorRange);
}

function recenterNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    selectionCenterRatio?: number,
): TimeRangeMs {
    const sPanelTotalRangeAmount = getTimeRangeWidth(panelRange);
    const sNavigatorTotalRangeAmount = getTimeRangeWidth(navigatorRange);

    if (sPanelTotalRangeAmount <= 0 || sNavigatorTotalRangeAmount <= 0) {
        throw new Error('Cannot recenter navigator range around an invalid panel range.');
    }

    const sPanelCenterTime = getTimeRangeCenter(panelRange);
    const sNextNavigatorTotalRangeAmount = Math.max(
        sNavigatorTotalRangeAmount,
        sPanelTotalRangeAmount,
    );

    if (selectionCenterRatio !== undefined) {
        return createNavigatorRangeForSelectionCenter(
            panelRange,
            sNextNavigatorTotalRangeAmount,
            selectionCenterRatio,
        );
    }

    return createTimeRangeFromCenterAndWidth(
        sPanelCenterTime,
        sNextNavigatorTotalRangeAmount,
    );
}

function createNavigatorRangeForSelectionCenter(
    panelRange: TimeRangeMs,
    navigatorTotalRangeAmount: number,
    selectionCenterRatio: number,
): TimeRangeMs {
    if (
        !Number.isFinite(selectionCenterRatio) ||
        selectionCenterRatio < 0 ||
        selectionCenterRatio > 1
    ) {
        throw new Error('Navigator selection center ratio must be between 0 and 1.');
    }

    if (!Number.isFinite(navigatorTotalRangeAmount) || navigatorTotalRangeAmount <= 0) {
        throw new Error('Navigator range amount must be positive.');
    }

    const sPanelCenterTime = getTimeRangeCenter(panelRange);
    const sTargetStartTime =
        sPanelCenterTime - navigatorTotalRangeAmount * selectionCenterRatio;
    const sMinStartTime = panelRange.endTime - navigatorTotalRangeAmount;
    const sMaxStartTime = panelRange.startTime;
    const sStartTime = Math.min(
        Math.max(sTargetStartTime, sMinStartTime),
        sMaxStartTime,
    );

    return createTimeRangeMs(
        sStartTime,
        sStartTime + navigatorTotalRangeAmount,
    );
}

// --- Applying a requested range ----------------------------------------------

/**
 * Pure functional core of "apply a range": validate the requested range once,
 * fix the navigator range to its geometric limits, and report whether the
 * resolved state differs from what the panel already shows. No side effects.
 */
export function resolvePanelRangeApplyResult(
    boardPanelRecord: BoardPanelRecord,
    request: PanelRangeApplyRequest,
): PanelRangeApplyResult {
    const sResolvedRangeState = resolveRangeState(boardPanelRecord, request);
    const sCurrentRangeState = boardPanelRecord.rangeState;
    const sDidChange =
        hasVisibleTimeRangeChanged(
            sResolvedRangeState.requestPanelRange,
            sResolvedRangeState.requestNavigatorRange,
            sCurrentRangeState,
        ) ||
        !isSameTimeRange(
            sResolvedRangeState.fullRange,
            sCurrentRangeState.fullRange,
        );

    return {
        resolvedRangeState: sResolvedRangeState,
        didChange: sDidChange,
    };
}

function resolveRangeState(
    boardPanelRecord: BoardPanelRecord,
    request: PanelRangeApplyRequest,
): PanelRangeState {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot apply panel range before chart width is measured.');
    }

    if (!hasConcretePanelRangeState(request.rangeState)) {
        throw new Error('Cannot apply an invalid panel range.');
    }

    const sPanelRange = request.rangeState.requestPanelRange;
    const sNavigatorRange = resolveNavigatorRange(
        boardPanelRecord,
        sPanelRange,
        request.rangeState.requestNavigatorRange,
        request.navigatorSelectionCenterRatio,
    );

    return {
        ...request.rangeState,
        requestPanelRange: sPanelRange,
        requestNavigatorRange: sNavigatorRange,
        fullRange: request.rangeState.fullRange,
    };
}

function resolveNavigatorRange(
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
