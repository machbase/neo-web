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
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from './PanelChartRuntimeTypes';
import { isSameTimeRange } from '../../time/TimeRangeUtils';
import type { ResolvedTimeRangeMs } from '../../time/TimeTypes';

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

type ChartEventHandlers = {
    onPanelRangeChange: (event: ChartRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: ChartRangeChangeEvent) => unknown;
    onSelection: (event: ChartRangeChangeEvent) => unknown;
    onOpenHighlightRename: (request: ChartHighlightEditRequest) => unknown;
    onOpenSeriesAnnotationEditor: (request: ChartSeriesAnnotationEditRequest) => unknown;
};

type ChartNavigateRangeState = {
    panelRange: ResolvedTimeRangeMs;
    navigatorRange: ResolvedTimeRangeMs;
};

type ChartHighlightState = {
    isHighlightActive: boolean;
};

type BuildPanelChartEventsParams = {
    navigateState: ChartNavigateRangeState;
    panelState: ChartHighlightState;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartHandlers: ChartEventHandlers;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    chartSync: {
        getChartInstance: () => PanelChartInstance | undefined;
        lastZoomRangeRef: MutableRefObject<ResolvedTimeRangeMs>;
        applyLegendHoverState: (
            hoveredLegendSeries: string | undefined,
            force?: boolean,
        ) => void;
        setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
        visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    };
};

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

function getChartClickPosition(
    payload: PanelChartClickPayload,
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
) {
    const sChartRect = chartAreaRef.current?.getBoundingClientRect();

    return {
        x: payload.event?.event?.clientX ?? sChartRect?.left ?? 0,
        y: payload.event?.event?.clientY ?? sChartRect?.top ?? 0,
    };
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
        click: (params: PanelChartClickPayload) => {
            const sPosition = getChartClickPosition(params, chartAreaRef);
            const sAnnotationSeriesIndex =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) ?? parseNonNegativeInteger(params.data?.seriesIndex);
            const sAnnotationIndex = parseNonNegativeInteger(
                params.data?.annotationIndex,
            );

            if (sAnnotationSeriesIndex !== undefined && sAnnotationIndex !== undefined) {
                chartHandlers.onOpenSeriesAnnotationEditor({
                    seriesIndex: sAnnotationSeriesIndex,
                    annotationIndex: sAnnotationIndex,
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

            chartHandlers.onOpenHighlightRename({
                highlightIndex: sHighlightIndex,
                position: sPosition,
            });
        },
    };
}
