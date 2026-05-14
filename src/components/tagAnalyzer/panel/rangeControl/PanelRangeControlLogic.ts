import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isTimeRangeOutsideBounds,
    shiftTimeRange,
} from '../../domain/time/TimeRangeUtils';
import type { PanelRangeShiftActions, PanelZoomActions } from '../PanelTypes';

const MAX_PANEL_END_TIME = 9999999999999;
const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const RANGE_SHIFT_FRACTION = 0.1;

type RangeDirection = 'left' | 'right';

type RangeUpdateApplier = (
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs | undefined,
) => void;

type PanelRangeUpdate = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs | undefined;
};

type PanelRangeControlActions = {
    shiftActions: PanelRangeShiftActions;
    zoomActions: PanelZoomActions;
};

export function normalizeNavigatorRange(navigatorRange: TimeRangeMs): TimeRangeMs {
    return ensureMinimumTimeRangeWidth(navigatorRange, MIN_NAVIGATOR_RANGE_MS);
}

export function normalizeNavigatorRangeForPanelRange({
    panelRange,
    navigatorRange,
    navigatorPixelWidth,
    minSelectionPixelWidth = MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH,
}: {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    navigatorPixelWidth: number;
    minSelectionPixelWidth?: number;
}): TimeRangeMs {
    const sNavigatorRange = getPanelContainingNavigatorRange(
        panelRange,
        navigatorRange,
    );
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sNavigatorWidth = getTimeRangeWidth(sNavigatorRange);
    const sMinimumSelectionRatio = Math.min(
        Math.max(minSelectionPixelWidth, 0) / Math.max(navigatorPixelWidth, 1),
        1,
    );

    if (
        sPanelWidth <= 0 ||
        sNavigatorWidth <= 0 ||
        sMinimumSelectionRatio <= 0 ||
        sPanelWidth / sNavigatorWidth >= sMinimumSelectionRatio
    ) {
        return sNavigatorRange;
    }

    return getNarrowedNavigatorRangeContainingPanel(
        panelRange,
        Math.max(sPanelWidth, sPanelWidth / sMinimumSelectionRatio),
    );
}

export function getZoomInPanelRange(panelRange: TimeRangeMs, zoom = 0): TimeRangeMs {
    const sCalcTime = getTimeRangeWidth(panelRange) * zoom;
    const sStartTime = panelRange.startTime + sCalcTime;

    return ensureMinimumTimeRangeWidth(
        createTimeRangeMs(sStartTime, panelRange.endTime - sCalcTime),
        MIN_PANEL_RANGE_MS,
    );
}

export function getZoomOutRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    zoom = 0,
): PanelRangeUpdate {
    const sOffset = getTimeRangeWidth(panelRange) * zoom;
    let sStartTime = panelRange.startTime - sOffset;
    let sEndTime = panelRange.endTime + sOffset;

    if (sStartTime <= 0) {
        sStartTime = navigatorRange.startTime;
    }

    if (sEndTime > MAX_PANEL_END_TIME) {
        sEndTime = MAX_PANEL_END_TIME;
    }

    const sNextPanelRange = createTimeRangeMs(sStartTime, sEndTime);

    return {
        panelRange: sNextPanelRange,
        navigatorRange: isTimeRangeOutsideBounds(sNextPanelRange, navigatorRange)
            ? sNextPanelRange
            : undefined,
    };
}

export function getFocusedPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): PanelRangeUpdate | undefined {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    if (sPanelWidth < MIN_FOCUSABLE_PANEL_RANGE_MS) {
        return undefined;
    }

    const sNavigatorWidth = getTimeRangeWidth(navigatorRange);
    const sFocusedNavigatorWidth = Math.max(sPanelWidth, sNavigatorWidth / 2);
    const sPanelCenterTime = getTimeRangeCenter(panelRange);

    return {
        panelRange: {
            startTime: sPanelCenterTime - sPanelWidth * 0.1,
            endTime: sPanelCenterTime + sPanelWidth * 0.1,
        },
        navigatorRange: getClampedNavigatorFocusRange(
            navigatorRange,
            sPanelCenterTime,
            sFocusedNavigatorWidth,
        ),
    };
}

export function createPanelRangeControlActions(
    applyRangeControlUpdate: RangeUpdateApplier,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): PanelRangeControlActions {
    return {
        shiftActions: {
            onShiftPanelRangeLeft: () =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getMovedPanelRange(panelRange, navigatorRange, 'left'),
                ),
            onShiftPanelRangeRight: () =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getMovedPanelRange(panelRange, navigatorRange, 'right'),
                ),
            onShiftNavigatorRangeLeft: () =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getMovedNavigatorRange(panelRange, navigatorRange, 'left'),
                ),
            onShiftNavigatorRangeRight: () =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getMovedNavigatorRange(panelRange, navigatorRange, 'right'),
                ),
        },
        zoomActions: {
            onZoomIn: (zoom: number) =>
                applyRangeControlUpdate(getZoomInPanelRange(panelRange, zoom), undefined),
            onZoomOut: (zoom: number) =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getZoomOutRange(panelRange, navigatorRange, zoom),
                ),
            onFocus: () =>
                applyRangeUpdate(
                    applyRangeControlUpdate,
                    getFocusedPanelRange(panelRange, navigatorRange),
                ),
        },
    };
}

export function getMovedPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(
        getTimeRangeWidth(panelRange),
        direction,
        RANGE_SHIFT_FRACTION,
    );
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

export function getMovedNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sNavigatorWidth = getTimeRangeWidth(navigatorRange);
    const sOffset = getDirectionOffset(
        sNavigatorWidth,
        direction,
        RANGE_SHIFT_FRACTION,
    );
    const sNextNavigatorRange = shiftTimeRange(navigatorRange, sOffset);

    return {
        panelRange: clampTimeRangeToBounds(panelRange, sNextNavigatorRange),
        navigatorRange: sNextNavigatorRange,
    };
}

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

    return createTimeRangeMs(sStartTime, sEndTime);
}

function getPanelContainingNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return createTimeRangeMs(
        Math.min(panelRange.startTime, navigatorRange.startTime),
        Math.max(panelRange.endTime, navigatorRange.endTime),
    );
}

function getNarrowedNavigatorRangeContainingPanel(
    panelRange: TimeRangeMs,
    nextWidth: number,
): TimeRangeMs {
    const sPanelCenterTime = getTimeRangeCenter(panelRange);
    const sStartTime = sPanelCenterTime - nextWidth / 2;
    const sEndTime = sPanelCenterTime + nextWidth / 2;

    return createTimeRangeMs(sStartTime, sEndTime);
}

function getDirectionOffset(
    rangeWidth: number,
    direction: RangeDirection,
    shiftFraction: number,
): number {
    const sShiftWidth = rangeWidth * shiftFraction;
    return direction === 'left' ? -sShiftWidth : sShiftWidth;
}

function applyRangeUpdate(
    applyRangeControlUpdate: RangeUpdateApplier,
    rangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!rangeUpdate) {
        return;
    }

    applyRangeControlUpdate(rangeUpdate.panelRange, rangeUpdate.navigatorRange);
}
