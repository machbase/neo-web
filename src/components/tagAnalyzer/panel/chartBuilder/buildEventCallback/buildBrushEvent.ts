import type {
    PanelBrushSelectionEvent,
    PanelRangeHandlers,
} from '../../../domain/PanelDomain';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import { extractBrushRange } from '../ChartDataZoomUtils';
import type { EChartBrushPayload } from '../ChartInteractionTypes';
import type {
    ChartCurrentRanges,
    ChartBrushEvents,
} from './eventCallbackTypes';
import type { PanelChartInstance } from '../PanelChartRuntimeTypes';

export function buildBrushEvent({
    currentRanges,
    isSelectionMode,
    isDragZoomEnabled,
    onSelection,
    rangeHandlers,
    getChartInstance,
    isNumericXAxis,
}: {
    currentRanges: ChartCurrentRanges;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    rangeHandlers: PanelRangeHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
    isNumericXAxis: boolean;
}): ChartBrushEvents {
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
