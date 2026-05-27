import type {
    PanelInfo,
    PanelRangeChangeEvent,
    PanelRangeState,
} from '../domain/PanelDomain';
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
import {
    type BoardPanelRecord,
    type PanelRangeRefreshOptions,
} from './BoardPanelState';
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
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    refreshVisibleRange: (
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ) => Promise<void>;
};

export function createPanelContainerRuntimePropsGetter({
    getBoardPanelRecord,
    refreshVisibleRange,
}: PanelContainerRuntimePropsGetterDependencies) {
    return function getPanelContainerRuntimeProps(panelInfo: PanelInfo) {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        function applyPanelRangeChange(
            event: PanelRangeChangeEvent,
            preserveNavigatorRange: boolean,
        ): void {
            const sCurrentBoardPanelRecord = getBoardPanelRecord(sPanelKey);
            const sRangeState = sCurrentBoardPanelRecord.rangeState;
            const sIsNumericXAxis = hasNumericBaseTimeSeries(panelInfo.data.tag_set);
            const sRequestedPanelRange = createTimeRangeMs(event.min, event.max);
            const sMinimumPanelRangeWidth = preserveNavigatorRange
                ? getNavigatorHandleMinimumRangeWidth({
                      navigatorRange: sRangeState.navigatorRange,
                      chartAreaWidth: sCurrentBoardPanelRecord.chartAreaWidth,
                      isNumericXAxis: sIsNumericXAxis,
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
                          sIsNumericXAxis,
                          sMinimumPanelRangeWidth,
                      ),
                      sRangeState.navigatorRange,
                  );

            void refreshVisibleRange(
                panelInfo,
                sPanelRange,
                sRangeState.navigatorRange,
                { preserveNavigatorRange },
            );
        }

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
                    applyPanelRangeChange(event, false);
                },
                onPanelRangeChangeFromNavigator: (event: PanelRangeChangeEvent) => {
                    applyPanelRangeChange(event, true);
                },
                onNavigatorRangeChange: (event: PanelRangeChangeEvent) => {
                    const sRangeState = getBoardPanelRecord(sPanelKey).rangeState;
                    const sNavigatorRange = ensureMinimumAxisRangeWidth(
                        {
                            startTime: event.min,
                            endTime: event.max,
                        },
                        sRangeState.navigatorRange,
                        hasNumericBaseTimeSeries(panelInfo.data.tag_set),
                        MIN_NAVIGATOR_RANGE_MS,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sRangeState.panelRange,
                        sNavigatorRange,
                    );
                },
                onShiftPanelRangeLeft: () => {
                    const sNextRangeState = getShiftedPanelRangeState(
                        getBoardPanelRecord(sPanelKey).rangeState,
                        -1,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sNextRangeState.panelRange,
                        sNextRangeState.navigatorRange,
                    );
                },
                onShiftPanelRangeRight: () => {
                    const sNextRangeState = getShiftedPanelRangeState(
                        getBoardPanelRecord(sPanelKey).rangeState,
                        1,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sNextRangeState.panelRange,
                        sNextRangeState.navigatorRange,
                    );
                },
            },
            navigatorShiftActions: {
                onShiftLeft: () => {
                    const sNextRangeState = getShiftedNavigatorRangeState(
                        getBoardPanelRecord(sPanelKey).rangeState,
                        -1,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sNextRangeState.panelRange,
                        sNextRangeState.navigatorRange,
                    );
                },
                onShiftRight: () => {
                    const sNextRangeState = getShiftedNavigatorRangeState(
                        getBoardPanelRecord(sPanelKey).rangeState,
                        1,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sNextRangeState.panelRange,
                        sNextRangeState.navigatorRange,
                    );
                },
            },
            navigatorZoomActions: {
                onZoomIn: (zoom: number) => {
                    const sRangeState = getBoardPanelRecord(sPanelKey).rangeState;
                    const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
                    const sIsNumericXAxis = hasNumericBaseTimeSeries(
                        panelInfo.data.tag_set,
                    );
                    const sPanelRange = ensureMinimumAxisRangeWidth(
                        createTimeRangeMs(
                            sRangeState.panelRange.startTime + sOffset,
                            sRangeState.panelRange.endTime - sOffset,
                        ),
                        sRangeState.panelRange,
                        sIsNumericXAxis,
                        MIN_PANEL_RANGE_MS,
                    );

                    void refreshVisibleRange(
                        panelInfo,
                        sPanelRange,
                        sRangeState.navigatorRange,
                    );
                },
                onZoomOut: (zoom: number) => {
                    const sRangeState = getBoardPanelRecord(sPanelKey).rangeState;
                    const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
                    const sExpandedStartTime =
                        sRangeState.panelRange.startTime - sOffset;
                    const sIsNumericXAxis = hasNumericBaseTimeSeries(
                        panelInfo.data.tag_set,
                    );
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

                    void refreshVisibleRange(panelInfo, sPanelRange, sNavigatorRange);
                },
                onFocus: () => {
                    const sRangeState = getBoardPanelRecord(sPanelKey).rangeState;
                    const sPanelWidth = getTimeRangeWidth(sRangeState.panelRange);
                    const sIsNumericXAxis = hasNumericBaseTimeSeries(
                        panelInfo.data.tag_set,
                    );
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

                    void refreshVisibleRange(
                        panelInfo,
                        createTimeRangeMs(
                            sPanelCenterTime - sPanelWidth * 0.1,
                            sPanelCenterTime + sPanelWidth * 0.1,
                        ),
                        createTimeRangeMs(
                            sNavigatorStartTime,
                            sNavigatorStartTime + sFocusedNavigatorWidth,
                        ),
                    );
                },
            },
        };
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
