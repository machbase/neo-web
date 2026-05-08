import type { ResolvedTimeRangeMs } from '../../time/TimeTypes';
import type { PanelRangeHandlers, PanelZoomHandlers } from '../PanelTypes';

const MAX_PANEL_END_TIME = 9999999999999;
const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const RANGE_SHIFT_FRACTION = 0.1;

type RangeDirection = 'left' | 'right';

type RangeSetter = (
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs | undefined,
) => void;

type PanelRangeUpdate = {
    panelRange: ResolvedTimeRangeMs;
    navigatorRange: ResolvedTimeRangeMs | undefined;
};

type PanelRangeControlHandlers = {
    shiftHandlers: Pick<
        PanelRangeHandlers,
        | 'onShiftPanelRangeLeft'
        | 'onShiftPanelRangeRight'
        | 'onShiftNavigatorRangeLeft'
        | 'onShiftNavigatorRangeRight'
    >;
    zoomHandlers: PanelZoomHandlers;
};

export function normalizeNavigatorRange(navigatorRange: ResolvedTimeRangeMs): ResolvedTimeRangeMs {
    const sStartTime = navigatorRange.startTime;
    const sEndTime = Math.max(
        navigatorRange.endTime,
        sStartTime + MIN_NAVIGATOR_RANGE_MS,
    );

    return { startTime: sStartTime, endTime: sEndTime };
}

export function getZoomInPanelRange(panelRange: ResolvedTimeRangeMs, zoom = 0): ResolvedTimeRangeMs {
    const sCalcTime = getRangeWidth(panelRange) * zoom;
    const sStartTime = panelRange.startTime + sCalcTime;
    const sEndTime = Math.max(panelRange.endTime - sCalcTime, sStartTime + MIN_PANEL_RANGE_MS);

    return { startTime: sStartTime, endTime: sEndTime };
}

export function getZoomOutRange(
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
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

export function getFocusedPanelRange(
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
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

export function createPanelRangeControlHandlers(
    setExtremes: RangeSetter,
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
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

export function getMovedPanelRange(
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sOffset = getDirectionOffset(
        getRangeWidth(panelRange),
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
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
    direction: RangeDirection,
): PanelRangeUpdate {
    const sNavigatorWidth = getRangeWidth(navigatorRange);
    const sOffset = getDirectionOffset(
        sNavigatorWidth,
        direction,
        RANGE_SHIFT_FRACTION,
    );
    const sNextNavigatorRange = shiftTimeRange(navigatorRange, sOffset);

    return {
        panelRange: keepPanelRangeInsideNavigatorRange(
            panelRange,
            sNextNavigatorRange,
        ),
        navigatorRange: sNextNavigatorRange,
    };
}

function getClampedNavigatorFocusRange(
    navigatorRange: ResolvedTimeRangeMs,
    centerTime: number,
    nextWidth: number,
): ResolvedTimeRangeMs {
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

function getRangeWidth(range: ResolvedTimeRangeMs): number {
    return range.endTime - range.startTime;
}

function shiftTimeRange(range: ResolvedTimeRangeMs, offset: number): ResolvedTimeRangeMs {
    return {
        startTime: range.startTime + offset,
        endTime: range.endTime + offset,
    };
}

function getDirectionOffset(
    rangeWidth: number,
    direction: RangeDirection,
    shiftFraction: number,
): number {
    const sShiftWidth = rangeWidth * shiftFraction;
    return direction === 'left' ? -sShiftWidth : sShiftWidth;
}

function keepPanelRangeInsideNavigatorRange(
    panelRange: ResolvedTimeRangeMs,
    navigatorRange: ResolvedTimeRangeMs,
): ResolvedTimeRangeMs {
    const sPanelWidth = getRangeWidth(panelRange);
    const sNavigatorWidth = getRangeWidth(navigatorRange);

    if (sPanelWidth >= sNavigatorWidth) {
        return navigatorRange;
    }

    if (panelRange.startTime < navigatorRange.startTime) {
        return {
            startTime: navigatorRange.startTime,
            endTime: navigatorRange.startTime + sPanelWidth,
        };
    }

    if (panelRange.endTime > navigatorRange.endTime) {
        return {
            startTime: navigatorRange.endTime - sPanelWidth,
            endTime: navigatorRange.endTime,
        };
    }

    return panelRange;
}

function isRangeOutsideBounds(range: ResolvedTimeRangeMs, bounds: ResolvedTimeRangeMs): boolean {
    return range.startTime < bounds.startTime || range.endTime > bounds.endTime;
}

function applyRangeUpdate(
    setExtremes: RangeSetter,
    rangeUpdate: PanelRangeUpdate | undefined,
): void {
    if (!rangeUpdate) {
        return;
    }

    setExtremes(rangeUpdate.panelRange, rangeUpdate.navigatorRange);
}
