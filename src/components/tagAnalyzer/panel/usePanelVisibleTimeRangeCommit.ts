import type { TimeRangeMs } from '../time/TimeTypes';
import { isSameTimeRange } from '../time/TimeRangeUtils';
import type { PanelChartRuntime } from './usePanelChartRuntime';

export type CommitVisibleTimeRangeChange = (
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    raw?: boolean,
) => Promise<void>;

export function usePanelVisibleTimeRangeCommit({
    chartRuntime,
    currentIsRaw,
}: {
    chartRuntime: PanelChartRuntime;
    currentIsRaw: boolean;
}) {
    const {
        chartRangeStateRef,
        loadedDataRangeRef,
        updateChartRangeState,
        refreshPanelData,
        refreshNavigatorData,
        notifyPanelRangeApplied,
    } = chartRuntime;

    async function commitVisibleTimeRangeChange(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        raw = currentIsRaw,
    ) {
        const sCurrentPanelRange = chartRangeStateRef.current.panelRange;
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;
        const sLoadedDataRange = loadedDataRangeRef.current;
        const sNavigatorRangeChanged = !isSameTimeRange(
            navigatorRange,
            sCurrentNavigatorRange,
        );
        const sPanelRangeChanged = !isSameTimeRange(panelRange, sCurrentPanelRange);

        if (sNavigatorRangeChanged && !sPanelRangeChanged) {
            updateChartRangeState({ navigatorRange: navigatorRange });

            const sRefreshResult = await refreshNavigatorData(navigatorRange, raw);
            if (sRefreshResult.isStale) {
                return;
            }

            notifyPanelRangeApplied(panelRange, raw);
            return;
        }

        const sPreviousWidth = sCurrentPanelRange.endTime - sCurrentPanelRange.startTime;
        const sNextWidth = panelRange.endTime - panelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPreviousWidth > 0 &&
            Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoadedDataRange.startTime > 0 &&
            (panelRange.startTime < sLoadedDataRange.startTime ||
                panelRange.endTime > sLoadedDataRange.endTime);
        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;
        const sPreFetchNavigatorData = chartRangeStateRef.current.navigatorChartData;

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(panelRange, raw);
            return;
        }

        const sRefreshResult = await refreshPanelData({
            panelRange: panelRange,
            raw: raw,
            navigatorRange: sNavigatorRangeChanged ? navigatorRange : undefined,
            refreshNavigator: sNavigatorRangeChanged,
        });
        if (sRefreshResult.isStale) {
            return;
        }

        const sAppliedPanelRange = sRefreshResult.panelRange ?? panelRange;

        if (!sNavigatorRangeChanged) {
            updateChartRangeState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sAppliedPanelRange, raw);
    }

    return {
        commitVisibleTimeRangeChange,
    };
}
