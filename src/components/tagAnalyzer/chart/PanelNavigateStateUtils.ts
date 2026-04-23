import type { PanelNavigateState } from '../utils/panelRuntimeTypes';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type { PanelChartLoadState } from '../utils/fetch/FetchTypes';

/**
 * Converts a panel fetch result into the navigate-state patch used by both board and preview charts.
 * Intent: Translate fetch results into the shared navigate-state update shape.
 * @param aResult The resolved panel-chart load state.
 * @param aPanelRange The applied panel range, when one should be stored immediately.
 * @returns The navigate-state patch for the latest panel load.
 */
export function buildNavigateStatePatchFromPanelLoad(
    aResult: PanelChartLoadState,
    aPanelRange: TimeRangeMs | undefined,
): Partial<PanelNavigateState> {
    return {
        chartData: aResult.chartData.datasets,
        navigatorChartData: aResult.chartData.datasets,
        rangeOption: aResult.rangeOption,
        ...(aPanelRange ? { panelRange: aPanelRange } : {}),
        ...(aResult.overflowRange
            ? { panelRange: aResult.overflowRange, preOverflowTimeRange: aResult.overflowRange }
            : { preOverflowTimeRange: EMPTY_TIME_RANGE }),
    };
}
