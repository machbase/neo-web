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
 * @param aParams The data-zoom event payload from ECharts.
 * @param aCurrentRange The current panel range.
 * @param aAxisRange The axis range used for percentage-based zoom payloads.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomEventRange(
    aParams: EChartDataZoomEventPayload,
    aCurrentRange: TimeRangeMs,
    aAxisRange: TimeRangeMs = aCurrentRange,
): TimeRangeMs {
    const sZoomData = getPrimaryDataZoomEventItem(aParams);
    if (!sZoomData) {
        return aCurrentRange;
    }

    return extractDataZoomOptionRange(sZoomData, aCurrentRange, aAxisRange);
}

/**
 * Resolves an ECharts option data-zoom state into an absolute time range.
 * Intent: Let callers pass already-selected option state without event payload normalization.
 * @param aParams The data-zoom option state from ECharts.
 * @param aCurrentRange The current panel range.
 * @param aAxisRange The axis range used for percentage-based zoom state.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomOptionRange(
    aParams: EChartDataZoomOptionStateItem,
    aCurrentRange: TimeRangeMs,
    aAxisRange: TimeRangeMs = aCurrentRange,
): TimeRangeMs {
    const sExplicitZoomRange = getExplicitDataZoomRange(aParams);
    if (sExplicitZoomRange) {
        return sExplicitZoomRange;
    }

    const sAxisSpan = aAxisRange.endTime - aAxisRange.startTime;
    if (
        typeof aParams.start === 'number' &&
        typeof aParams.end === 'number' &&
        sAxisSpan > 0
    ) {
        return {
            startTime: aAxisRange.startTime + (sAxisSpan * aParams.start) / 100,
            endTime: aAxisRange.startTime + (sAxisSpan * aParams.end) / 100,
        };
    }

    return aCurrentRange;
}

/**
 * Returns the first data-zoom event item from direct or batched payloads.
 * Intent: Keep ECharts event `batch` normalization on the event-only path.
 * @param aZoomData The incoming zoom event payload.
 * @returns The primary event zoom item to inspect.
 */
function getPrimaryDataZoomEventItem(
    aZoomData: EChartDataZoomEventPayload,
): EChartDataZoomEventItem | undefined {
    return 'batch' in aZoomData ? aZoomData.batch[0] : aZoomData;
}

/**
 * Reads explicit start and end timestamps from a zoom payload when they exist.
 * Intent: Prefer concrete axis values over percentage math whenever ECharts provides them.
 * @param aZoomData The primary zoom item.
 * @returns The explicit absolute range when both values are present.
 */
function getExplicitDataZoomRange(
    aZoomData: EChartDataZoomOptionStateItem,
): TimeRangeMs | undefined {
    const sStartValue = aZoomData.startValue;
    const sEndValue = aZoomData.endValue;

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
 * @param aParams The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export function extractBrushRange(aParams: EChartBrushPayload): TimeRangeMs | undefined {
    const sArea = aParams?.areas?.[0] ?? aParams?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    return {
        startTime: Math.floor(Number(sRange[0])),
        endTime: Math.ceil(Number(sRange[1])),
    };
}
