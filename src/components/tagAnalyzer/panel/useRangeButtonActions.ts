import type {
    PanelNavigatorShiftActions,
    PanelRangeShiftActions,
    PanelZoomActions,
} from './PanelTypes';
import { createPanelRangeControlActions } from './rangeControl/PanelRangeControlLogic';
import { hasVisibleTimeRangeChanged } from '../domain/time/TimeRangeUtils';
import type { PanelChartRuntime } from './usePanelChartRuntime';
import type { CommitVisibleTimeRangeChange } from './usePanelVisibleTimeRangeCommit';
import type { TimeRangeMs } from '../domain/time/TimeTypes';

function createRangeButtonCommitter({
    chartRuntime,
    commitVisibleTimeRangeChange,
}: {
    chartRuntime: PanelChartRuntime;
    commitVisibleTimeRangeChange: CommitVisibleTimeRangeChange;
}) {
    return function commitRangeButtonChange(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs | undefined,
    ) {
        const sNavigatorRange =
            chartRuntime.normalizeNavigatorRangeForPanelRange(
                panelRange,
                navigatorRange ?? chartRuntime.chartRangeStateRef.current.navigatorRange,
            );

        if (
            !hasVisibleTimeRangeChanged(
                panelRange,
                sNavigatorRange,
                chartRuntime.chartRangeStateRef.current,
            )
        ) {
            return;
        }

        void commitVisibleTimeRangeChange(panelRange, sNavigatorRange);
    };
}

export function useRangeButtonActions({
    chartRuntime,
    commitVisibleTimeRangeChange,
}: {
    chartRuntime: PanelChartRuntime;
    commitVisibleTimeRangeChange: CommitVisibleTimeRangeChange;
}): {
    rangeShiftActions: PanelRangeShiftActions;
    navigatorShiftActions: PanelNavigatorShiftActions;
    navigatorZoomActions: PanelZoomActions;
} {
    const { shiftActions, zoomActions } = createPanelRangeControlActions(
        createRangeButtonCommitter({
            chartRuntime: chartRuntime,
            commitVisibleTimeRangeChange: commitVisibleTimeRangeChange,
        }),
        chartRuntime.chartRangeState.panelRange,
        chartRuntime.chartRangeState.navigatorRange,
    );

    return {
        rangeShiftActions: shiftActions,
        navigatorShiftActions: {
            onShiftLeft: shiftActions.onShiftNavigatorRangeLeft,
            onShiftRight: shiftActions.onShiftNavigatorRangeRight,
        },
        navigatorZoomActions: zoomActions,
    };
}
