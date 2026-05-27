import type { PanelRangeHandlers } from '../../../domain/PanelDomain';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import {
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
    hasExplicitDataZoomEventRange,
} from '../ChartDataZoomUtils';
import type {
    BuildChartEventParams,
    ChartEvents,
} from './eventCallbackTypes';
import type {
    EChartDataZoomEventPayload,
    PanelChartInstance,
} from '../PanelChartRuntimeTypes';

export function buildRangeEvent({
    currentRanges,
    rangeHandlers,
    getChartInstance,
}: {
    currentRanges: BuildChartEventParams['currentRanges'];
    rangeHandlers: PanelRangeHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
}): Pick<ChartEvents, 'datazoom'> {
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

            if (!sRange) {
                return;
            }

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
