import type { PanelShiftHandlers, PanelZoomHandlers } from '../panelRuntimeTypes';
import type { ValueRange, TimeRangeMs } from './timeTypes';

type RangeDirection = 'left' | 'right';
type RangeSetter = (aPanelRange: TimeRangeMs, aNavigatorRange: TimeRangeMs | undefined) => void;

export type PanelRangeUpdate = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs | undefined;
};

const MAX_PANEL_END_TIME = 9999999999999;
const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;

/**
 * Converts a navigator drag event into a concrete time range.
 * Intent: Enforce a minimum navigator span before the range is applied to the chart.
 * @param {ValueRange} aEvent - The raw range selection event from the navigator.
 * @returns {TimeRangeMs} The normalized navigator range.
 */
export function getNavigatorRangeFromEvent(aEvent: ValueRange): TimeRangeMs {
    const sStartTime = aEvent.min;
    const sEndTime = Math.max(aEvent.max, sStartTime + MIN_NAVIGATOR_RANGE_MS);

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Shrinks a panel range around its center by the requested zoom amount.
 * Intent: Keep zoom-in behavior centered and bounded by the minimum panel width.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {number} aZoom - The zoom factor to apply.
 * @returns {TimeRangeMs} The zoomed-in panel range.
 */
export function getZoomInPanelRange(aPanelRange: TimeRangeMs, aZoom = 0): TimeRangeMs {
    const sCalcTime = getRangeWidth(aPanelRange) * aZoom;
    const sStartTime = aPanelRange.startTime + sCalcTime;
    const sEndTime = Math.max(aPanelRange.endTime - sCalcTime, sStartTime + MIN_PANEL_RANGE_MS);

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Expands a panel range and updates the navigator when the new range escapes it.
 * Intent: Keep zoom-out interactions synchronized between the main panel and the overview.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @param {number} aZoom - The zoom factor to apply.
 * @returns {PanelRangeUpdate} The updated panel and optional navigator ranges.
 */
export function getZoomOutRange(
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
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

    const sNextPanelRange = { startTime: sStartTime, endTime: sEndTime };

    return {
        panelRange: sNextPanelRange,
        navigatorRange: isRangeOutsideBounds(sNextPanelRange, aNavigatorRange)
            ? sNextPanelRange
            : undefined,
    };
}

/**
 * Creates a focused panel range and matching navigator range around the current center.
 * Intent: Provide a quick way to narrow attention to the current panel window.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @returns {PanelRangeUpdate | undefined} The focused ranges, or undefined when the panel is too small.
 */
export function getFocusedPanelRange(
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
): PanelRangeUpdate | undefined {
    const sPanelWidth = getRangeWidth(aPanelRange);
    if (sPanelWidth < MIN_FOCUSABLE_PANEL_RANGE_MS) {
        return undefined;
    }

    const sNavigatorWidth = getRangeWidth(aNavigatorRange);
    const sFocusedNavigatorWidth = Math.max(sPanelWidth, sNavigatorWidth / 2);
    const sPanelCenterTime = aPanelRange.startTime + sPanelWidth / 2;

    return {
        panelRange: {
            startTime: aPanelRange.startTime + sPanelWidth * 0.4,
            endTime: aPanelRange.startTime + sPanelWidth * 0.6,
        },
        navigatorRange: getClampedNavigatorFocusRange(
            aNavigatorRange,
            sPanelCenterTime,
            sFocusedNavigatorWidth,
        ),
    };
}

/**
 * Builds the panel and navigator range control handlers.
 * Intent: Package the shift and zoom actions behind a single handler factory.
 * @param {RangeSetter} aSetExtremes - The callback that applies the resolved ranges.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @returns {{ shiftHandlers: PanelShiftHandlers; zoomHandlers: PanelZoomHandlers }} The control handlers for the chart.
 */
export function createPanelRangeControlHandlers(
    aSetExtremes: RangeSetter,
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
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
 * Shifts the panel range and adjusts the navigator when the panel would leave it.
 * Intent: Keep panel movement aligned with the visible overview window.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @param {RangeDirection} aDirection - The direction to move the panel.
 * @returns {PanelRangeUpdate} The shifted panel range and optional navigator range.
 */
export function getMovedPanelRange(
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aPanelRange), aDirection);
    const sNextPanelRange = shiftTimeRange(aPanelRange, sOffset);

    return {
        panelRange: sNextPanelRange,
        navigatorRange:
            aDirection === 'left'
                ? aNavigatorRange.startTime > sNextPanelRange.startTime
                    ? {
                          startTime: sNextPanelRange.startTime,
                          endTime: aNavigatorRange.endTime + sOffset,
                      }
                    : undefined
                : aNavigatorRange.endTime < sNextPanelRange.endTime
                  ? {
                        startTime: aNavigatorRange.startTime + sOffset,
                        endTime: sNextPanelRange.endTime,
                    }
                  : undefined,
    };
}

/**
 * Shifts both the panel and navigator ranges by the same offset.
 * Intent: Preserve the relative view while the overview window is being dragged.
 * @param {TimeRangeMs} aPanelRange - The current panel range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @param {RangeDirection} aDirection - The direction to move the navigator.
 * @returns {PanelRangeUpdate} The shifted panel and navigator ranges.
 */
export function getMovedNavigatorRange(
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
    aDirection: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(aNavigatorRange), aDirection);

    return {
        panelRange: shiftTimeRange(aPanelRange, sOffset),
        navigatorRange: shiftTimeRange(aNavigatorRange, sOffset),
    };
}

/**
 * Centers a navigator focus range while keeping it inside the navigator bounds.
 * Intent: Prevent focus mode from moving the overview window outside its valid range.
 * @param {TimeRangeMs} aNavigatorRange - The current navigator range.
 * @param {number} aCenterTime - The center point for the focused range.
 * @param {number} aNextWidth - The requested width for the focused range.
 * @returns {TimeRangeMs} The clamped focused navigator range.
 */
function getClampedNavigatorFocusRange(
    aNavigatorRange: TimeRangeMs,
    aCenterTime: number,
    aNextWidth: number,
): TimeRangeMs {
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

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Calculates the width of a time range.
 * Intent: Reuse the same width calculation across zoom and shift helpers.
 * @param {TimeRangeMs} aRange - The time range to measure.
 * @returns {number} The range width in milliseconds.
 */
function getRangeWidth(aRange: TimeRangeMs): number {
    return aRange.endTime - aRange.startTime;
}

/**
 * Shifts a time range by a fixed offset.
 * Intent: Provide a shared primitive for moving panel and navigator ranges together.
 * @param {TimeRangeMs} aRange - The range to shift.
 * @param {number} aOffset - The offset to add to both range edges.
 * @returns {TimeRangeMs} The shifted time range.
 */
function shiftTimeRange(aRange: TimeRangeMs, aOffset: number): TimeRangeMs {
    return {
        startTime: aRange.startTime + aOffset,
        endTime: aRange.endTime + aOffset,
    };
}

/**
 * Converts a range width and direction into a signed offset.
 * Intent: Keep left and right movement rules symmetric around the current range width.
 * @param {number} aRangeWidth - The width of the range being moved.
 * @param {RangeDirection} aDirection - The direction of movement.
 * @returns {number} The signed offset to apply.
 */
function getDirectionOffset(aRangeWidth: number, aDirection: RangeDirection): number {
    const sHalfWidth = aRangeWidth / 2;
    return aDirection === 'left' ? -sHalfWidth : sHalfWidth;
}

/**
 * Checks whether a range extends outside another range.
 * Intent: Decide when zooming out must also expand the navigator window.
 * @param {TimeRangeMs} aRange - The range to inspect.
 * @param {TimeRangeMs} aBounds - The bounds to compare against.
 * @returns {boolean} True when the range leaves the bounds.
 */
function isRangeOutsideBounds(aRange: TimeRangeMs, aBounds: TimeRangeMs): boolean {
    return aRange.startTime < aBounds.startTime || aRange.endTime > aBounds.endTime;
}

/**
 * Applies a range update when one was produced.
 * Intent: Keep the handler callbacks free from repeated null checks.
 * @param {RangeSetter} aSetExtremes - The callback that consumes the updated ranges.
 * @param {PanelRangeUpdate | undefined} aRangeUpdate - The computed range update.
 * @returns {void} Nothing.
 */
function applyRangeUpdate(
    aSetExtremes: RangeSetter,
    aRangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!aRangeUpdate) {
        return;
    }

    aSetExtremes(aRangeUpdate.panelRange, aRangeUpdate.navigatorRange);
}
