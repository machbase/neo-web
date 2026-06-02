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
const MIN_NUMERIC_RANGE_WIDTH = 0.000001;
const NUMERIC_RANGE_WIDTH_FRACTION = 0.000001;

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }

    return Math.max(chartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1);
}

export function getMinNumericRangeWidth(referenceRange: TimeRangeMs): number {
    const sReferenceWidth = Math.abs(getTimeRangeWidth(referenceRange));

    return Math.max(
        Number.isFinite(sReferenceWidth) ? sReferenceWidth * NUMERIC_RANGE_WIDTH_FRACTION : 0,
        MIN_NUMERIC_RANGE_WIDTH,
    );
}

export function isPanelOutsideNavigator(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): boolean {
    return isTimeRangeOutsideBounds(panelRange, navigatorRange);
}

export function isSelectionTooSmall(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number,
): boolean {
    return getTimeRangeWidth(navigatorRange) >
        getMaxNavigatorWidth(
            panelRange,
            navigatorPixelWidth,
        );
}

export function getRecenteredNavigator(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sNavigatorWidth = getTimeRangeWidth(navigatorRange);

    if (sPanelWidth <= 0 || sNavigatorWidth <= 0) {
        throw new Error('Cannot recenter navigator range around an invalid panel range.');
    }

    const sPanelCenterTime = getTimeRangeCenter(panelRange);
    const sNextNavigatorWidth = Math.max(sNavigatorWidth, sPanelWidth);

    return createTimeRangeMs(
        sPanelCenterTime - sNextNavigatorWidth / 2,
        sPanelCenterTime + sNextNavigatorWidth / 2,
    );
}

export function getZoomedNavigator(
    panelRange: TimeRangeMs,
    navigatorPixelWidth: number,
): TimeRangeMs {
    const sMaxNavigatorWidth = getMaxNavigatorWidth(
        panelRange,
        navigatorPixelWidth,
    );

    const sPanelCenterTime = getTimeRangeCenter(panelRange);

    return createTimeRangeMs(
        sPanelCenterTime - sMaxNavigatorWidth / 2,
        sPanelCenterTime + sMaxNavigatorWidth / 2,
    );
}

function getMaxNavigatorWidth(
    panelRange: TimeRangeMs,
    navigatorPixelWidth: number,
): number {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sMinimumSelectionRatio =
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH / Math.max(navigatorPixelWidth, 1);

    if (sPanelWidth <= 0 || sMinimumSelectionRatio <= 0) {
        throw new Error('Cannot zoom navigator range for an invalid panel width.');
    }

    return Math.max(
        sPanelWidth,
        sPanelWidth / Math.min(sMinimumSelectionRatio, 1),
    );
}
