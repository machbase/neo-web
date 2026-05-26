import type {
    PanelChartAxisPointerPayload,
    PanelChartInstance,
} from './PanelChartRuntimeTypes';

export type PanelChartClientPosition = {
    x: number;
    y: number;
};

export type PanelChartPixelTimestampResult = {
    timestamp: number | undefined;
    convertedPixel: unknown;
    fallbackFromPixel?: unknown;
    conversionMode: 'xAxisIndex' | 'gridIndex';
};

function getFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

export function getPanelChartRecordValue(source: unknown, key: string): unknown {
    return source && typeof source === 'object' && !Array.isArray(source)
        ? (source as Record<string, unknown>)[key]
        : undefined;
}

function normalizePanelChartAxisNumber(
    value: number,
    isNumericXAxis: boolean,
): number | undefined {
    if (!Number.isFinite(value)) {
        return undefined;
    }

    return isNumericXAxis ? value : Math.floor(value);
}

export function parsePanelChartTimestamp(
    value: unknown,
    isNumericXAxis = false,
): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return normalizePanelChartAxisNumber(value, isNumericXAxis);
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'string') {
        const sTimestamp = Number(value);
        return normalizePanelChartAxisNumber(sTimestamp, isNumericXAxis);
    }

    if (Array.isArray(value)) {
        return parsePanelChartTimestamp(value[0], isNumericXAxis);
    }

    return undefined;
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

function getNestedNativeEvent(payload: unknown): unknown {
    return getPanelChartRecordValue(
        getPanelChartRecordValue(payload, 'event'),
        'event',
    );
}

export function getPanelChartEventClientPosition(
    payload: unknown,
): PanelChartClientPosition | undefined {
    const sEvent = getPanelChartRecordValue(payload, 'event');
    const sNestedEvent = getNestedNativeEvent(payload);
    const sClientX =
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'clientX')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'clientX'));
    const sClientY =
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'clientY')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'clientY'));

    return sClientX !== undefined && sClientY !== undefined
        ? { x: sClientX, y: sClientY }
        : undefined;
}

export function getPanelChartEventPixel(
    payload: unknown,
    chartRect: DOMRect | undefined,
): [number, number] | undefined {
    const sEvent = getPanelChartRecordValue(payload, 'event');
    const sNestedEvent = getNestedNativeEvent(payload);
    const sOffsetX =
        getFiniteNumber(getPanelChartRecordValue(payload, 'offsetX')) ??
        getFiniteNumber(getPanelChartRecordValue(payload, 'zrX')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'offsetX')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'zrX')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'offsetX'));
    const sOffsetY =
        getFiniteNumber(getPanelChartRecordValue(payload, 'offsetY')) ??
        getFiniteNumber(getPanelChartRecordValue(payload, 'zrY')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'offsetY')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'zrY')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'offsetY'));

    if (sOffsetX !== undefined && sOffsetY !== undefined) {
        return [sOffsetX, sOffsetY];
    }

    const sClientPosition = getPanelChartEventClientPosition(payload);

    return sClientPosition && chartRect
        ? [
              sClientPosition.x - chartRect.left,
              sClientPosition.y - chartRect.top,
          ]
        : undefined;
}

export function getPanelChartEventPosition(
    payload: unknown,
    chartRect: DOMRect | undefined,
    pixel = getPanelChartEventPixel(payload, chartRect),
    clientPosition = getPanelChartEventClientPosition(payload),
): PanelChartClientPosition {
    return {
        x:
            clientPosition?.x ??
            (pixel ? (chartRect?.left ?? 0) + pixel[0] : chartRect?.left ?? 0),
        y:
            clientPosition?.y ??
            (pixel ? (chartRect?.top ?? 0) + pixel[1] : chartRect?.top ?? 0),
    };
}

export function convertPanelChartPixelToTimestamp(
    instance: PanelChartInstance,
    pixel: [number, number],
    isNumericXAxis = false,
): PanelChartPixelTimestampResult {
    const sAxisConvertedPixel = instance.convertFromPixel?.(
        { xAxisIndex: 0 },
        pixel,
    );
    const sAxisTimestamp = parsePanelChartTimestamp(
        sAxisConvertedPixel,
        isNumericXAxis,
    );

    if (sAxisTimestamp !== undefined) {
        return {
            timestamp: sAxisTimestamp,
            convertedPixel: sAxisConvertedPixel,
            conversionMode: 'xAxisIndex',
        };
    }

    const sGridConvertedPixel = instance.convertFromPixel?.(
        { gridIndex: 0 },
        pixel,
    );

    return {
        timestamp: parsePanelChartTimestamp(sGridConvertedPixel, isNumericXAxis),
        convertedPixel: sGridConvertedPixel,
        fallbackFromPixel: sAxisConvertedPixel,
        conversionMode: 'gridIndex',
    };
}
