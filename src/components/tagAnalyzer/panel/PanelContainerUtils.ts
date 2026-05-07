import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import { isSameTimeRange } from '../time/TimeRangeUtils';
import type { PanelNavigateState } from './PanelTypes';

export function hasLoadedPanelChartData(
    navigateState: Pick<PanelNavigateState, 'rangeOption'>,
): boolean {
    return navigateState.rangeOption !== undefined;
}

export function shouldApplyResolvedRange(
    resolvedRange: ResolvedTimeRangeMs,
    currentPanelRange: ResolvedTimeRangeMs,
    currentNavigatorRange: ResolvedTimeRangeMs,
): boolean {
    const sNavigatorRangeIsPending = isSameTimeRange(
        currentNavigatorRange,
        EMPTY_TIME_RANGE,
    );

    return !(
        isSameTimeRange(resolvedRange, currentPanelRange) &&
        (isSameTimeRange(resolvedRange, currentNavigatorRange) || sNavigatorRangeIsPending)
    );
}
