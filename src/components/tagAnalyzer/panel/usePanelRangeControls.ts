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
import type { PanelRangeRefreshOptions } from './PanelDataRuntimeState';
import {
    getMinimumNumericRangeWidth,
    getNavigatorHandleMinimumRangeWidth,
    MIN_PANEL_RANGE_MS,
} from '../board/PanelNavigatorRangeLimits';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const RANGE_SHIFT_FRACTION = 0.1;
const MAX_PANEL_END_TIME = 9999999999999;

type CommitPanelRangeState = (
    rangeState: PanelRangeState,
    options?: PanelRangeRefreshOptions,
) => void;

type UsePanelRangeControlsParams = {
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    isNumericXAxis: boolean;
    onRangeStateChange: CommitPanelRangeState;
};

type PanelRangeControls = {
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    zoomActions: PanelZoomActions;
};

export function usePanelRangeControls({
    rangeState,
    chartAreaWidth,
    isNumericXAxis,
    onRangeStateChange,
}: UsePanelRangeControlsParams): PanelRangeControls {
    const setMainRange = (
        panelRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ): void => {
        onRangeStateChange(
            {
                panelRange,
                navigatorRange: rangeState.navigatorRange,
            },
            options,
        );
    };
    const setNavigatorRange = (
        navigatorRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ): void => {
        onRangeStateChange(
            {
                panelRange: rangeState.panelRange,
                navigatorRange,
            },
            options,
        );
    };

    return {
        rangeHandlers: {
            onPanelRangeChange: (event: PanelRangeChangeEvent) => {
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
                        chartAreaWidth,
                        sRequestedPanelRange,
                        false,
                        isNumericXAxis,
                    ),
                    {
                        preserveNavigatorRange: false,
                        clampPanelRangeToLoadedDataRange: false,
                    },
                );
            },
            onPanelRangeChangeFromNavigator: (event: PanelRangeChangeEvent) => {
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
                        chartAreaWidth,
                        sRequestedPanelRange,
                        true,
                        isNumericXAxis,
                    ),
                    {
                        preserveNavigatorRange: true,
                        clampPanelRangeToLoadedDataRange: true,
                    },
                );
            },
            onNavigatorRangeChange: (event: PanelRangeChangeEvent) => {
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
                });
            },
            onFocus: () => {
                const sPanelWidth = getTimeRangeWidth(rangeState.panelRange);
                const sMinimumFocusableWidth = isNumericXAxis
                    ? getMinimumNumericRangeWidth(rangeState.navigatorRange)
                    : MIN_FOCUSABLE_PANEL_RANGE_MS;

                if (sPanelWidth < sMinimumFocusableWidth) {
                    return;
                }

                const sPanelCenterTime = getTimeRangeCenter(rangeState.panelRange);
                const sFocusedNavigatorWidth = Math.min(
                    Math.max(
                        sPanelWidth,
                        getTimeRangeWidth(rangeState.navigatorRange) / 2,
                    ),
                    getTimeRangeWidth(rangeState.navigatorRange),
                );
                const sNavigatorStartTime = Math.min(
                    Math.max(
                        sPanelCenterTime - sFocusedNavigatorWidth / 2,
                        rangeState.navigatorRange.startTime,
                    ),
                    rangeState.navigatorRange.endTime - sFocusedNavigatorWidth,
                );
                const sPanelRange = createTimeRangeMs(
                    sPanelCenterTime - sPanelWidth * 0.1,
                    sPanelCenterTime + sPanelWidth * 0.1,
                );
                const sNavigatorRange = createTimeRangeMs(
                    sNavigatorStartTime,
                    sNavigatorStartTime + sFocusedNavigatorWidth,
                );

                onRangeStateChange({
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                });
            },
        },
    };
}

type RangeShiftDirection = -1 | 1;

function isFiniteRangeEvent(range: TimeRangeMs): boolean {
    return Number.isFinite(range.startTime) && Number.isFinite(range.endTime);
}

function getRangeShiftOffset(
    range: TimeRangeMs,
    direction: RangeShiftDirection,
): number {
    return getTimeRangeWidth(range) * RANGE_SHIFT_FRACTION * direction;
}

function getShiftedPanelRangeState(
    rangeState: PanelRangeState,
    direction: RangeShiftDirection,
): PanelRangeState {
    const sOffset = getRangeShiftOffset(rangeState.panelRange, direction);
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
        };
    }

    return {
        panelRange: sPanelRange,
        navigatorRange: rangeState.navigatorRange,
    };
}

function getShiftedNavigatorRangeState(
    rangeState: PanelRangeState,
    direction: RangeShiftDirection,
): PanelRangeState {
    const sNavigatorRange = shiftTimeRange(
        rangeState.navigatorRange,
        getRangeShiftOffset(rangeState.navigatorRange, direction),
    );

    return {
        panelRange: clampTimeRangeToBounds(rangeState.panelRange, sNavigatorRange),
        navigatorRange: sNavigatorRange,
    };
}

function getPanelRangeChangeState(
    rangeState: PanelRangeState,
    chartAreaWidth: number | undefined,
    requestedPanelRange: TimeRangeMs,
    preserveNavigatorRange: boolean,
    isNumericXAxis: boolean,
): PanelRangeState {
    const sMinimumPanelRangeWidth = preserveNavigatorRange
        ? getNavigatorHandleMinimumRangeWidth({
              navigatorRange: rangeState.navigatorRange,
              chartAreaWidth,
              isNumericXAxis,
          })
        : MIN_PANEL_RANGE_MS;
    const sPanelRange = preserveNavigatorRange
        ? clampTimeRangeToBounds(
              ensureMinimumTimeRangeWidth(
                  requestedPanelRange,
                  sMinimumPanelRangeWidth,
              ),
              rangeState.navigatorRange,
          )
        : clampTimeRangeToBounds(
              ensureMinimumAxisRangeWidth(
                  requestedPanelRange,
                  rangeState.navigatorRange,
                  isNumericXAxis,
                  sMinimumPanelRangeWidth,
              ),
              rangeState.navigatorRange,
          );

    return {
        panelRange: sPanelRange,
        navigatorRange: rangeState.navigatorRange,
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
        range.startTime + getMinimumNumericRangeWidth(referenceRange),
    );
}
