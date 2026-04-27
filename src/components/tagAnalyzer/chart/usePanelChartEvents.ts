import { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
} from './ChartInteractionTypes';
import {
    extractBrushRange,
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
} from './ChartInteractionUtils';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    HIGHLIGHT_LABEL_SERIES_ID,
} from './options/ChartOptionConstants';
import type {
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from './PanelChartRuntimeTypes';
import { hasExplicitDataZoomEventRange } from './ChartDataZoomStateUtils';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

/**
 * Returns whether a highlight/downplay payload came from legend hover actions.
 * Intent: Detect legend hover payloads so the chart can skip ordinary highlight handling.
 * @param payload The incoming ECharts highlight/downplay payload.
 * @returns Whether the payload was dispatched by legend hover behavior.
 */
const isLegendHoverPayload = (
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } => {
    return Array.isArray(payload?.excludeSeriesId);
};

type UsePanelChartEventsParams = {
    getChartInstance: () => PanelChartInstance | undefined;
    navigateState: PanelNavigateState;
    panelState: Pick<PanelState, 'isHighlightActive'>;
    chartRefs: Pick<PanelChartRefs, 'areaChart'>;
    chartHandlers: PanelChartHandlers;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
    appliedZoomRangeRef: MutableRefObject<TimeRangeMs | undefined>;
    skipNextPanelRangeSyncRef: MutableRefObject<boolean>;
    applyLegendHoverState: (hoveredLegendSeries: string | undefined, force?: boolean) => void;
    setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
};

function getClientPositionFromChartClick(
    payload: PanelChartClickPayload,
    chartRefs: Pick<PanelChartRefs, 'areaChart'>,
) {
    const sChartRect = chartRefs.areaChart.current?.getBoundingClientRect();

    return {
        x: payload.event?.event?.clientX ?? sChartRect?.left ?? 0,
        y: payload.event?.event?.clientY ?? sChartRect?.top ?? 0,
    };
}

function getSeriesIndexFromSeriesId(
    seriesId: string | undefined,
    seriesIdPrefix: string,
): number | undefined {
    if (!seriesId?.startsWith(seriesIdPrefix)) {
        return undefined;
    }

    const sSeriesIndex = Number(seriesId.slice(seriesIdPrefix.length));

    return Number.isInteger(sSeriesIndex) && sSeriesIndex >= 0 ? sSeriesIndex : undefined;
}

function getSeriesIndexFromPayloadData(
    payload: PanelChartClickPayload,
    fieldName: string,
): number | undefined {
    const sSeriesIndex = Number(payload.data?.[fieldName]);

    return Number.isInteger(sSeriesIndex) && sSeriesIndex >= 0 ? sSeriesIndex : undefined;
}

/**
 * Builds the ECharts event handler map used by the panel chart.
 * Intent: Keep ECharts event routing outside the chart render component.
 * @param aParams The current chart state, refs, range refs, and handler callbacks.
 * @returns The ECharts event map.
 */
export function usePanelChartEvents({
    getChartInstance,
    navigateState,
    panelState,
    chartRefs,
    chartHandlers,
    isSelectionMode,
    isDragZoomEnabled,
    lastZoomRangeRef,
    appliedZoomRangeRef,
    skipNextPanelRangeSyncRef,
    applyLegendHoverState,
    setVisibleSeries,
    visibleSeriesRef,
}: UsePanelChartEventsParams) {
    return useMemo(
        () => ({
            datazoom: (params: EChartDataZoomEventPayload) => {
                const sInstance = getChartInstance();
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
                if (isSameTimeRange(sRange, lastZoomRangeRef.current)) {
                    return;
                }

                lastZoomRangeRef.current = sRange;
                appliedZoomRangeRef.current = sRange;
                skipNextPanelRangeSyncRef.current = true;
                chartHandlers.onSetExtremes({
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

                const sInstance = getChartInstance();
                sInstance?.dispatchAction({
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

                if (!isDragZoomEnabled || isSameTimeRange(sRange, lastZoomRangeRef.current)) {
                    return;
                }

                lastZoomRangeRef.current = sRange;
                chartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'brushZoom',
                });
            },
            legendselectchanged: (params: PanelChartLegendChangePayload) => {
                visibleSeriesRef.current = params.selected ?? {};
                setVisibleSeries(params.selected ?? {});
            },
            highlight: (params: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(params)) {
                    return;
                }

                applyLegendHoverState(params.seriesName ?? params.name ?? undefined);
            },
            downplay: (params: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(params)) {
                    return;
                }

                applyLegendHoverState(undefined);
            },
            click: (params: PanelChartClickPayload) => {
                const sClientPosition = getClientPositionFromChartClick(params, chartRefs);
                const sAnnotationSeriesIndex =
                    getSeriesIndexFromSeriesId(
                        params.seriesId,
                        ANNOTATION_LABEL_SERIES_ID_PREFIX,
                    ) ?? getSeriesIndexFromPayloadData(params, 'seriesIndex');
                const sAnnotationIndex = Number(params.data?.annotationIndex);

                if (
                    sAnnotationSeriesIndex !== undefined &&
                    Number.isInteger(sAnnotationIndex) &&
                    sAnnotationIndex >= 0
                ) {
                    chartHandlers.onOpenSeriesAnnotationEditor({
                        seriesIndex: sAnnotationSeriesIndex,
                        annotationIndex: sAnnotationIndex,
                        position: sClientPosition,
                    });
                    return;
                }

                const sHighlightIndex = Number(params.dataIndex);

                if (
                    panelState.isHighlightActive ||
                    params.seriesId !== HIGHLIGHT_LABEL_SERIES_ID ||
                    !Number.isInteger(sHighlightIndex) ||
                    sHighlightIndex < 0
                ) {
                    return;
                }

                chartHandlers.onOpenHighlightRename({
                    highlightIndex: sHighlightIndex,
                    position: sClientPosition,
                });
            },
        }),
        [
            appliedZoomRangeRef,
            applyLegendHoverState,
            chartHandlers,
            chartRefs,
            getChartInstance,
            isDragZoomEnabled,
            isSelectionMode,
            lastZoomRangeRef,
            navigateState.chartData,
            navigateState.navigatorRange,
            navigateState.panelRange,
            panelState.isHighlightActive,
            setVisibleSeries,
            skipNextPanelRangeSyncRef,
            visibleSeriesRef,
        ],
    );
}
