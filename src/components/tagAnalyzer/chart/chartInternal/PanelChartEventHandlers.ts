import type { MutableRefObject } from 'react';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
} from './ChartInteractionTypes';
import {
    extractBrushRange,
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
    hasExplicitDataZoomEventRange,
} from './ChartDataZoomUtils';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
} from '../options/OptionBuildHelpers/ChartOptionConstants';
import { parseNonNegativeInteger } from '../../domain/IntegerParsing';
import type {
    PanelChartAxisPointerPayload,
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from './PanelChartRuntimeTypes';
import { isSameTimeRange } from '../../time/TimeRangeUtils';
import type { TimeRangeMs } from '../../time/TimeTypes';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartAxisPointerTimestamp,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
    getPanelChartRecordValue,
    parsePanelChartTimestamp,
} from './PanelChartPointerUtils';

type ChartRangeChangeEvent = {
    min: number;
    max: number;
    trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
};

type ChartHighlightEditRequest = {
    highlightIndex: number;
    position: {
        x: number;
        y: number;
    };
};

type ChartSeriesAnnotationEditRequest = {
    seriesIndex: number;
    annotationIndex: number;
    position: {
        x: number;
        y: number;
    };
};

type ChartCreateAnnotationRequest = {
    timestamp: number;
    seriesIndex?: number;
    position: {
        x: number;
        y: number;
    };
};

type ChartEventHandlers = {
    onPanelRangeChange: (event: ChartRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: ChartRangeChangeEvent) => unknown;
    onSelection: (event: ChartRangeChangeEvent) => unknown;
    onOpenCreateAnnotation: (request: ChartCreateAnnotationRequest) => unknown;
    onActivateHighlightEditor: (request: ChartHighlightEditRequest) => unknown;
    onActivateAnnotationEditor: (request: ChartSeriesAnnotationEditRequest) => unknown;
};

type ChartNavigateRangeState = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

type ChartPanelState = {
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
};

type BuildPanelChartEventsParams = {
    navigateState: ChartNavigateRangeState;
    panelState: ChartPanelState;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartHandlers: ChartEventHandlers;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    chartSync: {
        getChartInstance: () => PanelChartInstance | undefined;
        lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
        applyLegendHoverState: (
            hoveredLegendSeries: string | undefined,
            force?: boolean,
        ) => void;
        setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
        visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
        latestHoverTimestampRef: MutableRefObject<number | undefined>;
    };
};

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

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
    return seriesId?.startsWith(seriesIdPrefix)
        ? parseNonNegativeInteger(seriesId.slice(seriesIdPrefix.length))
        : undefined;
}

export function buildPanelChartEvents({
    navigateState,
    panelState,
    chartAreaRef,
    chartHandlers,
    isSelectionMode,
    isDragZoomEnabled,
    chartSync,
}: BuildPanelChartEventsParams) {
    return {
        datazoom: (params: EChartDataZoomEventPayload) => {
            const sInstance = chartSync.getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            const sRange = hasExplicitDataZoomEventRange(params)
                ? extractDataZoomEventRange(
                      params,
                      navigateState.panelRange,
                      navigateState.navigatorRange,
                  )
                : extractDataZoomOptionRange(
                      { ...sDataZoomState, ...params },
                      navigateState.panelRange,
                      navigateState.navigatorRange,
                  );

            if (isSameTimeRange(sRange, chartSync.lastZoomRangeRef.current)) {
                return;
            }

            chartSync.lastZoomRangeRef.current = sRange;
            chartHandlers.onPanelRangeChange({
                min: sRange.startTime,
                max: sRange.endTime,
                trigger: 'navigator',
            });
        },
        brushEnd: (params: EChartBrushPayload) => {
            const sRange = extractBrushRange(params);

            if (!sRange) {
                return;
            }

            chartSync.getChartInstance()?.dispatchAction({
                type: 'brush',
                areas: [],
            });

            if (sRange.endTime <= sRange.startTime) {
                return;
            }

            if (isSelectionMode) {
                chartHandlers.onSelection({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: undefined,
                });
                return;
            }

            if (
                !isDragZoomEnabled ||
                isSameTimeRange(sRange, chartSync.lastZoomRangeRef.current)
            ) {
                return;
            }

            chartSync.lastZoomRangeRef.current = sRange;
            chartHandlers.onPanelRangeChange({
                min: sRange.startTime,
                max: sRange.endTime,
                trigger: 'brushZoom',
            });
        },
        legendselectchanged: (params: PanelChartLegendChangePayload) => {
            chartSync.visibleSeriesRef.current = params.selected ?? {};
            chartSync.setVisibleSeries(params.selected ?? {});
        },
        highlight: (params: PanelChartHighlightPayload) => {
            if (isLegendHoverPayload(params)) {
                chartSync.applyLegendHoverState(
                    params.seriesName ?? params.name ?? undefined,
                );
            }
        },
        downplay: (params: PanelChartHighlightPayload) => {
            if (isLegendHoverPayload(params)) {
                chartSync.applyLegendHoverState(undefined);
            }
        },
        updateAxisPointer: (params: PanelChartAxisPointerPayload) => {
            chartSync.latestHoverTimestampRef.current =
                getPanelChartAxisPointerTimestamp(params);
        },
        globalout: () => {
            chartSync.latestHoverTimestampRef.current = undefined;
        },
        click: (params: PanelChartClickPayload) => {
            const sChartInstance = chartSync.getChartInstance();
            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const sPosition = getPanelChartEventPosition(params, sChartRect);
            const sClickedSeriesIndex = parseNonNegativeInteger(params.seriesIndex);
            const sAnnotationSeriesIndex =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) ?? parseNonNegativeInteger(getPanelChartRecordValue(params.data, 'seriesIndex'));
            const sAnnotationIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'annotationIndex'),
            ) ?? (
                sAnnotationSeriesIndex !== undefined
                    ? parseNonNegativeInteger(params.dataIndex)
                    : undefined
            );

            if (sAnnotationSeriesIndex !== undefined && sAnnotationIndex !== undefined) {
                chartHandlers.onActivateAnnotationEditor({
                    seriesIndex: sAnnotationSeriesIndex,
                    annotationIndex: sAnnotationIndex,
                    position: sPosition,
                });
                return;
            }

            if (panelState.isAnnotationActive) {
                const sTimestamp = getChartClickTimestamp(
                    params,
                    chartAreaRef,
                    sChartInstance,
                    chartSync.latestHoverTimestampRef.current,
                );

                if (sTimestamp === undefined) {
                    return;
                }

                chartHandlers.onOpenCreateAnnotation({
                    timestamp: sTimestamp,
                    seriesIndex: sClickedSeriesIndex,
                    position: sPosition,
                });
                return;
            }

            const sHighlightIndex = parseNonNegativeInteger(params.dataIndex);

            if (
                panelState.isHighlightActive ||
                params.seriesId !== HIGHLIGHT_LABEL_SERIES_ID ||
                sHighlightIndex === undefined
            ) {
                return;
            }

            chartHandlers.onActivateHighlightEditor({
                highlightIndex: sHighlightIndex,
                position: sPosition,
            });
        },
    };
}
