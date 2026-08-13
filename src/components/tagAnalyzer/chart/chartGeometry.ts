import { type PanelChartAxisPointerPayload, type PanelChartInstance, type EChartBrushPayload, type EChartDataZoomEventPayload, type EChartDataZoomOptionStateItem } from './chartRuntime';
import {
    getRangeWidth,
} from '../range/rangeArithmetic';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import type { AxisRange } from '../range/rangeModel';

// Layout
export const PANEL_CHART_HEIGHT = 350;
export const PANEL_GRID_BOTTOM = 20;
export const PANEL_GRID_SIDE = 35;
export const PANEL_NAVIGATOR_GRID_SIDE = 28;
export const PANEL_SLIDER_HEIGHT = 36;

const PANEL_MAIN_TOP = 16;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_TOOLBAR_HEIGHT = 28;
const PANEL_TOOLBAR_GAP = 22;
const PANEL_MAIN_MIN_HEIGHT = 100;

export function getChartLayoutMetrics(showLegend: boolean) {
    const sMainGridTop = showLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: Math.max(
            sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop,
            PANEL_MAIN_MIN_HEIGHT,
        ),
        toolbarTop: sToolbarTop,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }
    return Math.max(chartAreaWidth - PANEL_NAVIGATOR_GRID_SIDE * 2, 1);
}

// Pointer events
export type PanelChartClientPosition = {
    x: number;
    y: number;
};

export function getPanelChartRecordValue(source: unknown, key: string): unknown {
    return source && typeof source === 'object' && !Array.isArray(source)
        ? (source as Record<string, unknown>)[key]
        : undefined;
}

function getFiniteRecordValue(
    source: unknown,
    ...keys: string[]
): number | undefined {
    for (const key of keys) {
        const value = getPanelChartRecordValue(source, key);
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
}

export function parsePanelChartTimestamp(
    value: unknown,
    isNumericXAxis = false,
): number | undefined {
    if (Array.isArray(value)) {
        return parsePanelChartTimestamp(value[0], isNumericXAxis);
    }

    const timestamp =
        value instanceof Date
            ? value.getTime()
            : typeof value === 'number' || typeof value === 'string'
              ? Number(value)
              : Number.NaN;

    return Number.isFinite(timestamp)
        ? isNumericXAxis
            ? timestamp
            : Math.floor(timestamp)
        : undefined;
}

export function getPanelChartAxisPointerTimestamp(
    payload: PanelChartAxisPointerPayload,
    isNumericXAxis = false,
): number | undefined {
    const sXAxisInfo = payload.axesInfo?.find(
        (axisInfo) => axisInfo.axisDim === 'x' && axisInfo.axisIndex === 0,
    );

    return parsePanelChartTimestamp(sXAxisInfo?.value, isNumericXAxis);
}

export function getPanelChartEventCoordinates(
    payload: unknown,
    chartRect: DOMRect | undefined,
): {
    pixel: [number, number] | undefined;
    position: PanelChartClientPosition | undefined;
} {
    const sEvent = getPanelChartRecordValue(payload, 'event');
    const sNestedEvent = getPanelChartRecordValue(sEvent, 'event');
    const sClientX =
        getFiniteRecordValue(sEvent, 'clientX') ??
        getFiniteRecordValue(sNestedEvent, 'clientX');
    const sClientY =
        getFiniteRecordValue(sEvent, 'clientY') ??
        getFiniteRecordValue(sNestedEvent, 'clientY');
    const sClientPosition =
        sClientX !== undefined && sClientY !== undefined
        ? { x: sClientX, y: sClientY }
        : undefined;
    const sOffsetX =
        getFiniteRecordValue(payload, 'offsetX', 'zrX') ??
        getFiniteRecordValue(sEvent, 'offsetX', 'zrX') ??
        getFiniteRecordValue(sNestedEvent, 'offsetX');
    const sOffsetY =
        getFiniteRecordValue(payload, 'offsetY', 'zrY') ??
        getFiniteRecordValue(sEvent, 'offsetY', 'zrY') ??
        getFiniteRecordValue(sNestedEvent, 'offsetY');
    const sPixel: [number, number] | undefined =
        sOffsetX !== undefined && sOffsetY !== undefined
            ? [sOffsetX, sOffsetY]
            : sClientPosition && chartRect
              ? [
                    sClientPosition.x - chartRect.left,
                    sClientPosition.y - chartRect.top,
                ]
              : undefined;

    return {
        pixel: sPixel,
        position:
            sClientPosition ??
            (sPixel && chartRect
                ? {
                      x: chartRect.left + sPixel[0],
                      y: chartRect.top + sPixel[1],
                  }
                : undefined),
    };
}

export function convertPanelChartPixelToTimestamp(
    instance: PanelChartInstance,
    pixel: [number, number],
    isNumericXAxis = false,
): number | undefined {
    return (
        parsePanelChartTimestamp(
            instance.convertFromPixel?.({ xAxisIndex: 0 }, pixel),
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(
            instance.convertFromPixel?.({ gridIndex: 0 }, pixel),
            isNumericXAxis,
        )
    );
}

// Range selections
const DATA_ZOOM_RELATIVE_ERROR_RATIO = 1e-9;

export function resolveDataZoomEventItem(
    params: EChartDataZoomEventPayload,
    targetDataZoomId?: string,
    fallbackState?: EChartDataZoomOptionStateItem,
): EChartDataZoomOptionStateItem {
    const sZoomData =
        'batch' in params
            ? selectDataZoomItem(params.batch, targetDataZoomId)
            : params;

    if (
        sZoomData &&
        ((sZoomData.startValue !== undefined &&
            sZoomData.endValue !== undefined) ||
            (sZoomData.start !== undefined && sZoomData.end !== undefined))
    ) {
        return sZoomData;
    }

    return { ...fallbackState, ...sZoomData };
}

export function extractDataZoomOptionRange(
    params: EChartDataZoomOptionStateItem,
    axisRange: AxisRange,
): AxisRange | undefined {
    const sAxisSpan = getRangeWidth(axisRange);
    if (
        typeof params.start === 'number' &&
        typeof params.end === 'number' &&
        sAxisSpan > 0
    ) {
        const sFirst =
            axisRange.start + (sAxisSpan * params.start) / 100;
        const sSecond =
            axisRange.start + (sAxisSpan * params.end) / 100;
        return createNonEmptyAxisRange(sFirst, sSecond);
    }

    return getExplicitDataZoomRange(params);
}

export function isSameDataZoomSelection(
    selection: EChartDataZoomOptionStateItem,
    expectedRange: AxisRange,
    axisRange: AxisRange,
): boolean {
    const sAxisSpan = getRangeWidth(axisRange);
    const sFirstRatio = typeof selection.start === 'number'
        ? selection.start / 100
        : selection.startValue === undefined
          ? undefined
          : (Number(selection.startValue) - axisRange.start) / sAxisSpan;
    const sSecondRatio = typeof selection.end === 'number'
        ? selection.end / 100
        : selection.endValue === undefined
          ? undefined
          : (Number(selection.endValue) - axisRange.start) / sAxisSpan;
    const sExpectedStartRatio =
        (expectedRange.start - axisRange.start) / sAxisSpan;
    const sExpectedEndRatio =
        (expectedRange.end - axisRange.start) / sAxisSpan;
    const sExpectedWidthRatio =
        sExpectedEndRatio - sExpectedStartRatio;

    return (
        sFirstRatio !== undefined &&
        sSecondRatio !== undefined &&
        Math.abs(Math.min(sFirstRatio, sSecondRatio) - sExpectedStartRatio) /
            sExpectedWidthRatio <=
            DATA_ZOOM_RELATIVE_ERROR_RATIO &&
        Math.abs(Math.max(sFirstRatio, sSecondRatio) - sExpectedEndRatio) /
            sExpectedWidthRatio <=
            DATA_ZOOM_RELATIVE_ERROR_RATIO
    );
}

export function extractBrushRange(
    params: EChartBrushPayload,
    isNumericXAxis = false,
): AxisRange | undefined {
    const sArea = params?.areas?.[0] ?? params?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    const sStart = Number(sRange[0]);
    const sEnd = Number(sRange[1]);
    const sMin = Math.min(sStart, sEnd);
    const sMax = Math.max(sStart, sEnd);

    return createNonEmptyAxisRange(
        isNumericXAxis ? sMin : Math.floor(sMin),
        isNumericXAxis ? sMax : Math.ceil(sMax),
    );
}

export function selectDataZoomItem<
    T extends { id?: string; dataZoomId?: string },
>(
    zoomData: T[] | undefined,
    targetDataZoomId?: string,
): T | undefined {
    if (targetDataZoomId === undefined) {
        return zoomData?.[0];
    }

    return zoomData?.find(
        (item) =>
            item.id === targetDataZoomId ||
            item.dataZoomId === targetDataZoomId,
    ) ?? zoomData?.[0];
}

function getExplicitDataZoomRange(
    zoomData: EChartDataZoomOptionStateItem,
): AxisRange | undefined {
    const sStartValue = zoomData.startValue;
    const sEndValue = zoomData.endValue;

    if (sStartValue === undefined || sEndValue === undefined) {
        return undefined;
    }

    const sFirst = Number(sStartValue);
    const sSecond = Number(sEndValue);
    return createNonEmptyAxisRange(sFirst, sSecond);
}
