import type { PanelChartLoadResult } from '../fetch/PanelChartStateLoader';
import type { PanelNavigateState } from './PanelTypes';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import { hasResolvedIntervalOption } from './PanelIntervalOptionUtils';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';

export function buildPanelLoadNavigateStatePatch(
    result: PanelChartLoadResult,
    panelRange: ResolvedTimeRangeMs | undefined,
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
    nextRangeOption: PanelChartLoadResult['rangeOption'],
): PanelNavigateState['rangeOption'] {
    if (hasResolvedIntervalOption(nextRangeOption)) {
        return nextRangeOption;
    }

    if (hasResolvedIntervalOption(currentRangeOption)) {
        return currentRangeOption;
    }

    return nextRangeOption;
}

