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
        (instance: PanelChartInstance | undefined): TimeRangeMs | undefined => {
            const sInstance = instance ?? getChartInstance();
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
        (range: TimeRangeMs, instance: PanelChartInstance | undefined, force = false) => {
            const sInstance = instance ?? getChartInstance();
            if (!sInstance) return;

            if (
                !force &&
                skipNextPanelRangeSyncRef.current &&
                appliedZoomRangeRef.current &&
                isSameTimeRange(appliedZoomRangeRef.current, range)
            ) {
                skipNextPanelRangeSyncRef.current = false;
                return;
            }

            if (
                !force &&
                appliedZoomRangeRef.current &&
                isSameTimeRange(appliedZoomRangeRef.current, range)
            ) {
                return;
            }

            const sLiveRange =
                !force && !appliedZoomRangeRef.current ? getLivePanelRange(sInstance) : undefined;
            if (sLiveRange && isSameTimeRange(sLiveRange, range)) {
                appliedZoomRangeRef.current = range;
                return;
            }

            lastZoomRangeRef.current = range;
            appliedZoomRangeRef.current = range;
            sInstance.dispatchAction({
                type: 'dataZoom',
                startValue: range.startTime,
                endValue: range.endTime,
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
