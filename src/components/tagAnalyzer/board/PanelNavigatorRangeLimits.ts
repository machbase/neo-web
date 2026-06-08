import type { TimeRangeMs } from '../domain/time/TimeTypes';
import {
    createTimeRangeMs,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isTimeRangeOutsideBounds,
} from '../domain/time/TimeRangeUtils';

export const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
export const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
export const MIN_PANEL_RANGE_MS = 10;
const TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH = 40;
const MIN_NUMERIC_RANGE_AMOUNT = 0.000001;
const NUMERIC_RANGE_AMOUNT_FRACTION = 0.000001;

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }

    return Math.max(chartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1);
}

export function getMinNumericRangeAmount(referenceRange: TimeRangeMs): number {
    const sReferenceTotalRangeAmount = Math.abs(getTimeRangeWidth(referenceRange));

    return Math.max(
        Number.isFinite(sReferenceTotalRangeAmount)
            ? sReferenceTotalRangeAmount * NUMERIC_RANGE_AMOUNT_FRACTION
            : 0,
        MIN_NUMERIC_RANGE_AMOUNT,
    );
}

export function isPanelOutsideNavigator(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): boolean {
    return isTimeRangeOutsideBounds(panelRange, navigatorRange);
}

export function limitNavigatorRangeAmountForSelection(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number,
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
    const sNavigatorCenter = getTimeRangeCenter(navigatorRange);

    return createTimeRangeMs(
        sNavigatorCenter - sTargetNavigatorTotalRangeAmount / 2,
        sNavigatorCenter + sTargetNavigatorTotalRangeAmount / 2,
    );
}

export function recenterNavigatorRangeIfPanelOutside(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    if (!isPanelOutsideNavigator(panelRange, navigatorRange)) {
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

    return createTimeRangeMs(
        sPanelCenterTime - sNextNavigatorTotalRangeAmount / 2,
        sPanelCenterTime + sNextNavigatorTotalRangeAmount / 2,
    );
}
