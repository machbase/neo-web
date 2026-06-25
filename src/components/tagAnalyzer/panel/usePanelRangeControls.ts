import { useRef } from 'react';
import { Toast } from '@/design-system/components';
import type {
    PanelDisplayRangeState,
    PanelRangeState,
} from '../domain/panel/PanelConfig';
import type {
    PanelNavigatorShiftActions,
    PanelRangeActions,
    PanelRangeChangeEvent,
    PanelZoomActions,
} from '../domain/panel/PanelActions';
import type { TimeRangeInput, TimeRangeMs } from '../domain/time/TimeTypes';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isValidTimeRange,
    shiftTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    getMinimumRangeAmount,
    MIN_NUMERIC_RANGE_AMOUNT,
    MIN_PANEL_RANGE_MS,
    type PanelRangeChangeOptions,
} from '../domain/panelRange/PanelRangeApply';
import { formatNumericValue } from '../domain/panelRange/PanelRangeInput';
import { formatAbsoluteTimeExpression } from '../domain/time/TimeRangeInputResolver';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const PANEL_RANGE_SHIFT_FRACTION = 0.3;
const NAVIGATOR_RANGE_SHIFT_FRACTION = 0.1;
const FOCUS_ZOOM_HALF_WIDTH_FRACTION = 0.1;
const PANEL_NOT_INITIALIZED_DRAG_MESSAGE =
    'Panel is not fully initialized; cannot drag yet.';
const PANEL_NOT_INITIALIZED_TOAST_INTERVAL_MS = 2000;

type ApplyPanelRangeChange = (
    rangeState: PanelRangeState,
    options?: PanelRangeChangeOptions,
) => void;

type UsePanelRangeControlsParams = {
    requestRangeState: PanelRangeState;
    displayRangeState: PanelDisplayRangeState;
    isNumericXAxis: boolean;
    onRangeStateChange: ApplyPanelRangeChange;
};

type PanelRangeControls = {
    rangeActions: PanelRangeActions;
    navigatorShiftActions: PanelNavigatorShiftActions;
    zoomActions: PanelZoomActions;
};

type RangeShiftDirection = -1 | 1;

export function usePanelRangeControls({
    requestRangeState,
    displayRangeState,
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

    function resolveApplyRangeFromEvent(
        event: PanelRangeChangeEvent,
        minimumDateTimeRangeMs: number,
    ): TimeRangeMs | undefined {
        if (
            !hasConcreteRequestRangeState(requestRangeState) ||
            !hasConcreteDisplayRangeState(displayRangeState)
        ) {
            showPanelNotInitializedToast();
            return undefined;
        }

        return getMinimumAxisRangeFromEvent(
            event,
            displayRangeState.displayNavigatorRange,
            isNumericXAxis,
            minimumDateTimeRangeMs,
        );
    }

    function applyMainRangeChange(
        event: PanelRangeChangeEvent,
        deriveNavigatorRange?: (panelRange: TimeRangeMs) => TimeRangeMs,
    ): void {
        const sPanelRange = resolveApplyRangeFromEvent(event, MIN_PANEL_RANGE_MS);
        if (sPanelRange === undefined) return;

        const sNavigatorRange = deriveNavigatorRange?.(sPanelRange);

        onRangeStateChange({
            ...requestRangeState,
            requestPanelRange: sPanelRange,
            ...(sNavigatorRange && {
                requestNavigatorRange: sNavigatorRange,
            }),
        });
    }
    function applyExactNavigatorRange(
        event: PanelRangeChangeEvent,
        requestNavigatorRangeInput?: TimeRangeInput,
    ): void {
        const sNavigatorRange = resolveApplyRangeFromEvent(
            event,
            MIN_NAVIGATOR_RANGE_MS,
        );
        if (sNavigatorRange === undefined) return;

        onRangeStateChange({
            ...requestRangeState,
            requestPanelRange: clampTimeRangeToBounds(
                requestRangeState.requestPanelRange,
                sNavigatorRange,
            ),
            requestNavigatorRange: sNavigatorRange,
            requestNavigatorRangeInput:
                requestNavigatorRangeInput ?? createConcreteNavigatorRangeInput(
                    sNavigatorRange,
                    isNumericXAxis,
                ),
        });
    }
    function applyZoom(zoom: number, direction: 'in' | 'out'): void {
        const sDisplayPanelRange = displayRangeState.displayPanelRange;
        const sDisplayNavigatorRange = displayRangeState.displayNavigatorRange;
        const sSignedOffset =
            getTimeRangeWidth(sDisplayPanelRange) *
            zoom *
            (direction === 'in' ? 1 : -1);
        const sRawRange = createTimeRangeMs(
            sDisplayPanelRange.startTime + sSignedOffset,
            sDisplayPanelRange.endTime - sSignedOffset,
        );
        const sPanelRange =
            direction === 'in'
                ? ensureMinimumAxisRangeWidth(
                      sRawRange,
                      sDisplayPanelRange,
                      isNumericXAxis,
                      MIN_PANEL_RANGE_MS,
                  )
                : sRawRange;

        onRangeStateChange(
            {
                ...requestRangeState,
                requestPanelRange: sPanelRange,
            },
            {
                navigatorSelectionCenterRatio: getSelectionCenterRatio(
                    sDisplayPanelRange,
                    sDisplayNavigatorRange,
                ),
            },
        );
    }

    return {
        rangeActions: {
            applyMainZoomRange: (event) => applyMainRangeChange(event),
            applyMainNavigatorSelectionRange: (event) => applyMainRangeChange(event),
            applyExactMainRange: (event) =>
                applyMainRangeChange(event, (panelRange) =>
                    getNavigatorRangeForExactMainRange(
                        panelRange,
                        getCurrentNavigatorRange(
                            requestRangeState,
                            displayRangeState,
                        ),
                    ),
                ),
            applyExactNavigatorRange,
            shiftMainRangeLeft: () =>
                onRangeStateChange(
                    getShiftedPanelRangeState(
                        requestRangeState,
                        displayRangeState,
                        isNumericXAxis,
                        -1,
                    ),
                ),
            shiftMainRangeRight: () =>
                onRangeStateChange(
                    getShiftedPanelRangeState(
                        requestRangeState,
                        displayRangeState,
                        isNumericXAxis,
                        1,
                    ),
                ),
        },
        navigatorShiftActions: {
            onShiftLeft: () =>
                onRangeStateChange(
                    getShiftedNavigatorRangeState(
                        requestRangeState,
                        displayRangeState,
                        isNumericXAxis,
                        -1,
                    ),
                ),
            onShiftRight: () =>
                onRangeStateChange(
                    getShiftedNavigatorRangeState(
                        requestRangeState,
                        displayRangeState,
                        isNumericXAxis,
                        1,
                    ),
                ),
        },
        zoomActions: {
            onZoomIn: (zoom: number) => applyZoom(zoom, 'in'),
            onZoomOut: (zoom: number) => applyZoom(zoom, 'out'),
            onFocus: () => {
                const sCurrentPanelRange = displayRangeState.displayPanelRange;
                const sHalfWidth =
                    getTimeRangeWidth(sCurrentPanelRange) * FOCUS_ZOOM_HALF_WIDTH_FRACTION;
                const sPanelCenterTime = getTimeRangeCenter(sCurrentPanelRange);
                const sFocusedPanelRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(
                        sPanelCenterTime - sHalfWidth,
                        sPanelCenterTime + sHalfWidth,
                    ),
                    sCurrentPanelRange,
                    isNumericXAxis,
                    MIN_PANEL_RANGE_MS,
                );

                onRangeStateChange({
                    ...requestRangeState,
                    requestPanelRange: sFocusedPanelRange,
                    requestNavigatorRange: sCurrentPanelRange,
                });
            },
        },
    };
}

function getMinimumAxisRangeFromEvent(
    event: PanelRangeChangeEvent,
    referenceRange: TimeRangeMs,
    isNumericXAxis: boolean,
    minimumDateTimeRangeMs: number,
): TimeRangeMs | undefined {
    const sRequestedRange = createTimeRangeMs(event.min, event.max);
    if (
        !Number.isFinite(sRequestedRange.startTime) ||
        !Number.isFinite(sRequestedRange.endTime)
    ) {
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

function getNavigatorRangeForExactMainRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return createTimeRangeMs(
        Math.min(panelRange.startTime, navigatorRange.startTime),
        Math.max(panelRange.endTime, navigatorRange.endTime),
    );
}

function hasConcreteRequestRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.requestPanelRange) &&
        isValidTimeRange(rangeState.requestNavigatorRange)
    );
}
function hasConcreteDisplayRangeState(rangeState: PanelDisplayRangeState): boolean {
    return (
        isValidTimeRange(rangeState.displayPanelRange) &&
        isValidTimeRange(rangeState.displayNavigatorRange)
    );
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
    requestRangeState: PanelRangeState,
    displayRangeState: PanelDisplayRangeState,
    isNumericXAxis: boolean,
    direction: RangeShiftDirection,
): PanelRangeState {
    void isNumericXAxis;
    const sDisplayPanelRange = displayRangeState.displayPanelRange;
    const sOffset = getRangeShiftOffset(
        sDisplayPanelRange,
        direction,
        PANEL_RANGE_SHIFT_FRACTION,
    );
    const sPanelRange = shiftTimeRange(sDisplayPanelRange, sOffset);

    const sCurrentNavigatorRange = getCurrentNavigatorRange(
        requestRangeState,
        displayRangeState,
    );
    let sNavigatorRange = sCurrentNavigatorRange;
    if (direction < 0 && sPanelRange.startTime < sCurrentNavigatorRange.startTime) {
        sNavigatorRange = createTimeRangeMs(
            sPanelRange.startTime,
            sCurrentNavigatorRange.endTime + sOffset,
        );
    } else if (direction > 0 && sPanelRange.endTime > sCurrentNavigatorRange.endTime) {
        sNavigatorRange = createTimeRangeMs(
            sCurrentNavigatorRange.startTime + sOffset,
            sPanelRange.endTime,
        );
    }
    return {
        ...requestRangeState,
        requestPanelRange: sPanelRange,
        requestNavigatorRange: sNavigatorRange,
    };
}
function getShiftedNavigatorRangeState(
    rangeState: PanelRangeState,
    displayRangeState: PanelDisplayRangeState,
    isNumericXAxis: boolean,
    direction: RangeShiftDirection,
): PanelRangeState {
    void isNumericXAxis;
    const sCurrentNavigatorRange = getCurrentNavigatorRange(
        rangeState,
        displayRangeState,
    );
    const sNavigatorRange = shiftTimeRange(
        sCurrentNavigatorRange,
        getRangeShiftOffset(
            sCurrentNavigatorRange,
            direction,
            NAVIGATOR_RANGE_SHIFT_FRACTION,
        ),
    );

    return {
        ...rangeState,
        requestPanelRange: clampTimeRangeToBounds(
            rangeState.requestPanelRange,
            sNavigatorRange,
        ),
        requestNavigatorRange: sNavigatorRange,
    };
}
function getCurrentNavigatorRange(
    rangeState: PanelRangeState,
    displayRangeState: PanelDisplayRangeState,
): TimeRangeMs {
    if (rangeState.requestNavigatorRangeInput === undefined) {
        return displayRangeState.displayNavigatorRange;
    }

    return isValidTimeRange(rangeState.requestNavigatorRange)
        ? rangeState.requestNavigatorRange
        : displayRangeState.displayNavigatorRange;
}

function createConcreteNavigatorRangeInput(
    range: TimeRangeMs,
    isNumericAxis: boolean,
): TimeRangeInput {
    return {
        start: formatNavigatorRangeValue(range.startTime, isNumericAxis),
        end: formatNavigatorRangeValue(range.endTime, isNumericAxis),
    };
}

function formatNavigatorRangeValue(
    value: number,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericValue(value)
        : formatAbsoluteTimeExpression(value);
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
