import type { MutableRefObject } from 'react';
import type {
    PanelMarkupHandlers,
    PanelOverlayMode,
} from '../../../domain/PanelDomain';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
} from '../OptionBuildHelpers/ChartOptionConstants';
import type {
    PanelChartClickPayload,
    PanelChartInstance,
} from '../PanelChartRuntimeTypes';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
    getPanelChartRecordValue,
    parsePanelChartTimestamp,
} from '../ChartPointerUtils';
import type { ChartEvents } from './eventCallbackTypes';

function parseNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
}

function getChartClickTimestamp(
    payload: PanelChartClickPayload,
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    chartInstance: PanelChartInstance | undefined,
    latestHoverTimestamp: number | undefined,
    isNumericXAxis: boolean,
): number | undefined {
    const sDirectTimestamp =
        parsePanelChartTimestamp(payload.value, isNumericXAxis) ??
        parsePanelChartTimestamp(payload.data, isNumericXAxis) ??
        parsePanelChartTimestamp(
            getPanelChartRecordValue(payload.data, 'value'),
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(payload.axisValue, isNumericXAxis) ??
        latestHoverTimestamp;

    if (sDirectTimestamp !== undefined) {
        return sDirectTimestamp;
    }

    const sChartRect = chartAreaRef.current?.getBoundingClientRect();
    const sPixel = getPanelChartEventPixel(payload, sChartRect);

    if (!sPixel || !chartInstance?.convertFromPixel) {
        return undefined;
    }

    if (chartInstance.containPixel && !chartInstance.containPixel({ gridIndex: 0 }, sPixel)) {
        return undefined;
    }

    return convertPanelChartPixelToTimestamp(
        chartInstance,
        sPixel,
        isNumericXAxis,
    ).timestamp;
}

function getSeriesIndexFromSeriesId(
    seriesId: string | undefined,
    seriesIdPrefix: string,
): number | undefined {
    if (!seriesId?.startsWith(seriesIdPrefix)) {
        return undefined;
    }

    return parseNonNegativeInteger(
        /^(\d+)/.exec(seriesId.slice(seriesIdPrefix.length))?.[1],
    );
}

export function buildMarkupClickEvent({
    overlayMode,
    chartAreaRef,
    markupHandlers,
    getChartInstance,
    latestHoverTimestampRef,
    isNumericXAxis,
}: {
    overlayMode: PanelOverlayMode;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    markupHandlers: PanelMarkupHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    isNumericXAxis: boolean;
}): Pick<ChartEvents, 'click'> {
    return {
        click: (params: PanelChartClickPayload) => {
            const sChartInstance = getChartInstance();
            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const sPosition = getPanelChartEventPosition(params, sChartRect);
            const sClickedSeriesIndex = parseNonNegativeInteger(params.seriesIndex);
            const sIsAnnotationLabelClick =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) !== undefined;
            const sAnnotationIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'annotationIndex'),
            ) ?? (sIsAnnotationLabelClick ? parseNonNegativeInteger(params.dataIndex) : undefined);

            if (sIsAnnotationLabelClick && sAnnotationIndex !== undefined) {
                markupHandlers.onActivateAnnotationEditor(
                    sPosition,
                    sAnnotationIndex,
                );
                return;
            }

            if (overlayMode === 'annotation') {
                const sTimestamp = getChartClickTimestamp(
                    params,
                    chartAreaRef,
                    sChartInstance,
                    latestHoverTimestampRef.current,
                    isNumericXAxis,
                );

                if (sTimestamp === undefined) {
                    return;
                }

                markupHandlers.onOpenCreateAnnotation(
                    sPosition,
                    sClickedSeriesIndex,
                    sTimestamp,
                );
                return;
            }

            const sHighlightIndex = parseNonNegativeInteger(params.dataIndex);

            if (
                overlayMode === 'highlight' ||
                params.seriesId !== HIGHLIGHT_LABEL_SERIES_ID ||
                sHighlightIndex === undefined
            ) {
                return;
            }

            markupHandlers.onActivateHighlightEditor(sPosition, sHighlightIndex);
        },
    };
}
