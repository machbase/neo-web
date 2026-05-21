import type { MutableRefObject } from 'react';
import type {
    PanelMarkupHandlers,
    PanelOverlayMode,
} from '../../../domain/PanelChartModel';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
} from '../../../domain/ChartConstants';
import { parseNonNegativeInteger } from '../../../domain/IntegerParsing';
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
import type { ChartMarkupClickEvents } from './eventCallbackTypes';

function getChartClickTimestamp(
    payload: PanelChartClickPayload,
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    chartInstance: PanelChartInstance | undefined,
    latestHoverTimestamp: number | undefined,
): number | undefined {
    const sDirectTimestamp =
        parsePanelChartTimestamp(payload.value) ??
        parsePanelChartTimestamp(payload.data) ??
        parsePanelChartTimestamp(getPanelChartRecordValue(payload.data, 'value')) ??
        parsePanelChartTimestamp(payload.axisValue) ??
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

    return convertPanelChartPixelToTimestamp(chartInstance, sPixel).timestamp;
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
}: {
    overlayMode: PanelOverlayMode;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    markupHandlers: PanelMarkupHandlers;
    getChartInstance: () => PanelChartInstance | undefined;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
}): ChartMarkupClickEvents {
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
