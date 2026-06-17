import type { MutableRefObject } from 'react';
import {
    PanelOverlayMode,
    type PanelRangeChangeEvent,
    type PanelMarkupHandlers,
    type PanelRangeActions,
} from '../../../domain/PanelDomain';
import type { TimeRangeMs } from '../../../domain/time/model/TimeTypes';
import {
    getTimeRangeWidth,
    isSameTimeRange,
} from '../../../domain/time/range/TimeRangeUtils';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
    MAIN_PANEL_SERIES_ID_PREFIX,
} from '../options/PanelChartOptionConstants';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartAxisPointerTimestamp,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
    getPanelChartRecordValue,
    parsePanelChartTimestamp,
} from '../utils/PanelChartPointerUtils';
import {
    extractBrushRange,
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
    hasExplicitDataZoomEventRange,
} from '../utils/PanelChartDataZoomUtils';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
    PanelChartAxisPointerPayload,
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from '../types/PanelChartRuntimeTypes';

type ChartEvents = {
    datazoom: (params: EChartDataZoomEventPayload) => void;
    brushEnd: (params: EChartBrushPayload) => void;
    mouseover: (params: PanelChartClickPayload) => void;
    mouseout: (params: PanelChartClickPayload) => void;
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
        latestChartClickRef: MutableRefObject<number>;
    };
    rangeActions: PanelRangeActions;
    markupHandlers: PanelMarkupHandlers;
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
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
    rangeActions,
    markupHandlers,
    onHoveredMainSeriesChange,
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
    const {
        chartAreaRef,
        chartInstanceRef,
        latestHoverTimestampRef,
        latestChartClickRef,
    } = chartRefs;
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
            const sIsSameRange = sRange
                ? isSameDataZoomRange(sRange, panelRange, isNumericXAxis)
                : false;

            if (
                !sRange ||
                sIsSameRange
            ) {
                return;
            }

            rangeActions.applyMainNavigatorSelectionRange({
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

            rangeActions.applyMainZoomRange({
                min: sRange.startTime,
                max: sRange.endTime,
            });
        },
        legendselectchanged: (params) => {
            visibleSeriesRef.current = params.selected ?? {};
            setVisibleSeries(params.selected ?? {});
        },
        mouseover: (params) => {
            const sMainSeriesName = getMainSeriesName(params);

            if (sMainSeriesName !== undefined) {
                onHoveredMainSeriesChange(sMainSeriesName);
            }
        },
        mouseout: (params) => {
            if (getMainSeriesName(params) !== undefined) {
                onHoveredMainSeriesChange(undefined);
            }
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
            onHoveredMainSeriesChange(undefined);
        },
        click: (params) => {
            const sChartInstance = chartInstanceRef.current;
            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const sPosition = getPanelChartEventPosition(params, sChartRect);
            const sClickedSeriesIndex = getSeriesIndexFromSeriesId(
                params.seriesId,
                MAIN_PANEL_SERIES_ID_PREFIX,
            );
            const sIsAnnotationLabelClick =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) !== undefined;
            const sAnnotationIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'annotationIndex'),
            ) ?? (sIsAnnotationLabelClick ? parseNonNegativeInteger(params.dataIndex) : undefined);

            if (sIsAnnotationLabelClick && sAnnotationIndex !== undefined) {
                latestChartClickRef.current += 1;
                markupHandlers.onActivateAnnotationEditor(
                    sPosition,
                    sAnnotationIndex,
                );
                return;
            }

            if (overlayMode === PanelOverlayMode.ANNOTATION) {
                if (
                    !isMainGridClick(
                        params,
                        chartAreaRef,
                        sChartInstance,
                    )
                ) {
                    return;
                }

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

                latestChartClickRef.current += 1;
                markupHandlers.onOpenCreateAnnotation(
                    sPosition,
                    sClickedSeriesIndex,
                    sTimestamp,
                );
                return;
            }

            const sIsHighlightLabelClick = params.seriesId === HIGHLIGHT_LABEL_SERIES_ID;
            const sHighlightIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'highlightIndex'),
            ) ?? (sIsHighlightLabelClick ? parseNonNegativeInteger(params.dataIndex) : undefined);

            if (
                overlayMode === PanelOverlayMode.HIGHLIGHT ||
                !sIsHighlightLabelClick ||
                sHighlightIndex === undefined
            ) {
                return;
            }

            latestChartClickRef.current += 1;
            markupHandlers.onActivateHighlightEditor(sPosition, sHighlightIndex);
        },
    };
}

function isSameDataZoomRange(
    left: TimeRangeMs,
    right: TimeRangeMs,
    isNumericXAxis: boolean,
): boolean {
    const sRangeWidth = Math.abs(getTimeRangeWidth(right));
    const sTolerance = isNumericXAxis
        ? Math.max(sRangeWidth * 1e-9, Number.EPSILON)
        : Math.max(sRangeWidth * 1e-9, 1);

    return (
        Math.abs(left.startTime - right.startTime) <= sTolerance &&
        Math.abs(left.endTime - right.endTime) <= sTolerance
    );
}

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

function getMainSeriesName(payload: PanelChartClickPayload): string | undefined {
    if (
        getSeriesIndexFromSeriesId(
            payload.seriesId,
            MAIN_PANEL_SERIES_ID_PREFIX,
        ) === undefined
    ) {
        return undefined;
    }

    const sSeriesName = payload.seriesName?.trim();

    return sSeriesName ? sSeriesName : undefined;
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

function isMainGridClick(
    payload: PanelChartClickPayload,
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    chartInstance: PanelChartInstance | undefined,
): boolean {
    const sChartRect = chartAreaRef.current?.getBoundingClientRect();
    const sPixel = getPanelChartEventPixel(payload, sChartRect);

    return Boolean(
        sPixel &&
        chartInstance?.containPixel?.({ gridIndex: 0 }, sPixel),
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
