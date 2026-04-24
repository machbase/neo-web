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
 * @param aPayload The incoming ECharts highlight/downplay payload.
 * @returns Whether the payload was dispatched by legend hover behavior.
 */
const isLegendHoverPayload = (
    aPayload: PanelChartHighlightPayload | undefined,
): aPayload is PanelChartHighlightPayload & { excludeSeriesId: string[] } => {
    return Array.isArray(aPayload?.excludeSeriesId);
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
    applyLegendHoverState: (aHoveredLegendSeries: string | undefined, aForce?: boolean) => void;
    setVisibleSeries: (aVisibleSeries: Record<string, boolean>) => void;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
};

function getClientPositionFromChartClick(
    aPayload: PanelChartClickPayload,
    aChartRefs: Pick<PanelChartRefs, 'areaChart'>,
) {
    const sChartRect = aChartRefs.areaChart.current?.getBoundingClientRect();

    return {
        x: aPayload.event?.event?.clientX ?? sChartRect?.left ?? 0,
        y: aPayload.event?.event?.clientY ?? sChartRect?.top ?? 0,
    };
}

function getSeriesIndexFromSeriesId(
    aSeriesId: string | undefined,
    aSeriesIdPrefix: string,
): number | undefined {
    if (!aSeriesId?.startsWith(aSeriesIdPrefix)) {
        return undefined;
    }

    const sSeriesIndex = Number(aSeriesId.slice(aSeriesIdPrefix.length));

    return Number.isInteger(sSeriesIndex) && sSeriesIndex >= 0 ? sSeriesIndex : undefined;
}

function getSeriesIndexFromPayloadData(
    aPayload: PanelChartClickPayload,
    aFieldName: string,
): number | undefined {
    const sSeriesIndex = Number(aPayload.data?.[aFieldName]);

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
            datazoom: (aParams: EChartDataZoomEventPayload) => {
                const sInstance = getChartInstance();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
                const sRange = hasExplicitDataZoomEventRange(aParams)
                    ? extractDataZoomEventRange(
                          aParams,
                          navigateState.panelRange,
                          navigateState.navigatorRange,
                      )
                    : extractDataZoomOptionRange(
                          { ...sDataZoomState, ...aParams },
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
            brushEnd: (aParams: EChartBrushPayload) => {
                const sRange = extractBrushRange(aParams);
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
            legendselectchanged: (aParams: PanelChartLegendChangePayload) => {
                visibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
            highlight: (aParams: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(aParams.seriesName ?? aParams.name ?? undefined);
            },
            downplay: (aParams: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(undefined);
            },
            click: (aParams: PanelChartClickPayload) => {
                const sClientPosition = getClientPositionFromChartClick(aParams, chartRefs);
                const sAnnotationSeriesIndex =
                    getSeriesIndexFromSeriesId(
                        aParams.seriesId,
                        ANNOTATION_LABEL_SERIES_ID_PREFIX,
                    ) ?? getSeriesIndexFromPayloadData(aParams, 'seriesIndex');
                const sAnnotationIndex = Number(aParams.data?.annotationIndex);

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

                const sHighlightIndex = Number(aParams.dataIndex);

                if (
                    panelState.isHighlightActive ||
                    aParams.seriesId !== HIGHLIGHT_LABEL_SERIES_ID ||
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
