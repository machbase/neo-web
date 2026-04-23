import { useCallback, useEffect, useRef } from 'react';
import { extractDataZoomOptionRange } from './ChartInteractionUtils';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';
import { hasExplicitDataZoomOptionRange } from './ChartDataZoomStateUtils';

type UsePanelChartRangeSyncParams = {
    getChartInstance: () => PanelChartInstance | undefined;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

/**
 * Owns live ECharts dataZoom synchronization for the panel chart.
 * Intent: Keep imperative panel range syncing outside the chart render component.
 * @param aParams The chart instance getter and current panel/navigator ranges.
 * @returns Range sync callback and mutable refs used by chart event handlers.
 */
export function usePanelChartRangeSync({
    getChartInstance,
    panelRange,
    navigatorRange,
}: UsePanelChartRangeSyncParams) {
    const lastZoomRangeRef = useRef<TimeRangeMs>(panelRange);
    const appliedZoomRangeRef = useRef<TimeRangeMs | undefined>(undefined);
    const skipNextPanelRangeSyncRef = useRef(false);

    useEffect(() => {
        lastZoomRangeRef.current = panelRange;
    }, [panelRange]);

    const getLivePanelRange = useCallback(
        (aInstance: PanelChartInstance | undefined): TimeRangeMs | undefined => {
            const sInstance = aInstance ?? getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            if (!sDataZoomState || !hasExplicitDataZoomOptionRange(sDataZoomState)) {
                return undefined;
            }

            return extractDataZoomOptionRange(
                sDataZoomState,
                panelRange,
                navigatorRange,
            );
        },
        [getChartInstance, navigatorRange, panelRange],
    );

    const syncPanelRange = useCallback(
        (aRange: TimeRangeMs, aInstance: PanelChartInstance | undefined, aForce = false) => {
            const sInstance = aInstance ?? getChartInstance();
            if (!sInstance) return;

            if (
                !aForce &&
                skipNextPanelRangeSyncRef.current &&
                appliedZoomRangeRef.current &&
                isSameTimeRange(appliedZoomRangeRef.current, aRange)
            ) {
                skipNextPanelRangeSyncRef.current = false;
                return;
            }

            if (
                !aForce &&
                appliedZoomRangeRef.current &&
                isSameTimeRange(appliedZoomRangeRef.current, aRange)
            ) {
                return;
            }

            const sLiveRange =
                !aForce && !appliedZoomRangeRef.current ? getLivePanelRange(sInstance) : undefined;
            if (sLiveRange && isSameTimeRange(sLiveRange, aRange)) {
                appliedZoomRangeRef.current = aRange;
                return;
            }

            lastZoomRangeRef.current = aRange;
            appliedZoomRangeRef.current = aRange;
            sInstance.dispatchAction({
                type: 'dataZoom',
                startValue: aRange.startTime,
                endValue: aRange.endTime,
            });
        },
        [getChartInstance, getLivePanelRange],
    );

    return {
        appliedZoomRangeRef,
        lastZoomRangeRef,
        skipNextPanelRangeSyncRef,
        syncPanelRange,
    };
}
