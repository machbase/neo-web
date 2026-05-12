import type {
    PanelRangeChangeEvent,
    PanelRangeHandlers,
} from './PanelTypes';
import { normalizeNavigatorRange } from './rangeControl/PanelRangeControlLogic';
import { hasVisibleTimeRangeChanged } from '../time/TimeRangeUtils';
import type { PanelChartRuntime } from './usePanelChartRuntime';
import type { CommitVisibleTimeRangeChange } from './usePanelVisibleTimeRangeCommit';

export function useChartRangeEventActions({
    chartRuntime,
    commitVisibleTimeRangeChange,
}: {
    chartRuntime: PanelChartRuntime;
    commitVisibleTimeRangeChange: CommitVisibleTimeRangeChange;
}): Pick<PanelRangeHandlers, 'onPanelRangeChange' | 'onNavigatorRangeChange'> {
    const {
        chartRangeStateRef,
        updateChartRangeState,
    } = chartRuntime;

    function handleNavigatorRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNavigatorRange = normalizeNavigatorRange({
            startTime: event.min,
            endTime: event.max,
        });
        const sPanelRange = chartRangeStateRef.current.panelRange;

        if (
            !hasVisibleTimeRangeChanged(
                sPanelRange,
                sNavigatorRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        updateChartRangeState({ navigatorRange: sNavigatorRange });
    }

    async function handleMainRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sPanelRange = {
            startTime: event.min,
            endTime: event.max,
        };
        const sNavigatorRange = chartRangeStateRef.current.navigatorRange;

        if (
            !hasVisibleTimeRangeChanged(
                sPanelRange,
                sNavigatorRange,
                chartRangeStateRef.current,
            )
        ) {
            return;
        }

        await commitVisibleTimeRangeChange(sPanelRange, sNavigatorRange);
    }

    return {
        onPanelRangeChange: handleMainRangeChange,
        onNavigatorRangeChange: handleNavigatorRangeChange,
    };
}
