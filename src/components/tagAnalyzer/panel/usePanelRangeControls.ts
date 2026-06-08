import { useRef } from 'react';
import { Toast } from '@/design-system/components';
import type {
    PanelNavigatorShiftActions,
    PanelRangeChangeEvent,
    PanelRangeHandlers,
    PanelRangeState,
    PanelZoomActions,
} from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isConcreteTimeRange,
    isTimeRangeOutsideBounds,
    shiftTimeRange,
} from '../domain/time/TimeRangeUtils';
import type { PanelRangeStateApplyOptions } from '../board/BoardPanelState';
import {
    getMinNumericRangeAmount,
    MIN_PANEL_RANGE_MS,
} from '../board/PanelNavigatorRangeLimits';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const PANEL_RANGE_SHIFT_FRACTION = 0.3;
const NAVIGATOR_RANGE_SHIFT_FRACTION = 0.1;
const MAX_PANEL_END_TIME = 9999999999999;
const PANEL_NOT_INITIALIZED_DRAG_MESSAGE =
    'Panel is not fully initialized; cannot drag yet.';
const PANEL_NOT_INITIALIZED_TOAST_INTERVAL_MS = 2000;

type ApplyPanelRangeState = (
    rangeState: PanelRangeState,
    options?: PanelRangeStateApplyOptions,
) => void;

type UsePanelRangeControlsParams = {
    rangeState: PanelRangeState;
    isNumericXAxis: boolean;
    onRangeStateChange: ApplyPanelRangeState;
};

type PanelRangeControls = {
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    zoomActions: PanelZoomActions;
};

export function usePanelRangeControls({
    rangeState,
    isNumericXAxis,
    onRangeStateChange,
}: UsePanelRangeControlsParams): PanelRangeControls {
    const lastNotInitializedToastTimeRef = useRef(0);

    function showPanelNotInitializedToast(): void {
        const sCurrentTime = Date.now();

        if (
            sCurrentTime - lastNotInitializedToastTimeRef.current <
            PANEL_NOT_INITIALIZED_TOAST_INTERVAL_MS
        ) {
            return;
        }

        lastNotInitializedToastTimeRef.current = sCurrentTime;
        Toast.warning(PANEL_NOT_INITIALIZED_DRAG_MESSAGE, undefined);
    }

    const setMainRange = (
        panelRange: TimeRangeMs,
        options?: PanelRangeStateApplyOptions,
    ): void => {
        onRangeStateChange(
            {
                panelRange,
                navigatorRange: rangeState.navigatorRange,
                fullRange: rangeState.fullRange,
            },
            options,
        );
    };
    const setNavigatorRange = (
        navigatorRange: TimeRangeMs,
        options?: PanelRangeStateApplyOptions,
    ): void => {
        onRangeStateChange(
            {
                panelRange: rangeState.panelRange,
                navigatorRange,
                fullRange: rangeState.fullRange,
            },
            options,
        );
    };

    return {
        rangeHandlers: {
            onPanelRangeChange: (event: PanelRangeChangeEvent) => {
                if (!hasConcreteInteractiveRangeState(rangeState)) {
                    showPanelNotInitializedToast();
                    return;
                }

                const sRequestedPanelRange = createTimeRangeMs(
                    event.min,
                    event.max,
                );
                if (!isFiniteRangeEvent(sRequestedPanelRange)) {
                    return;
                }

                onRangeStateChange(
                    getPanelRangeChangeState(
                        rangeState,
                        sRequestedPanelRange,
                        false,
                        isNumericXAxis,
                    ),
                    {
                        preserveNavigatorRange: false,
                    },
                );
            },
            onPanelRangeChangeFromNavigator: (event: PanelRangeChangeEvent) => {
                if (!hasConcreteInteractiveRangeState(rangeState)) {
                    showPanelNotInitializedToast();
                    return;
                }

                const sRequestedPanelRange = createTimeRangeMs(
                    event.min,
                    event.max,
                );
                if (!isFiniteRangeEvent(sRequestedPanelRange)) {
                    return;
                }

                onRangeStateChange(
                    getPanelRangeChangeState(
                        rangeState,
                        sRequestedPanelRange,
                        true,
                        isNumericXAxis,
                    ),
                    {
                        preserveNavigatorRange: true,
                    },
                );
            },
            onNavigatorRangeChange: (event: PanelRangeChangeEvent) => {
                if (!isConcreteTimeRange(rangeState.panelRange)) {
                    showPanelNotInitializedToast();
                    return;
                }

                const sNavigatorRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(event.min, event.max),
                    rangeState.navigatorRange,
                    isNumericXAxis,
                    MIN_NAVIGATOR_RANGE_MS,
                );
                if (!isConcreteTimeRange(sNavigatorRange)) {
                    return;
                }

                setNavigatorRange(sNavigatorRange);
            },
            onShiftPanelRangeLeft: () =>
                onRangeStateChange(getShiftedPanelRangeState(rangeState, -1)),
            onShiftPanelRangeRight: () =>
                onRangeStateChange(getShiftedPanelRangeState(rangeState, 1)),
        },
        navigatorShiftActions: {
            onShiftLeft: () =>
                onRangeStateChange(getShiftedNavigatorRangeState(rangeState, -1)),
            onShiftRight: () =>
                onRangeStateChange(getShiftedNavigatorRangeState(rangeState, 1)),
        },
        zoomActions: {
            onZoomIn: (zoom: number) => {
                const sOffset = getTimeRangeWidth(rangeState.panelRange) * zoom;
                const sPanelRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(
                        rangeState.panelRange.startTime + sOffset,
                        rangeState.panelRange.endTime - sOffset,
                    ),
                    rangeState.panelRange,
                    isNumericXAxis,
                    MIN_PANEL_RANGE_MS,
                );

                setMainRange(sPanelRange);
            },
            onZoomOut: (zoom: number) => {
                const sOffset = getTimeRangeWidth(rangeState.panelRange) * zoom;
                const sExpandedStartTime =
                    rangeState.panelRange.startTime - sOffset;
                const sExpandedEndTime = rangeState.panelRange.endTime + sOffset;
                const sNextStartTime =
                    isNumericXAxis || sExpandedStartTime > 0
                        ? sExpandedStartTime
                        : rangeState.navigatorRange.startTime;
                const sNextEndTime = isNumericXAxis
                    ? sExpandedEndTime
                    : Math.min(sExpandedEndTime, MAX_PANEL_END_TIME);
                const sPanelRange = createTimeRangeMs(
                    sNextStartTime,
                    sNextEndTime,
                );
                const sNavigatorRange = isTimeRangeOutsideBounds(
                    sPanelRange,
                    rangeState.navigatorRange,
                )
                    ? sPanelRange
                    : rangeState.navigatorRange;

                onRangeStateChange({
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                    fullRange: rangeState.fullRange,
                });
            },
            onFocus: () => {
                const sPanelTotalRangeAmount = getTimeRangeWidth(rangeState.panelRange);
                const sMinimumFocusableRangeAmount = isNumericXAxis
                    ? getMinNumericRangeAmount(rangeState.navigatorRange)
                    : MIN_FOCUSABLE_PANEL_RANGE_MS;

                if (sPanelTotalRangeAmount < sMinimumFocusableRangeAmount) {
                    return;
                }

                const sPanelCenterTime = getTimeRangeCenter(rangeState.panelRange);
                const sFocusedNavigatorTotalRangeAmount = Math.min(
                    Math.max(
                        sPanelTotalRangeAmount,
                        getTimeRangeWidth(rangeState.navigatorRange) / 2,
                    ),
                    getTimeRangeWidth(rangeState.navigatorRange),
                );
                const sNavigatorStartTime = Math.min(
                    Math.max(
                        sPanelCenterTime - sFocusedNavigatorTotalRangeAmount / 2,
                        rangeState.navigatorRange.startTime,
                    ),
                    rangeState.navigatorRange.endTime - sFocusedNavigatorTotalRangeAmount,
                );
                const sPanelRange = createTimeRangeMs(
                    sPanelCenterTime - sPanelTotalRangeAmount * 0.1,
                    sPanelCenterTime + sPanelTotalRangeAmount * 0.1,
                );
                const sNavigatorRange = createTimeRangeMs(
                    sNavigatorStartTime,
                    sNavigatorStartTime + sFocusedNavigatorTotalRangeAmount,
                );

                onRangeStateChange({
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                    fullRange: rangeState.fullRange,
                });
            },
        },
    };
}

type RangeShiftDirection = -1 | 1;

function hasConcreteInteractiveRangeState(rangeState: PanelRangeState): boolean {
    return (
        isConcreteTimeRange(rangeState.panelRange) &&
        isConcreteTimeRange(rangeState.navigatorRange)
    );
}

function isFiniteRangeEvent(range: TimeRangeMs): boolean {
    return Number.isFinite(range.startTime) && Number.isFinite(range.endTime);
}

function getRangeShiftOffset(
    range: TimeRangeMs,
    direction: RangeShiftDirection,
    shiftFraction: number,
): number {
    return getTimeRangeWidth(range) * shiftFraction * direction;
}

function getShiftedPanelRangeState(
    rangeState: PanelRangeState,
    direction: RangeShiftDirection,
): PanelRangeState {
    const sOffset = getRangeShiftOffset(
        rangeState.panelRange,
        direction,
        PANEL_RANGE_SHIFT_FRACTION,
    );
    const sPanelRange = shiftTimeRange(rangeState.panelRange, sOffset);

    if (
        direction < 0 &&
        sPanelRange.startTime < rangeState.navigatorRange.startTime
    ) {
        return {
            panelRange: sPanelRange,
            navigatorRange: createTimeRangeMs(
                sPanelRange.startTime,
                rangeState.navigatorRange.endTime + sOffset,
            ),
            fullRange: rangeState.fullRange,
        };
    }

    if (
        direction > 0 &&
        sPanelRange.endTime > rangeState.navigatorRange.endTime
    ) {
        return {
            panelRange: sPanelRange,
            navigatorRange: createTimeRangeMs(
                rangeState.navigatorRange.startTime + sOffset,
                sPanelRange.endTime,
            ),
            fullRange: rangeState.fullRange,
        };
    }

    return {
        panelRange: sPanelRange,
        navigatorRange: rangeState.navigatorRange,
        fullRange: rangeState.fullRange,
    };
}

function getShiftedNavigatorRangeState(
    rangeState: PanelRangeState,
    direction: RangeShiftDirection,
): PanelRangeState {
    const sNavigatorRange = shiftTimeRange(
        rangeState.navigatorRange,
        getRangeShiftOffset(
            rangeState.navigatorRange,
            direction,
            NAVIGATOR_RANGE_SHIFT_FRACTION,
        ),
    );

    return {
        panelRange: clampTimeRangeToBounds(rangeState.panelRange, sNavigatorRange),
        navigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
    };
}

function getPanelRangeChangeState(
    rangeState: PanelRangeState,
    requestedPanelRange: TimeRangeMs,
    preserveNavigatorRange: boolean,
    isNumericXAxis: boolean,
): PanelRangeState {
    const sPanelRange = preserveNavigatorRange
        ? clampTimeRangeToBounds(requestedPanelRange, rangeState.navigatorRange)
        : clampTimeRangeToBounds(
              ensureMinimumAxisRangeWidth(
                  requestedPanelRange,
                  rangeState.navigatorRange,
                  isNumericXAxis,
                  MIN_PANEL_RANGE_MS,
              ),
              rangeState.navigatorRange,
          );

    return {
        panelRange: sPanelRange,
        navigatorRange: rangeState.navigatorRange,
        fullRange: rangeState.fullRange,
    };
}

function ensureMinimumAxisRangeWidth(
    range: TimeRangeMs,
    referenceRange: TimeRangeMs,
    isNumericXAxis: boolean,
    minimumDateTimeRangeMs: number,
): TimeRangeMs {
    if (!isNumericXAxis) {
        return ensureMinimumTimeRangeWidth(range, minimumDateTimeRangeMs);
    }

    if (range.endTime > range.startTime) {
        return range;
    }

    return createTimeRangeMs(
        range.startTime,
        range.startTime + getMinNumericRangeAmount(referenceRange),
    );
}
