import { useRef } from 'react';
import { Toast } from '@/design-system/components';
import type {
    PanelNavigatorShiftActions,
    PanelRangeActions,
    PanelRangeChangeEvent,
    PanelRangeState,
    PanelZoomActions,
} from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isValidTimeRange,
    shiftTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import type { PanelRangeChangeOptions } from '../board/BoardPanelState';
import {
    getMinimumRangeAmount,
    MIN_NUMERIC_RANGE_AMOUNT,
    MIN_PANEL_RANGE_MS,
} from '../board/PanelNavigatorRangeLimits';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const PANEL_RANGE_SHIFT_FRACTION = 0.3;
const NAVIGATOR_RANGE_SHIFT_FRACTION = 0.1;
const PANEL_NOT_INITIALIZED_DRAG_MESSAGE =
    'Panel is not fully initialized; cannot drag yet.';
const PANEL_NOT_INITIALIZED_TOAST_INTERVAL_MS = 2000;

type ApplyPanelRangeChange = (
    rangeState: PanelRangeState,
    options?: PanelRangeChangeOptions,
) => void;

type UsePanelRangeControlsParams = {
    rangeState: PanelRangeState;
    isNumericXAxis: boolean;
    onRangeStateChange: ApplyPanelRangeChange;
};

type PanelRangeControls = {
    rangeActions: PanelRangeActions;
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
        options?: PanelRangeChangeOptions,
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
    function getFiniteEventRange(
        event: PanelRangeChangeEvent,
    ): TimeRangeMs | undefined {
        const sRange = createTimeRangeMs(event.min, event.max);

        return isFiniteRangeEvent(sRange) ? sRange : undefined;
    }

    function getMinimumAxisRangeFromEvent(
        event: PanelRangeChangeEvent,
        referenceRange: TimeRangeMs,
        minimumDateTimeRangeMs: number,
    ): TimeRangeMs | undefined {
        const sRequestedRange = getFiniteEventRange(event);

        if (sRequestedRange === undefined) {
            return undefined;
        }

        const sRange = ensureMinimumAxisRangeWidth(
            sRequestedRange,
            referenceRange,
            isNumericXAxis,
            minimumDateTimeRangeMs,
        );

        return isValidTimeRange(sRange) ? sRange : undefined;
    }

    function applyMainRangeWithinNavigator(event: PanelRangeChangeEvent): void {
        if (!hasConcreteInteractiveRangeState(rangeState)) {
            showPanelNotInitializedToast();
            return;
        }

        const sPanelRange = getMinimumAxisRangeFromEvent(
            event,
            rangeState.navigatorRange,
            MIN_PANEL_RANGE_MS,
        );
        if (sPanelRange === undefined) {
            return;
        }

        setMainRange(sPanelRange);
    }

    function applyExactMainRange(event: PanelRangeChangeEvent): void {
        if (!hasConcreteInteractiveRangeState(rangeState)) {
            showPanelNotInitializedToast();
            return;
        }

        const sPanelRange = getMinimumAxisRangeFromEvent(
            event,
            rangeState.navigatorRange,
            MIN_PANEL_RANGE_MS,
        );
        if (sPanelRange === undefined) {
            return;
        }

        onRangeStateChange({
            panelRange: sPanelRange,
            navigatorRange: getNavigatorRangeForExactMainRange(
                sPanelRange,
                rangeState.navigatorRange,
            ),
            fullRange: rangeState.fullRange,
        });
    }

    function applyExactNavigatorRange(event: PanelRangeChangeEvent): void {
        if (!hasConcreteInteractiveRangeState(rangeState)) {
            showPanelNotInitializedToast();
            return;
        }

        const sNavigatorRange = getMinimumAxisRangeFromEvent(
            event,
            rangeState.navigatorRange,
            MIN_NAVIGATOR_RANGE_MS,
        );
        if (sNavigatorRange === undefined) {
            return;
        }

        onRangeStateChange({
            panelRange: getPanelRangeForExactNavigatorRange(
                rangeState.panelRange,
                sNavigatorRange,
            ),
            navigatorRange: sNavigatorRange,
            fullRange: rangeState.fullRange,
        });
    }

    return {
        rangeActions: {
            applyMainZoomRange: applyMainRangeWithinNavigator,
            applyMainNavigatorSelectionRange: applyMainRangeWithinNavigator,
            applyExactMainRange,
            applyExactNavigatorRange,
            shiftMainRangeLeft: () =>
                onRangeStateChange(getShiftedPanelRangeState(rangeState, -1)),
            shiftMainRangeRight: () =>
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

                setMainRange(sPanelRange, {
                    navigatorSelectionCenterRatio: getSelectionCenterRatio(
                        rangeState.panelRange,
                        rangeState.navigatorRange,
                    ),
                });
            },
            onZoomOut: (zoom: number) => {
                const sOffset = getTimeRangeWidth(rangeState.panelRange) * zoom;
                const sPanelRange = createTimeRangeMs(
                    rangeState.panelRange.startTime - sOffset,
                    rangeState.panelRange.endTime + sOffset,
                );

                setMainRange(sPanelRange, {
                    navigatorSelectionCenterRatio: getSelectionCenterRatio(
                        rangeState.panelRange,
                        rangeState.navigatorRange,
                    ),
                });
            },
            onFocus: () => {
                const sCurrentPanelRange = rangeState.panelRange;
                const sPanelTotalRangeAmount = getTimeRangeWidth(sCurrentPanelRange);
                const sPanelCenterTime = getTimeRangeCenter(sCurrentPanelRange);
                const sFocusedPanelRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(
                        sPanelCenterTime - sPanelTotalRangeAmount * 0.1,
                        sPanelCenterTime + sPanelTotalRangeAmount * 0.1,
                    ),
                    sCurrentPanelRange,
                    isNumericXAxis,
                    MIN_PANEL_RANGE_MS,
                );

                onRangeStateChange({
                    panelRange: sFocusedPanelRange,
                    navigatorRange: sCurrentPanelRange,
                    fullRange: rangeState.fullRange,
                });
            },
        },
    };
}

function getNavigatorRangeForExactMainRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return createTimeRangeMs(
        Math.min(panelRange.startTime, navigatorRange.startTime),
        Math.max(panelRange.endTime, navigatorRange.endTime),
    );
}

function getPanelRangeForExactNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return clampTimeRangeToBounds(panelRange, navigatorRange);
}

type RangeShiftDirection = -1 | 1;

function hasConcreteInteractiveRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.panelRange) &&
        isValidTimeRange(rangeState.navigatorRange)
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

function getSelectionCenterRatio(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): number {
    const sNavigatorRangeWidth = getTimeRangeWidth(navigatorRange);
    if (sNavigatorRangeWidth <= 0) {
        throw new Error('Cannot calculate selection position for an invalid navigator range.');
    }

    return (
        (getTimeRangeCenter(panelRange) - navigatorRange.startTime) /
        sNavigatorRangeWidth
    );
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
        range.startTime +
            getMinimumRangeAmount(referenceRange, MIN_NUMERIC_RANGE_AMOUNT),
    );
}
