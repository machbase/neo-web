import type { PanelRangeHandlers } from '../../../domain/PanelDomain';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import type { EChartDataZoomEventPayload } from '../ChartInteractionTypes';
import {
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
    hasExplicitDataZoomEventRange,
} from '../ChartDataZoomUtils';
import type {
    ChartCurrentRanges,
    ChartRangeEvents,
} from './eventCallbackTypes';
import type { PanelChartInstance } from '../PanelChartRuntimeTypes';

export function buildRangeEvent({
    currentRanges,
    rangeHandlers,
    getChartInstance,
}: {
    currentRanges: ChartCurrentRanges;
    rangeHandlers: PanelRangeHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
}): ChartRangeEvents {
    return {
        datazoom: (params: EChartDataZoomEventPayload) => {
            const sInstance = getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            const sRange = hasExplicitDataZoomEventRange(params)
                ? extractDataZoomEventRange(
                      params,
                      currentRanges.panelRange,
                      currentRanges.navigatorRange,
                  )
                : extractDataZoomOptionRange(
                      { ...sDataZoomState, ...params },
                      currentRanges.panelRange,
                      currentRanges.navigatorRange,
                  );

            if (isSameTimeRange(sRange, currentRanges.panelRange)) {
                return;
            }

            rangeHandlers.onPanelRangeChangeFromNavigator({
                min: sRange.startTime,
                max: sRange.endTime,
            });
        },
    };
}
