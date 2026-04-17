import type { TimeRange } from '../../common/modelTypes';
import type {
    EChartBrushPayload,
    PanelDataZoomBoundaryValue,
    PanelDataZoomEventItem,
    PanelDataZoomEventPayload,
} from './PanelChartOptionTypes';

/**
 * Resolves ECharts zoom payloads back into absolute timestamps.
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

function getPrimaryDataZoomItem(
    aZoomData: PanelDataZoomEventPayload | PanelDataZoomEventItem,
): PanelDataZoomEventItem {
    return 'batch' in aZoomData ? aZoomData.batch?.[0] ?? aZoomData : aZoomData;
}

function getExplicitDataZoomRange(
    aZoomData: PanelDataZoomEventItem | undefined,
): TimeRange | undefined {
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

function getZoomBoundaryValue(
    aValue: PanelDataZoomBoundaryValue,
): number | string | undefined {
    return Array.isArray(aValue) ? aValue[0] : aValue;
}

/**
 * Extracts the first selected brush window from either direct or batched brush payloads.
 * @param aParams The brush payload from ECharts.
 * @returns The selected brush range, or `undefined` when the payload is empty.
 */
export function extractBrushRange(aParams: EChartBrushPayload): TimeRange | undefined {
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
