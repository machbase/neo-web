import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    createTimeRangeMs,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isTimeRangeWithinTimeRange,
} from '../domain/time/range/TimeRangeUtils';

export const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
export const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
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

export function limitNavigatorRangeAmountForSelection(
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
    return createTimeRangeMs(
        sNavigatorCenter - sTargetNavigatorTotalRangeAmount / 2,
        sNavigatorCenter + sTargetNavigatorTotalRangeAmount / 2,
    );
}

export function recenterNavigatorRangeIfPanelOutside(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    selectionCenterRatio?: number,
): TimeRangeMs {
    if (isTimeRangeWithinTimeRange(panelRange, navigatorRange)) {
        return navigatorRange;
    }

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

    return createTimeRangeMs(
        sPanelCenterTime - sNextNavigatorTotalRangeAmount / 2,
        sPanelCenterTime + sNextNavigatorTotalRangeAmount / 2,
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
