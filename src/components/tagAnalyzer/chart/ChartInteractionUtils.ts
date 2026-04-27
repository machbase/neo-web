import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type {
    EChartBrushPayload,
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from './ChartInteractionTypes';

/**
 * Resolves an ECharts event data-zoom payload into an absolute time range.
 * Intent: Keep batched event payload handling separate from chart option state.
 * @param params The data-zoom event payload from ECharts.
 * @param currentRange The current panel range.
 * @param axisRange The axis range used for percentage-based zoom payloads.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomEventRange(
    params: EChartDataZoomEventPayload,
    currentRange: TimeRangeMs,
    axisRange: TimeRangeMs = currentRange,
): TimeRangeMs {
    const sZoomData = getPrimaryDataZoomEventItem(params);
    if (!sZoomData) {
        return currentRange;
    }

    return extractDataZoomOptionRange(sZoomData, currentRange, axisRange);
}

/**
 * Resolves an ECharts option data-zoom state into an absolute time range.
 * Intent: Let callers pass already-selected option state without event payload normalization.
 * @param params The data-zoom option state from ECharts.
 * @param currentRange The current panel range.
 * @param axisRange The axis range used for percentage-based zoom state.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomOptionRange(
    params: EChartDataZoomOptionStateItem,
    currentRange: TimeRangeMs,
    axisRange: TimeRangeMs = currentRange,
): TimeRangeMs {
    const sExplicitZoomRange = getExplicitDataZoomRange(params);
    if (sExplicitZoomRange) {
        return sExplicitZoomRange;
    }

    const sAxisSpan = axisRange.endTime - axisRange.startTime;
    if (
        typeof params.start === 'number' &&
        typeof params.end === 'number' &&
        sAxisSpan > 0
    ) {
        return {
            startTime: axisRange.startTime + (sAxisSpan * params.start) / 100,
            endTime: axisRange.startTime + (sAxisSpan * params.end) / 100,
        };
    }

    return currentRange;
}

/**
 * Returns the first data-zoom event item from direct or batched payloads.
 * Intent: Keep ECharts event `batch` normalization on the event-only path.
 * @param zoomData The incoming zoom event payload.
 * @returns The primary event zoom item to inspect.
 */
function getPrimaryDataZoomEventItem(
    zoomData: EChartDataZoomEventPayload,
): EChartDataZoomEventItem | undefined {
    return 'batch' in zoomData ? zoomData.batch[0] : zoomData;
}

/**
 * Reads explicit start and end timestamps from a zoom payload when they exist.
 * Intent: Prefer concrete axis values over percentage math whenever ECharts provides them.
 * @param zoomData The primary zoom item.
 * @returns The explicit absolute range when both values are present.
 */
function getExplicitDataZoomRange(
    zoomData: EChartDataZoomOptionStateItem,
): TimeRangeMs | undefined {
    const sStartValue = zoomData.startValue;
    const sEndValue = zoomData.endValue;

    if (sStartValue === undefined || sEndValue === undefined) {
        return undefined;
    }

    return {
        startTime: Number(sStartValue),
        endTime: Number(sEndValue),
    };
}

/**
 * Extracts the first selected brush window from a brush payload.
 * Intent: Convert brush events into the same time-range shape the rest of the panel logic expects.
 * @param params The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export function extractBrushRange(params: EChartBrushPayload): TimeRangeMs | undefined {
    const sArea = params?.areas?.[0] ?? params?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    return {
        startTime: Math.floor(Number(sRange[0])),
        endTime: Math.ceil(Number(sRange[1])),
    };
}
