import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

/**
 * Decides whether a panel/navigator range change needs a backend refetch.
 * Intent: Keep range-fetch policy separate from hook state mutation and side effects.
 * @param panelRange The next visible panel range.
 * @param navigatorRange The next navigator overview range.
 * @param currentPanelRange The currently stored panel range.
 * @param currentNavigatorRange The currently stored navigator range.
 * @param loadedDataRange The currently loaded backend data range.
 * @returns The range application decision.
 */
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
    const sPrevWidth = currentPanelRange.endTime - currentPanelRange.startTime;
    const sNextWidth = panelRange.endTime - panelRange.startTime;
    const sVisibleRangeZoomed =
        !sNavigatorRangeChanged &&
        sPrevWidth > 0 &&
        Math.abs(sNextWidth - sPrevWidth) / sPrevWidth > 0.01;
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
