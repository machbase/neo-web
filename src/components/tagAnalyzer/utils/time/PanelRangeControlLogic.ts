import {
    MAX_PANEL_END_TIME,
    MIN_FOCUSABLE_PANEL_RANGE_MS,
    MIN_NAVIGATOR_RANGE_MS,
    MIN_PANEL_RANGE_MS,
} from './constants/TimeRangeConstants';
import type {
    PanelRangeControlHandlers,
    PanelRangeUpdate,
    RangeDirection,
    RangeSetter,
} from './types/PanelRangeControlTypes';
import type { ValueRange } from '../../TagAnalyzerCommonTypes';
import type { TimeRangeMs } from './types/TimeTypes';

/**
 * Converts a navigator drag event into a concrete time range.
 * Intent: Enforce a minimum navigator span before the range is applied to the chart.
 * @param {ValueRange} event - The raw range selection event from the navigator.
 * @returns {TimeRangeMs} The normalized navigator range.
 */
export function getNavigatorRangeFromEvent(event: ValueRange): TimeRangeMs {
    const sStartTime = event.min;
    const sEndTime = Math.max(event.max, sStartTime + MIN_NAVIGATOR_RANGE_MS);

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Shrinks a panel range around its center by the requested zoom amount.
 * Intent: Keep zoom-in behavior centered and bounded by the minimum panel width.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {number} zoom - The zoom factor to apply.
 * @returns {TimeRangeMs} The zoomed-in panel range.
 */
export function getZoomInPanelRange(panelRange: TimeRangeMs, zoom = 0): TimeRangeMs {
    const sCalcTime = getRangeWidth(panelRange) * zoom;
    const sStartTime = panelRange.startTime + sCalcTime;
    const sEndTime = Math.max(panelRange.endTime - sCalcTime, sStartTime + MIN_PANEL_RANGE_MS);

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Expands a panel range and updates the navigator when the new range escapes it.
 * Intent: Keep zoom-out interactions synchronized between the main panel and the overview.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @param {number} zoom - The zoom factor to apply.
 * @returns {PanelRangeUpdate} The updated panel and optional navigator ranges.
 */
export function getZoomOutRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    zoom = 0,
): PanelRangeUpdate {
    const sOffset = getRangeWidth(panelRange) * zoom;
    let sStartTime = panelRange.startTime - sOffset;
    let sEndTime = panelRange.endTime + sOffset;

    if (sStartTime <= 0) {
        sStartTime = navigatorRange.startTime;
    }

    if (sEndTime > MAX_PANEL_END_TIME) {
        sEndTime = MAX_PANEL_END_TIME;
    }

    const sNextPanelRange = { startTime: sStartTime, endTime: sEndTime };

    return {
        panelRange: sNextPanelRange,
        navigatorRange: isRangeOutsideBounds(sNextPanelRange, navigatorRange)
            ? sNextPanelRange
            : undefined,
    };
}

/**
 * Creates a focused panel range and matching navigator range around the current center.
 * Intent: Provide a quick way to narrow attention to the current panel window.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @returns {PanelRangeUpdate | undefined} The focused ranges, or undefined when the panel is too small.
 */
export function getFocusedPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): PanelRangeUpdate | undefined {
    const sPanelWidth = getRangeWidth(panelRange);
    if (sPanelWidth < MIN_FOCUSABLE_PANEL_RANGE_MS) {
        return undefined;
    }

    const sNavigatorWidth = getRangeWidth(navigatorRange);
    const sFocusedNavigatorWidth = Math.max(sPanelWidth, sNavigatorWidth / 2);
    const sPanelCenterTime = panelRange.startTime + sPanelWidth / 2;

    return {
        panelRange: {
            startTime: panelRange.startTime + sPanelWidth * 0.4,
            endTime: panelRange.startTime + sPanelWidth * 0.6,
        },
        navigatorRange: getClampedNavigatorFocusRange(
            navigatorRange,
            sPanelCenterTime,
            sFocusedNavigatorWidth,
        ),
    };
}

/**
 * Builds the panel and navigator range control handlers.
 * Intent: Package the shift and zoom actions behind a single handler factory.
 * @param {RangeSetter} setExtremes - The callback that applies the resolved ranges.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @returns {{ shiftHandlers: PanelShiftHandlers; zoomHandlers: PanelZoomHandlers }} The control handlers for the chart.
 */
export function createPanelRangeControlHandlers(
    setExtremes: RangeSetter,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): PanelRangeControlHandlers {
    return {
        shiftHandlers: {
            onShiftPanelRangeLeft: () =>
                applyRangeUpdate(
                    setExtremes,
                    getMovedPanelRange(panelRange, navigatorRange, 'left'),
                ),
            onShiftPanelRangeRight: () =>
                applyRangeUpdate(
                    setExtremes,
                    getMovedPanelRange(panelRange, navigatorRange, 'right'),
                ),
            onShiftNavigatorRangeLeft: () =>
                applyRangeUpdate(
                    setExtremes,
                    getMovedNavigatorRange(panelRange, navigatorRange, 'left'),
                ),
            onShiftNavigatorRangeRight: () =>
                applyRangeUpdate(
                    setExtremes,
                    getMovedNavigatorRange(panelRange, navigatorRange, 'right'),
                ),
        },
        zoomHandlers: {
            onZoomIn: (zoom: number) =>
                setExtremes(getZoomInPanelRange(panelRange, zoom), undefined),
            onZoomOut: (zoom: number) =>
                applyRangeUpdate(
                    setExtremes,
                    getZoomOutRange(panelRange, navigatorRange, zoom),
                ),
            onFocus: () =>
                applyRangeUpdate(setExtremes, getFocusedPanelRange(panelRange, navigatorRange)),
        },
    };
}

/**
 * Shifts the panel range and adjusts the navigator when the panel would leave it.
 * Intent: Keep panel movement aligned with the visible overview window.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @param {RangeDirection} direction - The direction to move the panel.
 * @returns {PanelRangeUpdate} The shifted panel range and optional navigator range.
 */
export function getMovedPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(panelRange), direction);
    const sNextPanelRange = shiftTimeRange(panelRange, sOffset);

    return {
        panelRange: sNextPanelRange,
        navigatorRange:
            direction === 'left'
                ? navigatorRange.startTime > sNextPanelRange.startTime
                    ? {
                          startTime: sNextPanelRange.startTime,
                          endTime: navigatorRange.endTime + sOffset,
                      }
                    : undefined
                : navigatorRange.endTime < sNextPanelRange.endTime
                  ? {
                        startTime: navigatorRange.startTime + sOffset,
                        endTime: sNextPanelRange.endTime,
                    }
                  : undefined,
    };
}

/**
 * Shifts both the panel and navigator ranges by the same offset.
 * Intent: Preserve the relative view while the overview window is being dragged.
 * @param {TimeRangeMs} panelRange - The current panel range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @param {RangeDirection} direction - The direction to move the navigator.
 * @returns {PanelRangeUpdate} The shifted panel and navigator ranges.
 */
export function getMovedNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(getRangeWidth(navigatorRange), direction);

    return {
        panelRange: shiftTimeRange(panelRange, sOffset),
        navigatorRange: shiftTimeRange(navigatorRange, sOffset),
    };
}

/**
 * Centers a navigator focus range while keeping it inside the navigator bounds.
 * Intent: Prevent focus mode from moving the overview window outside its valid range.
 * @param {TimeRangeMs} navigatorRange - The current navigator range.
 * @param {number} centerTime - The center point for the focused range.
 * @param {number} nextWidth - The requested width for the focused range.
 * @returns {TimeRangeMs} The clamped focused navigator range.
 */
function getClampedNavigatorFocusRange(
    navigatorRange: TimeRangeMs,
    centerTime: number,
    nextWidth: number,
): TimeRangeMs {
    let sStartTime = centerTime - nextWidth / 2;
    let sEndTime = centerTime + nextWidth / 2;

    if (sStartTime < navigatorRange.startTime) {
        sEndTime += navigatorRange.startTime - sStartTime;
        sStartTime = navigatorRange.startTime;
    }

    if (sEndTime > navigatorRange.endTime) {
        sStartTime -= sEndTime - navigatorRange.endTime;
        sEndTime = navigatorRange.endTime;
    }

    if (sStartTime < navigatorRange.startTime) {
        sStartTime = navigatorRange.startTime;
    }

    return { startTime: sStartTime, endTime: sEndTime };
}

/**
 * Calculates the width of a time range.
 * Intent: Reuse the same width calculation across zoom and shift helpers.
 * @param {TimeRangeMs} range - The time range to measure.
 * @returns {number} The range width in milliseconds.
 */
function getRangeWidth(range: TimeRangeMs): number {
    return range.endTime - range.startTime;
}

/**
 * Shifts a time range by a fixed offset.
 * Intent: Provide a shared primitive for moving panel and navigator ranges together.
 * @param {TimeRangeMs} range - The range to shift.
 * @param {number} offset - The offset to add to both range edges.
 * @returns {TimeRangeMs} The shifted time range.
 */
function shiftTimeRange(range: TimeRangeMs, offset: number): TimeRangeMs {
    return {
        startTime: range.startTime + offset,
        endTime: range.endTime + offset,
    };
}

/**
 * Converts a range width and direction into a signed offset.
 * Intent: Keep left and right movement rules symmetric around the current range width.
 * @param {number} rangeWidth - The width of the range being moved.
 * @param {RangeDirection} direction - The direction of movement.
 * @returns {number} The signed offset to apply.
 */
function getDirectionOffset(rangeWidth: number, direction: RangeDirection): number {
    const sHalfWidth = rangeWidth / 2;
    return direction === 'left' ? -sHalfWidth : sHalfWidth;
}

/**
 * Checks whether a range extends outside another range.
 * Intent: Decide when zooming out must also expand the navigator window.
 * @param {TimeRangeMs} range - The range to inspect.
 * @param {TimeRangeMs} bounds - The bounds to compare against.
 * @returns {boolean} True when the range leaves the bounds.
 */
function isRangeOutsideBounds(range: TimeRangeMs, bounds: TimeRangeMs): boolean {
    return range.startTime < bounds.startTime || range.endTime > bounds.endTime;
}

/**
 * Applies a range update when one was produced.
 * Intent: Keep the handler callbacks free from repeated null checks.
 * @param {RangeSetter} setExtremes - The callback that consumes the updated ranges.
 * @param {PanelRangeUpdate | undefined} rangeUpdate - The computed range update.
 * @returns {void} Nothing.
 */
function applyRangeUpdate(
    setExtremes: RangeSetter,
    rangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!rangeUpdate) {
        return;
    }

    setExtremes(rangeUpdate.panelRange, rangeUpdate.navigatorRange);
}
