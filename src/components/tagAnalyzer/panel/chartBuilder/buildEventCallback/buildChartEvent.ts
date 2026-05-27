import type { MutableRefObject } from 'react';
import type {
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
} from '../../../domain/PanelDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import { isSameTimeRange } from '../../../domain/time/TimeRangeUtils';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
} from '../OptionBuildHelpers/ChartOptionConstants';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartAxisPointerTimestamp,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
    getPanelChartRecordValue,
    parsePanelChartTimestamp,
} from '../ChartPointerUtils';
import {
    extractBrushRange,
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
    hasExplicitDataZoomEventRange,
} from '../ChartDataZoomUtils';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
    PanelChartAxisPointerPayload,
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from '../PanelChartRuntimeTypes';

type ChartEvents = {
    datazoom: (params: EChartDataZoomEventPayload) => void;
    brushEnd: (params: EChartBrushPayload) => void;
    legendselectchanged: (params: PanelChartLegendChangePayload) => void;
    highlight: (params: PanelChartHighlightPayload) => void;
    downplay: (params: PanelChartHighlightPayload) => void;
    updateAxisPointer: (params: PanelChartAxisPointerPayload) => void;
    globalout: () => void;
    click: (params: PanelChartClickPayload) => void;
};

type BuildChartEventParams = {
    ranges: {
        panelRange: TimeRangeMs;
        navigatorRange: TimeRangeMs;
    };
    interactionMode: {
        overlayMode: PanelOverlayMode;
        isSelectionMode: boolean;
        isDragZoomEnabled: boolean;
        isNumericXAxis: boolean;
    };
    chartRefs: {
        chartAreaRef: MutableRefObject<HTMLDivElement | null>;
        chartInstanceRef: MutableRefObject<PanelChartInstance | undefined>;
        latestHoverTimestampRef: MutableRefObject<number | undefined>;
    };
    rangeHandlers: PanelRangeHandlers;
    markupHandlers: PanelMarkupHandlers;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    legendState: {
        applyLegendHoverState: (
            hoveredLegendSeries: string | undefined,
            force?: boolean,
        ) => void;
        setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
        visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    };
};

export function buildChartEvent({
    ranges,
    interactionMode,
    chartRefs,
    rangeHandlers,
    markupHandlers,
    onSelection,
    legendState,
}: BuildChartEventParams): ChartEvents {
    const { panelRange, navigatorRange } = ranges;
    const {
        overlayMode,
        isSelectionMode,
        isDragZoomEnabled,
        isNumericXAxis,
    } = interactionMode;
    const { chartAreaRef, chartInstanceRef, latestHoverTimestampRef } = chartRefs;
    const { applyLegendHoverState, setVisibleSeries, visibleSeriesRef } =
        legendState;

    return {
        datazoom: (params) => {
            const sInstance = chartInstanceRef.current;
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            const sRange = hasExplicitDataZoomEventRange(params)
                ? extractDataZoomEventRange(
                      params,
                      panelRange,
                      navigatorRange,
                  )
                : extractDataZoomOptionRange(
                      { ...sDataZoomState, ...params },
                      panelRange,
                      navigatorRange,
                  );

            if (!sRange || isSameTimeRange(sRange, panelRange)) {
                return;
            }

            rangeHandlers.onPanelRangeChangeFromNavigator({
                min: sRange.startTime,
                max: sRange.endTime,
            });
        },
        brushEnd: (params) => {
            const sRange = extractBrushRange(params, isNumericXAxis);

            if (!sRange) {
                return;
            }

            chartInstanceRef.current?.dispatchAction({
                type: 'brush',
                areas: [],
            });

            if (sRange.endTime <= sRange.startTime) {
                return;
            }

            if (isSelectionMode) {
                onSelection({
                    min: sRange.startTime,
                    max: sRange.endTime,
                });
                return;
            }

            if (
                !isDragZoomEnabled ||
                isSameTimeRange(sRange, panelRange)
            ) {
                return;
            }

            rangeHandlers.onPanelRangeChange({
                min: sRange.startTime,
                max: sRange.endTime,
            });
        },
        legendselectchanged: (params) => {
            visibleSeriesRef.current = params.selected ?? {};
            setVisibleSeries(params.selected ?? {});
        },
        highlight: (params) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(
                    params.seriesName ?? params.name ?? undefined,
                );
            }
        },
        downplay: (params) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(undefined);
            }
        },
        updateAxisPointer: (params) => {
            latestHoverTimestampRef.current =
                getPanelChartAxisPointerTimestamp(params, isNumericXAxis);
        },
        globalout: () => {
            latestHoverTimestampRef.current = undefined;
        },
        click: (params) => {
            const sChartInstance = chartInstanceRef.current;
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

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

function parseNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
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
