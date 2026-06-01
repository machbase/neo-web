import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { createTimeRangeMs, getTimeRangeCenter, getTimeRangeWidth } from '../domain/time/TimeRangeUtils';

export const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
export const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
export const MIN_PANEL_RANGE_MS = 10;
const MIN_NUMERIC_RANGE_WIDTH = 0.000001;
const NUMERIC_RANGE_WIDTH_FRACTION = 0.000001;

export function getNavigatorTrackPixelWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }

    return Math.max(chartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1);
}

export function getMinimumNumericRangeWidth(referenceRange: TimeRangeMs): number {
    const sReferenceWidth = Math.abs(getTimeRangeWidth(referenceRange));

    return Math.max(
        Number.isFinite(sReferenceWidth) ? sReferenceWidth * NUMERIC_RANGE_WIDTH_FRACTION : 0,
        MIN_NUMERIC_RANGE_WIDTH,
    );
}

export function normalizeNavigatorRangeForPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number,
): TimeRangeMs {
    const sNavigatorRange = createTimeRangeMs(
        Math.min(panelRange.startTime, navigatorRange.startTime),
        Math.max(panelRange.endTime, navigatorRange.endTime),
    );
    const sMaxNavigatorWidth = getMaxNavigatorRangeWidthForMinimumSelection(
        panelRange,
        navigatorPixelWidth,
    );

    if (getTimeRangeWidth(sNavigatorRange) <= sMaxNavigatorWidth) {
        return sNavigatorRange;
    }

    const sPanelCenterTime = getTimeRangeCenter(panelRange);

    return createTimeRangeMs(
        sPanelCenterTime - sMaxNavigatorWidth / 2,
        sPanelCenterTime + sMaxNavigatorWidth / 2,
    );
}

function getMaxNavigatorRangeWidthForMinimumSelection(
    panelRange: TimeRangeMs,
    navigatorPixelWidth: number,
): number {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sMinimumSelectionRatio =
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH / Math.max(navigatorPixelWidth, 1);

    if (sPanelWidth <= 0 || sMinimumSelectionRatio <= 0) {
        throw new Error('Cannot normalize navigator range for an invalid panel width.');
    }

    return Math.max(
        sPanelWidth,
        sPanelWidth / Math.min(sMinimumSelectionRatio, 1),
    );
}
