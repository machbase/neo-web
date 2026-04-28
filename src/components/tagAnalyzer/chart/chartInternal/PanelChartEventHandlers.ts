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
import type {
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from './PanelChartRuntimeTypes';
import { isSameTimeRange } from '../../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelNavigateState,
    PanelState,
} from '../../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';

type BuildPanelChartEventsParams = {
    navigateState: PanelNavigateState;
    panelState: Pick<PanelState, 'isHighlightActive'>;
    chartRefs: Pick<PanelChartRefs, 'areaChart'>;
    chartHandlers: PanelChartHandlers;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    chartSync: {
        getChartInstance: () => PanelChartInstance | undefined;
        lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
        appliedZoomRangeRef: MutableRefObject<TimeRangeMs | undefined>;
        skipNextPanelRangeSyncRef: MutableRefObject<boolean>;
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
    chartRefs: Pick<PanelChartRefs, 'areaChart'>,
) {
    const sChartRect = chartRefs.areaChart.current?.getBoundingClientRect();

    return {
        x: payload.event?.event?.clientX ?? sChartRect?.left ?? 0,
        y: payload.event?.event?.clientY ?? sChartRect?.top ?? 0,
    };
}

function getNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
}

function getSeriesIndexFromSeriesId(
    seriesId: string | undefined,
    seriesIdPrefix: string,
): number | undefined {
    return seriesId?.startsWith(seriesIdPrefix)
        ? getNonNegativeInteger(seriesId.slice(seriesIdPrefix.length))
        : undefined;
}

export function buildPanelChartEvents({
    navigateState,
    panelState,
    chartRefs,
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
            chartSync.appliedZoomRangeRef.current = sRange;
            chartSync.skipNextPanelRangeSyncRef.current = true;
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
            chartHandlers.onSetExtremes({
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
            const sPosition = getChartClickPosition(params, chartRefs);
            const sAnnotationSeriesIndex =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) ?? getNonNegativeInteger(params.data?.seriesIndex);
            const sAnnotationIndex = getNonNegativeInteger(params.data?.annotationIndex);

            if (sAnnotationSeriesIndex !== undefined && sAnnotationIndex !== undefined) {
                chartHandlers.onOpenSeriesAnnotationEditor({
                    seriesIndex: sAnnotationSeriesIndex,
                    annotationIndex: sAnnotationIndex,
                    position: sPosition,
                });
                return;
            }

            const sHighlightIndex = getNonNegativeInteger(params.dataIndex);

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
