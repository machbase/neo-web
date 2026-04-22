import type { OptionalTimeRange, TimeRange } from '../../utils/time/timeTypes';
import type {
    EChartBrushPayload,
    PanelDataZoomBoundaryValue,
    PanelDataZoomEventItem,
    PanelDataZoomEventPayload,
} from './ChartOptionTypes';

/**
 * Resolves an ECharts zoom payload into an absolute time range.
 * Intent: Give the panel controller one normalized zoom result regardless of how ECharts encoded it.
 * @param aParams The data-zoom payload from ECharts.
 * @param aCurrentRange The current panel range.
 * @param aAxisRange The axis range used for percentage-based zoom payloads.
 * @returns The resolved absolute panel range.
 */
export function extractDataZoomRange(
    aParams: PanelDataZoomEventPayload | PanelDataZoomEventItem,
    aCurrentRange: TimeRange,
    aAxisRange: TimeRange = aCurrentRange,
): TimeRange {
    const sZoomData = getPrimaryDataZoomItem(aParams);
    const sExplicitZoomRange = getExplicitDataZoomRange(sZoomData);
    if (sExplicitZoomRange) {
        return sExplicitZoomRange;
    }

    const sAxisSpan = aAxisRange.endTime - aAxisRange.startTime;
    if (typeof sZoomData.start === 'number' && typeof sZoomData.end === 'number' && sAxisSpan > 0) {
        return {
            startTime: aAxisRange.startTime + (sAxisSpan * sZoomData.start) / 100,
            endTime: aAxisRange.startTime + (sAxisSpan * sZoomData.end) / 100,
        };
    }

    return aCurrentRange;
}

/**
 * Returns the first data-zoom item from direct or batched payloads.
 * Intent: Normalize ECharts payload shapes before range extraction logic runs.
 * @param aZoomData The incoming zoom payload.
 * @returns The primary zoom item to inspect.
 */
function getPrimaryDataZoomItem(
    aZoomData: PanelDataZoomEventPayload | PanelDataZoomEventItem,
): PanelDataZoomEventItem {
    return 'batch' in aZoomData ? aZoomData.batch?.[0] ?? aZoomData : aZoomData;
}

/**
 * Reads explicit start and end timestamps from a zoom payload when they exist.
 * Intent: Prefer concrete axis values over percentage math whenever ECharts provides them.
 * @param aZoomData The primary zoom item.
 * @returns The explicit absolute range when both values are present.
 */
function getExplicitDataZoomRange(
    aZoomData: PanelDataZoomEventItem | undefined,
): OptionalTimeRange {
    const sStartValue = getZoomBoundaryValue(aZoomData?.startValue);
    const sEndValue = getZoomBoundaryValue(aZoomData?.endValue);

    if (sStartValue === undefined || sEndValue === undefined) {
        return undefined;
    }

    return {
        startTime: Number(sStartValue),
        endTime: Number(sEndValue),
    };
}

/**
 * Normalizes a zoom boundary value into a single primitive.
 * Intent: Let range extraction handle ECharts values whether they arrive as scalars or arrays.
 * @param aValue The zoom boundary value to normalize.
 * @returns The first primitive boundary value, if one exists.
 */
function getZoomBoundaryValue(
    aValue: PanelDataZoomBoundaryValue,
): number | string | undefined {
    return Array.isArray(aValue) ? aValue[0] : aValue;
}

/**
 * Extracts the first selected brush window from a brush payload.
 * Intent: Convert brush events into the same time-range shape the rest of the panel logic expects.
 * @param aParams The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export function extractBrushRange(aParams: EChartBrushPayload): OptionalTimeRange {
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