import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type { TimeRangeMs } from '../utils/time/timeTypes';

export type PanelRangeApplicationDecision = {
    shouldApply: boolean;
    navigatorRangeChanged: boolean;
    needsFetch: boolean;
    dataRange: TimeRangeMs;
};

/**
 * Decides whether a panel/navigator range change needs a backend refetch.
 * Intent: Keep range-fetch policy separate from hook state mutation and side effects.
 * @param aPanelRange The next visible panel range.
 * @param aNavigatorRange The next navigator overview range.
 * @param aCurrentPanelRange The currently stored panel range.
 * @param aCurrentNavigatorRange The currently stored navigator range.
 * @param aLoadedDataRange The currently loaded backend data range.
 * @returns The range application decision.
 */
export function resolvePanelRangeApplicationDecision(
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs,
    aCurrentPanelRange: TimeRangeMs,
    aCurrentNavigatorRange: TimeRangeMs,
    aLoadedDataRange: TimeRangeMs,
): PanelRangeApplicationDecision {
    if (
        isSameTimeRange(aPanelRange, aCurrentPanelRange) &&
        isSameTimeRange(aNavigatorRange, aCurrentNavigatorRange)
    ) {
        return {
            shouldApply: false,
            navigatorRangeChanged: false,
            needsFetch: false,
            dataRange: aNavigatorRange,
        };
    }

    const sNavigatorRangeChanged = !isSameTimeRange(
        aNavigatorRange,
        aCurrentNavigatorRange,
    );
    const sPrevWidth = aCurrentPanelRange.endTime - aCurrentPanelRange.startTime;
    const sNextWidth = aPanelRange.endTime - aPanelRange.startTime;
    const sVisibleRangeZoomed =
        !sNavigatorRangeChanged &&
        sPrevWidth > 0 &&
        Math.abs(sNextWidth - sPrevWidth) / sPrevWidth > 0.01;
    const sPanelEscapedLoadedData =
        !sNavigatorRangeChanged &&
        aLoadedDataRange.startTime > 0 &&
        (aPanelRange.startTime < aLoadedDataRange.startTime ||
            aPanelRange.endTime > aLoadedDataRange.endTime);
    const sNeedsFetch =
        sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;

    return {
        shouldApply: true,
        navigatorRangeChanged: sNavigatorRangeChanged,
        needsFetch: sNeedsFetch,
        dataRange: sNavigatorRangeChanged ? aNavigatorRange : aPanelRange,
    };
}
