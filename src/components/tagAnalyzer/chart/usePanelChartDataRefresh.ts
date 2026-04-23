import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PanelChartHandle, PanelNavigateState } from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import {
    EMPTY_TIME_RANGE,
} from '../utils/time/PanelTimeRangeResolver';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/timeTypes';
import { loadPanelChartState } from './PanelChartStateLoader';
import { buildNavigateStatePatchFromPanelLoad } from './PanelNavigateStateUtils';

export type PanelRefreshResult = {
    appliedRange: TimeRangeMs;
    isStale: boolean;
};

type UsePanelChartDataRefreshParams = {
    panelInfo: PanelInfo;
    boardTime: InputTimeBounds;
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    navigateStateRef: MutableRefObject<PanelNavigateState>;
    updateNavigateState: (aPatch: Partial<PanelNavigateState>) => void;
};

/**
 * Owns stale request tracking and panel data refresh side effects.
 * Intent: Keep backend refresh orchestration out of the public chart runtime controller.
 * @param aParams The current panel, board, refs, and state update dependencies.
 * @returns The refresh handler plus refs used by range policy.
 */
export function usePanelChartDataRefresh({
    panelInfo,
    boardTime,
    areaChartRef,
    chartRef,
    rollupTableList,
    navigateStateRef,
    updateNavigateState,
}: UsePanelChartDataRefreshParams) {
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<TimeRangeMs>(EMPTY_TIME_RANGE);

    /**
     * Reloads the main panel dataset and reapplies any overflow-clamped visible range.
     * Intent: Fetch panel data and keep the visible range aligned with the loaded data window.
     * @param aTimeRange The visible panel window to apply after the fetch.
     * @param aRaw Whether the panel should load raw data.
     * @param aDataRange The chart-data range to load behind the current visible panel window.
     * @returns The panel range that was actually applied after any overflow clamp.
     */
    const refreshPanelData = async function refreshPanelData(
        aTimeRange: TimeRangeMs | undefined,
        aRaw: boolean,
        aDataRange: TimeRangeMs | undefined,
    ): Promise<PanelRefreshResult> {
        const sRequestedRange = aTimeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = aDataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sLoadState = await loadPanelChartState({
            panelData: panelInfo.data,
            panelTime: panelInfo.time,
            panelAxes: panelInfo.axes,
            boardTime,
            chartWidth: areaChartRef.current?.clientWidth,
            isRaw: aRaw,
            timeRange: sLoadedDataRange,
            rollupTableList,
        });

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(buildNavigateStatePatchFromPanelLoad(sLoadState, undefined));
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            chartRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return {
            appliedRange: sAppliedRange,
            isStale: false,
        };
    };

    return {
        loadedDataRangeRef,
        refreshPanelData,
        skipNextFetchRef,
    };
}
