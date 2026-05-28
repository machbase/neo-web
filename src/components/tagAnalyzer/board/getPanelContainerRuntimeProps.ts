import type { PanelInfo, PanelRangeChangeEvent, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isTimeRangeOutsideBounds,
    shiftTimeRange,
} from '../domain/time/TimeRangeUtils';
import { type BoardPanelRecord, type PanelRangeRefreshOptions } from './BoardPanelState';
import {
    getMinimumNumericRangeWidth,
    getNavigatorHandleMinimumRangeWidth,
    MIN_PANEL_RANGE_MS,
} from './PanelNavigatorRangeLimits';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const RANGE_SHIFT_FRACTION = 0.1;
const MAX_PANEL_END_TIME = 9999999999999;

type PanelContainerRuntimePropsGetterDependencies = {
    panelInfo: PanelInfo;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    refreshVisibleRange: RefreshVisibleRange;
};
type RefreshVisibleRange = (
    panelInfo: PanelInfo,
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    options?: PanelRangeRefreshOptions,
) => Promise<void>;

export function getPanelContainerRuntimeProps({
    panelInfo,
    getBoardPanelRecord,
    refreshVisibleRange,
}: PanelContainerRuntimePropsGetterDependencies) {
    const sPanelKey = panelInfo.meta.index_key;
    const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
    const sIsNumericXAxis = hasNumericBaseTimeSeries(panelInfo.data.tag_set);
    const getCurrentRangeState = (): PanelRangeState =>
        getBoardPanelRecord(sPanelKey).rangeState;
    const setRangeState = (
        rangeState: PanelRangeState,
        options?: PanelRangeRefreshOptions,
    ): void => {
        void refreshVisibleRange(
            panelInfo,
            rangeState.panelRange,
            rangeState.navigatorRange,
            options,
        );
    };
    const setMainRange = (
        panelRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ): void => {
        setRangeState(
            {
                panelRange,
                navigatorRange: getCurrentRangeState().navigatorRange,
            },
            options,
        );
    };
    const setNavigatorRange = (
        navigatorRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ): void => {
        setRangeState(
            {
                panelRange: getCurrentRangeState().panelRange,
                navigatorRange,
            },
            options,
        );
    };

    return {
        rangeState: sBoardPanelRecord.rangeState,
        chartData: sBoardPanelRecord.chartDataState.chartData,
        navigatorChartData:
            sBoardPanelRecord.chartDataState.navigatorChartData,
        resolvedIntervalOption:
            sBoardPanelRecord.chartDataState.resolvedIntervalOption,
        loadStatus: {
            chart: sBoardPanelRecord.chartLoadStatus,
            navigator: sBoardPanelRecord.navigatorLoadStatus,
        },
        rangeHandlers: {
            onPanelRangeChange: (event: PanelRangeChangeEvent) => {
                const sCurrentRecord = getBoardPanelRecord(sPanelKey);
                const sRangeState = getPanelRangeChangeState(
                    sCurrentRecord,
                    event,
                    false,
                    sIsNumericXAxis,
                );

                setRangeState(sRangeState, {
                    preserveNavigatorRange: false,
                    clampPanelRangeToLoadedDataRange: false,
                });
            },
            onPanelRangeChangeFromNavigator: (event: PanelRangeChangeEvent) => {
                const sCurrentRecord = getBoardPanelRecord(sPanelKey);
                const sRangeState = getPanelRangeChangeState(
                    sCurrentRecord,
                    event,
                    true,
                    sIsNumericXAxis,
                );

                setRangeState(sRangeState, {
                    preserveNavigatorRange: true,
                    clampPanelRangeToLoadedDataRange: true,
                });
            },
            onNavigatorRangeChange: (event: PanelRangeChangeEvent) => {
                const sRangeState = getCurrentRangeState();
                const sNavigatorRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(event.min, event.max),
                    sRangeState.navigatorRange,
                    sIsNumericXAxis,
                    MIN_NAVIGATOR_RANGE_MS,
                );

                setNavigatorRange(sNavigatorRange);
            },
            onShiftPanelRangeLeft: () =>
                setRangeState(getShiftedPanelRangeState(getCurrentRangeState(), -1)),
            onShiftPanelRangeRight: () =>
                setRangeState(getShiftedPanelRangeState(getCurrentRangeState(), 1)),
        },
        navigatorShiftActions: {
            onShiftLeft: () =>
                setRangeState(getShiftedNavigatorRangeState(getCurrentRangeState(), -1)),
            onShiftRight: () =>
                setRangeState(getShiftedNavigatorRangeState(getCurrentRangeState(), 1)),
        },
        navigatorZoomActions: {
            onZoomIn: (zoom: number) => {
                const sRangeState = getCurrentRangeState();
                const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
                const sPanelRange = ensureMinimumAxisRangeWidth(
                    createTimeRangeMs(
                        sRangeState.panelRange.startTime + sOffset,
                        sRangeState.panelRange.endTime - sOffset,
                    ),
                    sRangeState.panelRange,
                    sIsNumericXAxis,
                    MIN_PANEL_RANGE_MS,
                );

                setMainRange(sPanelRange);
            },
            onZoomOut: (zoom: number) => {
                const sRangeState = getCurrentRangeState();
                const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
                const sExpandedStartTime =
                    sRangeState.panelRange.startTime - sOffset;
                const sExpandedEndTime =
                    sRangeState.panelRange.endTime + sOffset;
                const sNextStartTime =
                    sIsNumericXAxis || sExpandedStartTime > 0
                        ? sExpandedStartTime
                        : sRangeState.navigatorRange.startTime;
                const sNextEndTime = sIsNumericXAxis
                    ? sExpandedEndTime
                    : Math.min(sExpandedEndTime, MAX_PANEL_END_TIME);
                const sPanelRange = createTimeRangeMs(
                    sNextStartTime,
                    sNextEndTime,
                );
                const sNavigatorRange = isTimeRangeOutsideBounds(
                    sPanelRange,
                    sRangeState.navigatorRange,
                )
                    ? sPanelRange
                    : sRangeState.navigatorRange;

                setRangeState({
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                });
            },
            onFocus: () => {
                const sRangeState = getCurrentRangeState();
                const sPanelWidth = getTimeRangeWidth(sRangeState.panelRange);
                const sMinimumFocusableWidth = sIsNumericXAxis
                    ? getMinimumNumericRangeWidth(sRangeState.navigatorRange)
                    : MIN_FOCUSABLE_PANEL_RANGE_MS;

                if (sPanelWidth < sMinimumFocusableWidth) {
                    return;
                }

                const sPanelCenterTime = getTimeRangeCenter(
                    sRangeState.panelRange,
                );
                const sFocusedNavigatorWidth = Math.min(
                    Math.max(
                        sPanelWidth,
                        getTimeRangeWidth(sRangeState.navigatorRange) / 2,
                    ),
                    getTimeRangeWidth(sRangeState.navigatorRange),
                );
                const sNavigatorStartTime = Math.min(
                    Math.max(
                        sPanelCenterTime - sFocusedNavigatorWidth / 2,
                        sRangeState.navigatorRange.startTime,
                    ),
                    sRangeState.navigatorRange.endTime -
                        sFocusedNavigatorWidth,
                );
                const sPanelRange = createTimeRangeMs(
                    sPanelCenterTime - sPanelWidth * 0.1,
                    sPanelCenterTime + sPanelWidth * 0.1,
                );
                const sNavigatorRange = createTimeRangeMs(
                    sNavigatorStartTime,
                    sNavigatorStartTime + sFocusedNavigatorWidth,
                );

                setRangeState({
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                });
            },
        },
    };
}

type RangeShiftDirection = -1 | 1;

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
    boardPanelRecord: BoardPanelRecord,
    event: PanelRangeChangeEvent,
    preserveNavigatorRange: boolean,
    isNumericXAxis: boolean,
): PanelRangeState {
    const sRangeState = boardPanelRecord.rangeState;
    const sRequestedPanelRange = createTimeRangeMs(event.min, event.max);
    const sMinimumPanelRangeWidth = preserveNavigatorRange
        ? getNavigatorHandleMinimumRangeWidth({
              navigatorRange: sRangeState.navigatorRange,
              chartAreaWidth: boardPanelRecord.chartAreaWidth,
              isNumericXAxis,
          })
        : MIN_PANEL_RANGE_MS;
    const sPanelRange = preserveNavigatorRange
        ? clampTimeRangeToBounds(
              ensureMinimumTimeRangeWidth(
                  sRequestedPanelRange,
                  sMinimumPanelRangeWidth,
              ),
              sRangeState.navigatorRange,
          )
        : clampTimeRangeToBounds(
              ensureMinimumAxisRangeWidth(
                  sRequestedPanelRange,
                  sRangeState.navigatorRange,
                  isNumericXAxis,
                  sMinimumPanelRangeWidth,
              ),
              sRangeState.navigatorRange,
          );

    return {
        panelRange: sPanelRange,
        navigatorRange: sRangeState.navigatorRange,
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
