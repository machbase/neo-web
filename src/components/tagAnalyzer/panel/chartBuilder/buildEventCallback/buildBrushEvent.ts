import type {
    PanelBrushSelectionEvent,
    PanelRangeHandlers,
} from '../../../domain/PanelChartModel';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import { extractBrushRange } from '../ChartDataZoomUtils';
import type { EChartBrushPayload } from '../ChartInteractionTypes';
import type {
    ChartBrushEvents,
} from './eventCallbackTypes';
import type { PanelChartInstance } from '../PanelChartRuntimeTypes';
import type { MutableRefObject } from 'react';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';

export function buildBrushEvent({
    isSelectionMode,
    isDragZoomEnabled,
    onSelection,
    rangeHandlers,
    getChartInstance,
    lastZoomRangeRef,
}: {
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    rangeHandlers: PanelRangeHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
    lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
}): ChartBrushEvents {
    return {
        brushEnd: (params: EChartBrushPayload) => {
            const sRange = extractBrushRange(params);

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
                isSameTimeRange(sRange, lastZoomRangeRef.current)
            ) {
                return;
            }

            lastZoomRangeRef.current = sRange;
            rangeHandlers.onPanelRangeChange({
                min: sRange.startTime,
                max: sRange.endTime,
                trigger: 'brushZoom',
            });
        },
    };
}
