import type { PanelNavigateState } from '../utils/panelRuntimeTypes';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type { PanelChartLoadState } from '../utils/fetch/FetchTypes';
import { hasResolvedIntervalOption } from '../utils/time/IntervalUtils';

/**
 * Converts a panel fetch result into the navigate-state patch used by both board and preview charts.
 * Intent: Translate fetch results into the shared navigate-state update shape.
 * @param result The resolved panel-chart load state.
 * @param panelRange The applied panel range, when one should be stored immediately.
 * @returns The navigate-state patch for the latest panel load.
 */
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
