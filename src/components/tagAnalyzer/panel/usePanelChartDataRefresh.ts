import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PanelChartHandle, PanelNavigateState } from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/types/TimeTypes';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';
import { buildNavigateStatePatchFromPanelLoad } from './PanelChartRuntimeState';

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
    updateNavigateState: (patch: Partial<PanelNavigateState>) => void;
};

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

    const refreshPanelData = async function refreshPanelData(
        timeRange: TimeRangeMs | undefined,
        raw: boolean,
        dataRange: TimeRangeMs | undefined,
    ): Promise<PanelRefreshResult> {
        const sRequestedRange = timeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sChartWidth = areaChartRef.current?.clientWidth ?? 1;
        const sLoadState = await loadPanelChartState(
            panelInfo.data,
            panelInfo.time,
            panelInfo.axes,
            boardTime,
            sChartWidth,
            raw,
            sLoadedDataRange,
            rollupTableList,
        );

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(
            buildNavigateStatePatchFromPanelLoad(
                sLoadState,
                undefined,
                navigateStateRef.current.rangeOption,
            ),
        );
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
