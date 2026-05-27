import type {
    PanelBrushSelectionEvent,
    PanelRangeHandlers,
} from '../../../domain/PanelDomain';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import { extractBrushRange } from '../ChartDataZoomUtils';
import type {
    BuildChartEventParams,
    ChartEvents,
} from './eventCallbackTypes';
import type {
    EChartBrushPayload,
    PanelChartInstance,
} from '../PanelChartRuntimeTypes';

export function buildBrushEvent({
    currentRanges,
    isSelectionMode,
    isDragZoomEnabled,
    onSelection,
    rangeHandlers,
    getChartInstance,
    isNumericXAxis,
}: {
    currentRanges: BuildChartEventParams['currentRanges'];
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    rangeHandlers: PanelRangeHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
    isNumericXAxis: boolean;
}): Pick<ChartEvents, 'brushEnd'> {
    return {
        brushEnd: (params: EChartBrushPayload) => {
            const sRange = extractBrushRange(params, isNumericXAxis);

            if (!sRange) {
                return;
            }

            getChartInstance()?.dispatchAction({
                type: 'brush',
                areas: [],
            });

            if (sRange.endTime <= sRange.startTime) {
                return;
            }

            if (isSelectionMode) {
                onSelection({
                    min: sRange.startTime,
                    max: sRange.endTime,
                });
                return;
            }

            if (
                !isDragZoomEnabled ||
                isSameTimeRange(sRange, currentRanges.panelRange)
            ) {
                return;
            }

            rangeHandlers.onPanelRangeChange({
                min: sRange.startTime,
                max: sRange.endTime,
            });
        },
    };
}
