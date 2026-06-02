import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type {
    EChartBrushPayload,
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from '../types/PanelChartRuntimeTypes';

export function hasExplicitDataZoomEventRange(
    dataZoomState: EChartDataZoomEventPayload,
): boolean {
    const sPrimaryDataZoomState = getPrimaryDataZoomEventItem(dataZoomState);

    return sPrimaryDataZoomState
        ? hasExplicitDataZoomRange(sPrimaryDataZoomState)
        : false;
}

export function extractDataZoomEventRange(
    params: EChartDataZoomEventPayload,
    currentRange: TimeRangeMs,
    axisRange: TimeRangeMs = currentRange,
): TimeRangeMs | undefined {
    const sZoomData = getPrimaryDataZoomEventItem(params);
    if (!sZoomData) {
        return undefined;
    }

    return extractDataZoomOptionRange(sZoomData, currentRange, axisRange);
}

export function extractDataZoomOptionRange(
    params: EChartDataZoomOptionStateItem,
    currentRange: TimeRangeMs,
    axisRange: TimeRangeMs = currentRange,
): TimeRangeMs | undefined {
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

    return undefined;
}

export function extractBrushRange(
    params: EChartBrushPayload,
    isNumericXAxis = false,
): TimeRangeMs | undefined {
    const sArea = params?.areas?.[0] ?? params?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    const sStart = Number(sRange[0]);
    const sEnd = Number(sRange[1]);

    if (!Number.isFinite(sStart) || !Number.isFinite(sEnd)) {
        throw new Error('Brush range contains a non-finite value.');
    }

    const sMin = Math.min(sStart, sEnd);
    const sMax = Math.max(sStart, sEnd);

    return {
        startTime: isNumericXAxis ? sMin : Math.floor(sMin),
        endTime: isNumericXAxis ? sMax : Math.ceil(sMax),
    };
}

function getPrimaryDataZoomEventItem(
    zoomData: EChartDataZoomEventPayload,
): EChartDataZoomEventItem | undefined {
    return 'batch' in zoomData ? zoomData.batch[0] : zoomData;
}

function hasExplicitDataZoomRange(
    dataZoomState: EChartDataZoomEventItem | EChartDataZoomOptionStateItem,
): boolean {
    return (
        (dataZoomState.startValue !== undefined && dataZoomState.endValue !== undefined) ||
        (dataZoomState.start !== undefined && dataZoomState.end !== undefined)
    );
}

function getExplicitDataZoomRange(
    zoomData: EChartDataZoomOptionStateItem,
): TimeRangeMs | undefined {
    const sStartValue = zoomData.startValue;
    const sEndValue = zoomData.endValue;

    if (sStartValue === undefined || sEndValue === undefined) {
        return undefined;
    }

    const sStartTime = Number(sStartValue);
    const sEndTime = Number(sEndValue);

    if (!Number.isFinite(sStartTime) || !Number.isFinite(sEndTime)) {
        throw new Error('Data zoom range contains a non-finite value.');
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}
