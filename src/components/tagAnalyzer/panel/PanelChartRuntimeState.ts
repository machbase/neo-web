import type { PanelNavigateState } from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type { PanelChartLoadState } from '../utils/fetch/FetchTypes';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import { hasResolvedIntervalOption } from '../utils/time/IntervalUtils';

export const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};

export function resolvePanelRangeApplicationDecision(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    currentPanelRange: TimeRangeMs,
    currentNavigatorRange: TimeRangeMs,
    loadedDataRange: TimeRangeMs,
): {
    shouldApply: boolean;
    navigatorRangeChanged: boolean;
    needsFetch: boolean;
    dataRange: TimeRangeMs;
} {
    if (
        isSameTimeRange(panelRange, currentPanelRange) &&
        isSameTimeRange(navigatorRange, currentNavigatorRange)
    ) {
        return {
            shouldApply: false,
            navigatorRangeChanged: false,
            needsFetch: false,
            dataRange: navigatorRange,
        };
    }

    const sNavigatorRangeChanged = !isSameTimeRange(
        navigatorRange,
        currentNavigatorRange,
    );
    const sPreviousWidth = currentPanelRange.endTime - currentPanelRange.startTime;
    const sNextWidth = panelRange.endTime - panelRange.startTime;
    const sVisibleRangeZoomed =
        !sNavigatorRangeChanged &&
        sPreviousWidth > 0 &&
        Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
    const sPanelEscapedLoadedData =
        !sNavigatorRangeChanged &&
        loadedDataRange.startTime > 0 &&
        (panelRange.startTime < loadedDataRange.startTime ||
            panelRange.endTime > loadedDataRange.endTime);
    const sNeedsFetch =
        sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;

    return {
        shouldApply: true,
        navigatorRangeChanged: sNavigatorRangeChanged,
        needsFetch: sNeedsFetch,
        dataRange: sNavigatorRangeChanged ? navigatorRange : panelRange,
    };
}

export function buildNavigateStatePatchFromPanelLoad(
    result: PanelChartLoadState,
    panelRange: TimeRangeMs | undefined,
    currentRangeOption: PanelNavigateState['rangeOption'],
): Partial<PanelNavigateState> {
    const sNextRangeOption = resolveNextRangeOption(
        currentRangeOption,
        result.rangeOption,
    );

    return {
        chartData: result.chartData.datasets,
        navigatorChartData: result.chartData.datasets,
        rangeOption: sNextRangeOption,
        ...(panelRange ? { panelRange: panelRange } : {}),
        ...(result.overflowRange
            ? { panelRange: result.overflowRange, preOverflowTimeRange: result.overflowRange }
            : { preOverflowTimeRange: EMPTY_TIME_RANGE }),
    };
}

function resolveNextRangeOption(
    currentRangeOption: PanelNavigateState['rangeOption'],
    nextRangeOption: PanelChartLoadState['rangeOption'],
): PanelNavigateState['rangeOption'] {
    if (hasResolvedIntervalOption(nextRangeOption)) {
        return nextRangeOption;
    }

    if (hasResolvedIntervalOption(currentRangeOption)) {
        return currentRangeOption;
    }

    return nextRangeOption;
}
