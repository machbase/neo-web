import { createTagAnalyzerTimeRange } from '../utils/TagAnalyzerDateUtils';
import type { ValueRange, TimeRange } from '../common/modelTypes';
import type { PanelShiftHandlers, PanelZoomHandlers } from './PanelModel';

type RangeDirection = 'left' | 'right';
type RangeSetter = (aPanelRange: TimeRange, aNavigatorRange: TimeRange | undefined) => void;

export type PanelRangeUpdate = {
    panelRange: TimeRange;
    navigatorRange: TimeRange | undefined;
};

const MAX_PANEL_END_TIME = 9999999999999;
const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;

/**
 * Enforces the minimum navigator width expected by the footer controls.
 * @param aEvent The navigator min/max range.
 * @returns The normalized navigator range.
 */
export function getNavigatorRangeFromEvent(aEvent: ValueRange): TimeRange {
    const sStartTime = aEvent.min;
    const sEndTime = Math.max(aEvent.max, sStartTime + MIN_NAVIGATOR_RANGE_MS);

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
}

/**
 * Zooms the panel inward around its current center point.
 * @param aPanelRange The current panel range.
 * @param aZoom The zoom ratio to apply.
 * @returns The zoomed-in panel range.
 */
export function getZoomInPanelRange(aPanelRange: TimeRange, aZoom = 0): TimeRange {
    const sCalcTime = getRangeWidth(aPanelRange) * aZoom;
    const sStartTime = aPanelRange.startTime + sCalcTime;
    const sEndTime = Math.max(aPanelRange.endTime - sCalcTime, sStartTime + MIN_PANEL_RANGE_MS);

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
}

/**
 * Zooms the panel outward and widens the navigator when the new range escapes the current bounds.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aZoom The zoom ratio to apply.
 * @returns The updated panel range and any required navigator range.
 */
export function getZoomOutRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aZoom = 0,
): PanelRangeUpdate {
    const sOffset = getRangeWidth(aPanelRange) * aZoom;
    let sStartTime = aPanelRange.startTime - sOffset;
    let sEndTime = aPanelRange.endTime + sOffset;

    if (sStartTime <= 0) {
        sStartTime = aNavigatorRange.startTime;
    }

    if (sEndTime > MAX_PANEL_END_TIME) {
        sEndTime = MAX_PANEL_END_TIME;
    }

    const sNextPanelRange = createTagAnalyzerTimeRange(sStartTime, sEndTime);

    return {
        panelRange: sNextPanelRange,
        navigatorRange: isRangeOutsideBounds(sNextPanelRange, aNavigatorRange)
            ? sNextPanelRange
            : undefined,
    };
}

/**
 * Narrows the panel view to the middle slice of the current range and zooms the slider range in by half.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current slider range.
 * @returns The focused panel range update, or `undefined` when the range is already too small.
 */
export function getFocusedPanelRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): PanelRangeUpdate | undefined {
    const sPanelWidth = getRangeWidth(aPanelRange);
    if (sPanelWidth < MIN_FOCUSABLE_PANEL_RANGE_MS) {
        return undefined;
    }

    const sNavigatorWidth = getRangeWidth(aNavigatorRange);
    const sFocusedNavigatorWidth = Math.max(sPanelWidth, sNavigatorWidth / 2);
    const sPanelCenterTime = aPanelRange.startTime + sPanelWidth / 2;

    return {
        panelRange: createTagAnalyzerTimeRange(
            aPanelRange.startTime + sPanelWidth * 0.4,
            aPanelRange.startTime + sPanelWidth * 0.6,
        ),
        navigatorRange: getClampedNavigatorFocusRange(
            aNavigatorRange,
            sPanelCenterTime,
            sFocusedNavigatorWidth,
        ),
    };
}

/**
 * Builds the panel move and zoom handlers for the board and preview shells.
 * @param aSetExtremes The shared range setter.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @returns The shift and zoom handlers for the current chart state.
 */
export function createPanelRangeControlHandlers(
    aSetExtremes: RangeSetter,
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
): { shiftHandlers: PanelShiftHandlers; zoomHandlers: PanelZoomHandlers } {
    return {
        shiftHandlers: {
            onShiftPanelRangeLeft: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedPanelRange(aPanelRange, aNavigatorRange, 'left'),
                ),
            onShiftPanelRangeRight: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedPanelRange(aPanelRange, aNavigatorRange, 'right'),
                ),
            onShiftNavigatorRangeLeft: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'left'),
                ),
            onShiftNavigatorRangeRight: () =>
                applyRangeUpdate(
                    aSetExtremes,
                    getMovedNavigatorRange(aPanelRange, aNavigatorRange, 'right'),
                ),
        },
        zoomHandlers: {
            onZoomIn: (aZoom: number) =>
                aSetExtremes(getZoomInPanelRange(aPanelRange, aZoom), undefined),
            onZoomOut: (aZoom: number) =>
                applyRangeUpdate(
                    aSetExtremes,
                    getZoomOutRange(aPanelRange, aNavigatorRange, aZoom),
                ),
            onFocus: () =>
                applyRangeUpdate(aSetExtremes, getFocusedPanelRange(aPanelRange, aNavigatorRange)),
        },
    };
}

/**
 * Shifts the visible panel range by half its width in the requested direction.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel range and any required navigator range.
 */
export function getMovedPanelRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aPanelRange), aDirection);
    const sNextPanelRange = shiftTimeRange(aPanelRange, sOffset);

    return {
        panelRange: sNextPanelRange,
        navigatorRange:
            aDirection === 'left'
                ? aNavigatorRange.startTime > sNextPanelRange.startTime
                    ? createTagAnalyzerTimeRange(
                          sNextPanelRange.startTime,
                          aNavigatorRange.endTime + sOffset,
                      )
                    : undefined
                : aNavigatorRange.endTime < sNextPanelRange.endTime
                  ? createTagAnalyzerTimeRange(
                        aNavigatorRange.startTime + sOffset,
                        sNextPanelRange.endTime,
                    )
                  : undefined,
    };
}

/**
 * Shifts the navigator window and keeps the panel inside the new overview.
 * @param aPanelRange The current panel range.
 * @param aNavigatorRange The current navigator range.
 * @param aDirection The shift direction.
 * @returns The updated panel and navigator ranges.
 */
export function getMovedNavigatorRange(
    aPanelRange: TimeRange,
    aNavigatorRange: TimeRange,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aNavigatorRange), aDirection);

    return {
        panelRange: shiftTimeRange(aPanelRange, sOffset),
        navigatorRange: shiftTimeRange(aNavigatorRange, sOffset),
    };
}

function getClampedNavigatorFocusRange(
    aNavigatorRange: TimeRange,
    aCenterTime: number,
    aNextWidth: number,
): TimeRange {
    let sStartTime = aCenterTime - aNextWidth / 2;
    let sEndTime = aCenterTime + aNextWidth / 2;

    if (sStartTime < aNavigatorRange.startTime) {
        sEndTime += aNavigatorRange.startTime - sStartTime;
        sStartTime = aNavigatorRange.startTime;
    }

    if (sEndTime > aNavigatorRange.endTime) {
        sStartTime -= sEndTime - aNavigatorRange.endTime;
        sEndTime = aNavigatorRange.endTime;
    }

    if (sStartTime < aNavigatorRange.startTime) {
        sStartTime = aNavigatorRange.startTime;
    }

    return createTagAnalyzerTimeRange(sStartTime, sEndTime);
}

function getRangeWidth(aRange: TimeRange): number {
    return aRange.endTime - aRange.startTime;
}

function shiftTimeRange(aRange: TimeRange, aOffset: number): TimeRange {
    return createTagAnalyzerTimeRange(aRange.startTime + aOffset, aRange.endTime + aOffset);
}

function getDirectionOffset(aRangeWidth: number, aDirection: RangeDirection): number {
    const sHalfWidth = aRangeWidth / 2;
    return aDirection === 'left' ? -sHalfWidth : sHalfWidth;
}

function isRangeOutsideBounds(aRange: TimeRange, aBounds: TimeRange): boolean {
    return aRange.startTime < aBounds.startTime || aRange.endTime > aBounds.endTime;
}

function applyRangeUpdate(
    aSetExtremes: RangeSetter,
    aRangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!aRangeUpdate) {
        return;
    }

    aSetExtremes(aRangeUpdate.panelRange, aRangeUpdate.navigatorRange);
}
