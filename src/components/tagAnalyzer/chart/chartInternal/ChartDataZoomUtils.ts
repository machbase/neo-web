import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';
import type {
    EChartBrushPayload,
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from './ChartInteractionTypes';

export function hasExplicitDataZoomEventRange(
    dataZoomState: EChartDataZoomEventPayload,
): boolean {
    const sPrimaryDataZoomState = getPrimaryDataZoomEventItem(dataZoomState);

    return sPrimaryDataZoomState
        ? hasExplicitDataZoomRange(sPrimaryDataZoomState)
        : false;
}

export function hasExplicitDataZoomOptionRange(
    dataZoomState: EChartDataZoomOptionStateItem,
): boolean {
    return hasExplicitDataZoomRange(dataZoomState);
}

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

    return {
        startTime: Number(sStartValue),
        endTime: Number(sEndValue),
    };
}
