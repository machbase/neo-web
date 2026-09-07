import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { ECElementEvent, EChartsOption, EChartsType, ElementEvent, SetOptionOpts } from 'echarts';
import type { EChartsType as NativeEChartsType } from 'echarts/core';
import type { AxisRange, RangeState } from '../range/rangeModel';
import { getRangeWidth, isSameRange } from '../range/rangeArithmetic';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import { asRecord } from '../objectGuards';
import { useStableCallback } from '../hooks/useStableCallback';
import { hasNumericBaseTimeSeries } from '../seriesModel';
import type { PanelHighlight } from '../markup/markupModel';
import { isAnnotationLabelSeries, isHighlightLabelSeries } from '../markup/chartMarkupOptions';
import type { ChartSeriesVisibilityMap } from './chartData';
import {
    buildChartOption,
    buildChartSeriesOption,
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_NAVIGATOR_SERIES_ID_PREFIX,
    PANEL_SLIDER_DATA_ZOOM_ID,
    type PanelChartRuntime,
    type RuntimePanelChartConfig,
} from './chartOptions';

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export type PanelChartHandle = {
    getVisibleSeries: () => Array<{ name: string; visible: boolean }>;
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

export type PanelChartHandlers = {
    rangeActions: {
        setMainRange: (range: AxisRange) => void;
        shiftMainRangeLeft: () => void;
        shiftMainRangeRight: () => void;
    };
    markupHandlers: {
        onOpenCreateAnnotation: (
            position: PanelChartClientPosition,
            seriesIndex: number | undefined,
            timestamp: number,
        ) => void;
        onActivateHighlightEditor: (
            position: PanelChartClientPosition,
            highlightIndex: number,
        ) => void;
        onActivateAnnotationEditor: (
            position: PanelChartClientPosition,
            annotationIndex: number,
        ) => void;
    };
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (selectionRange: AxisRange) => void;
};

export type ChartInteractionInputs = {
    refs: {
        chartAreaRef: MutableRefObject<HTMLDivElement | null>;
        chartApiRef: MutableRefObject<PanelChartHandle | null>;
    };
    runtimeConfig: RuntimePanelChartConfig;
    draftHighlight?: PanelHighlight;
    overlayMode: PanelOverlayMode;
    data: PanelChartRuntime['data'];
    rangeState: RangeState;
    handlers: PanelChartHandlers;
};

export function useChartInteraction({
    refs,
    runtimeConfig,
    draftHighlight,
    overlayMode,
    data,
    rangeState,
    handlers,
}: ChartInteractionInputs) {
    const { chartAreaRef, chartApiRef } = refs;
    const { chartData, navigatorChartData } = data;
    const { mainRange, navigatorRange } = rangeState;
    const {
        rangeActions,
        markupHandlers,
        onHoveredMainSeriesChange,
        onSelection,
    } = handlers;
    const { display, query } = runtimeConfig;
    const seriesList = query.tagSet;
    const latestHoverTimestampRef = useRef<number | undefined>();
    const latestChartClickRef = useRef(0);
    const latestRangeStateRef = useRef(rangeState);
    const committedDataRef = useRef({ chartData, navigatorChartData });
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    latestRangeStateRef.current = rangeState;
    const sAnimateMainDataUpdate = committedDataRef.current.chartData === chartData;
    const sAnimateNavigatorDataUpdate =
        committedDataRef.current.navigatorChartData === navigatorChartData;
    const [selectedSeries, setSelectedSeries] =
        useState<ChartSeriesVisibilityMap>({});
    const visibleSeries = useMemo<ChartSeriesVisibilityMap>(() => ({
        ...Object.fromEntries(
            chartData.map((series) => [series.echartsName, true]),
        ),
        ...selectedSeries,
    }), [chartData, selectedSeries]);
    const visibleSeriesRef = useRef(visibleSeries);
    visibleSeriesRef.current = visibleSeries;
    const isNumericXAxis = hasNumericBaseTimeSeries(seriesList);
    const isSelectionMode =
        overlayMode === PanelOverlayMode.DRAG_SELECT ||
        overlayMode === PanelOverlayMode.HIGHLIGHT;
    const isDragZoomEnabled =
        display.useZoom &&
        !isSelectionMode &&
        overlayMode !== PanelOverlayMode.ANNOTATION;
    const chartRuntime = useMemo<PanelChartRuntime>(() => ({
        config: runtimeConfig,
        data: {
            chartData,
            navigatorChartData,
        },
        ranges: rangeState,
        interaction: {
            visibleSeries,
            draftHighlight,
            isWheelZoomEnabled: isDragZoomEnabled,
        },
        rendering: {
            isNumericXAxis,
            animateMainDataUpdate: sAnimateMainDataUpdate,
            animateNavigatorDataUpdate: sAnimateNavigatorDataUpdate,
        },
    }), [
        chartData,
        draftHighlight,
        isNumericXAxis,
        isDragZoomEnabled,
        navigatorChartData,
        rangeState,
        runtimeConfig,
        sAnimateMainDataUpdate,
        sAnimateNavigatorDataUpdate,
        visibleSeries,
    ]);
    const currentFullOption = useMemo(
        () => buildChartOption(chartRuntime),
        [chartRuntime],
    );
    const latestFullOptionRef = useRef(currentFullOption);
    const initialOptionRef = useRef(currentFullOption);
    const lastRenderedChartDataRef = useRef<PanelChartRuntime['data']>();

    latestFullOptionRef.current = currentFullOption;
    const option = initialOptionRef.current;
    const seriesStructureKey = useMemo(
        () => currentFullOption.series.map((series, seriesIndex) => [
            seriesIndex,
            String(series.id ?? ''),
            String(series.name ?? ''),
            String(series.type ?? ''),
        ].join(':')).join('|'),
        [currentFullOption],
    );
    const attachBlankChartClickEvent = useBlankAnnotationClick({
        chartAreaRef,
        isActive: overlayMode === PanelOverlayMode.ANNOTATION,
        isNumericXAxis,
        latestHoverTimestampRef,
        latestChartClickRef,
        onOpenCreateAnnotation: markupHandlers.onOpenCreateAnnotation,
    });
    const chartInstanceRef = useRef<EChartsType | undefined>(undefined);
    const isBrushActive = isSelectionMode || isDragZoomEnabled;
    const syncBrushInteraction = useCallback((instance?: EChartsType): void => {
        const chartInstance = instance ?? chartInstanceRef.current;
        if (!chartInstance) return;

        if (!isBrushActive) {
            chartInstance.dispatchAction({ type: 'brush', areas: [] });
        }

        chartInstance.dispatchAction({
            type: 'takeGlobalCursor',
            key: 'brush',
            brushOption: isBrushActive
                ? {
                      brushType: 'lineX',
                      brushMode: 'single',
                      xAxisIndex: 0,
                  }
                : { brushType: false },
        });
    }, [isBrushActive]);

    useEffect(() => {
        syncBrushInteraction();
    }, [currentFullOption, syncBrushInteraction]);

    const syncMainChartVisibleRange = useCallback((
        chartInstance: EChartsType | undefined = chartInstanceRef.current,
    ): void => {
        const { mainRange: sMainRange, navigatorRange: sNavigatorRange } =
            latestRangeStateRef.current;

        if (!chartInstance) {
            return;
        }

        const sSliderState = getChartDataZoomState(chartInstance)?.find(
            (item) =>
                item.id === PANEL_SLIDER_DATA_ZOOM_ID ||
                item.dataZoomId === PANEL_SLIDER_DATA_ZOOM_ID,
        );
        if (
            sSliderState &&
            isSameDataZoomSelection(
                sSliderState,
                sMainRange,
                sNavigatorRange,
            )
        ) {
            return;
        }

        chartInstance.dispatchAction({
            type: 'dataZoom',
            dataZoomId: PANEL_SLIDER_DATA_ZOOM_ID,
            startValue: sMainRange.start,
            endValue: sMainRange.end,
        });
    }, [chartInstanceRef]);
    const applyFullChartOption = useCallback((
        chartInstance: EChartsType | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance) {
            return;
        }

        const sShouldResetChartData =
            lastRenderedChartDataRef.current !== undefined &&
            (lastRenderedChartDataRef.current.chartData !== chartData ||
                lastRenderedChartDataRef.current.navigatorChartData !==
                    navigatorChartData);

        chartInstance.dispatchAction({ type: 'hideTip' });
        if (sShouldResetChartData) {
            chartInstance.clear();
        }

        setChartOption(
            chartInstance,
            latestFullOptionRef.current,
            sShouldResetChartData
                ? { notMerge: true, lazyUpdate: false }
                : {
                      lazyUpdate: true,
                      replaceMerge: ['series', 'xAxis', 'yAxis', 'dataZoom'],
                  },
        );
        if (sShouldResetChartData) {
            syncBrushInteraction(chartInstance);
        }
        lastRenderedChartDataRef.current = {
            chartData,
            navigatorChartData,
        };
        syncMainChartVisibleRange(chartInstance);
    }, [
        chartData,
        chartInstanceRef,
        navigatorChartData,
        syncBrushInteraction,
        syncMainChartVisibleRange,
    ]);

    const applyRangeChartOption = useCallback((
        chartInstance: EChartsType | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance) {
            return;
        }

        setChartOption(
            chartInstance,
            {
                ...latestFullOptionRef.current,
                series: stripDataFromCachedDataSeries(
                    latestFullOptionRef.current.series,
                ),
            },
            { lazyUpdate: true, replaceMerge: ['series'] },
        );
        syncMainChartVisibleRange(chartInstance);
    }, [chartInstanceRef, syncMainChartVisibleRange]);

    const applyLegendHoverState = useCallback((
        hoveredLegendSeries: string | undefined,
        force = false,
    ): void => {
        const nextHoveredLegendSeries =
            hoveredLegendSeries &&
            chartRuntime.data.chartData.some(
                (series) => series.echartsName === hoveredLegendSeries,
            )
                ? hoveredLegendSeries
                : undefined;

        if (!force && hoveredLegendSeriesRef.current === nextHoveredLegendSeries) {
            return;
        }

        hoveredLegendSeriesRef.current = nextHoveredLegendSeries;

        const chartInstance = chartInstanceRef.current;
        if (!chartInstance) {
            return;
        }

        chartInstance.dispatchAction({ type: 'hideTip' });
        setChartOption(
            chartInstance,
            {
                series: stripDataFromCachedDataSeries(
                    buildChartSeriesOption({
                        ...chartRuntime,
                        interaction: {
                            ...chartRuntime.interaction,
                            visibleSeries: visibleSeriesRef.current,
                            hoveredLegendSeries: nextHoveredLegendSeries,
                        },
                    }),
                ),
            },
            { lazyUpdate: true },
        );
    }, [chartInstanceRef, chartRuntime]);
    usePanelChartWheelZoom({
        chartAreaRef,
        chartInstanceRef,
        isWheelZoomEnabled: isDragZoomEnabled,
        isNumericXAxis,
        mainRange,
        setMainRange: rangeActions.setMainRange,
    });

    useLayoutEffect(() => {
        chartInstanceRef.current?.dispatchAction({ type: 'hideTip' });
    }, [chartInstanceRef, seriesStructureKey]);

    useLayoutEffect(() => {
        committedDataRef.current = { chartData, navigatorChartData };
    }, [chartData, navigatorChartData]);

    useEffect(() => {
        chartApiRef.current = {
            getVisibleSeries: () =>
                chartData.map((series) => ({
                    name: series.name,
                    visible: visibleSeriesRef.current[series.echartsName] !== false,
                })),
            isPointInsideMainGrid: (clientX: number, clientY: number) => {
                const chartInstance = chartInstanceRef.current;
                const chartRect = chartAreaRef.current?.getBoundingClientRect();

                if (!chartInstance || !chartRect) {
                    return false;
                }

                return chartInstance.containPixel(
                    { gridIndex: 0 },
                    [clientX - chartRect.left, clientY - chartRect.top],
                );
            },
        };

        return () => {
            chartApiRef.current = null;
        };
    }, [chartApiRef, chartAreaRef, chartData, chartInstanceRef]);

    useEffect(() => {
        applyFullChartOption();
    }, [
        applyFullChartOption,
        draftHighlight,
        isDragZoomEnabled,
        isNumericXAxis,
        runtimeConfig,
        visibleSeries,
    ]);

    useEffect(() => {
        applyRangeChartOption();
    }, [
        applyRangeChartOption,
        navigatorRange,
        mainRange,
    ]);

    useEffect(() => {
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    }, [seriesStructureKey, applyLegendHoverState]);

    const onEvents = {
        datazoom: (params: EChartDataZoomEventPayload) => {
            const sInstance = chartInstanceRef.current;
            const sDataZoomState = selectDataZoomItem(
                getChartDataZoomState(sInstance),
            );
            const sDataZoomSelection = resolveDataZoomEventItem(
                params,
                sDataZoomState,
            );
            const sRange = extractDataZoomOptionRange(
                sDataZoomSelection,
                navigatorRange,
            );

            if (
                !sRange ||
                isSameDataZoomSelection(
                    sDataZoomSelection,
                    mainRange,
                    navigatorRange,
                )
            ) {
                return;
            }

            rangeActions.setMainRange(sRange);
        },
        brushEnd: (params: EChartBrushPayload) => {
            const sRange = extractBrushRange(params, isNumericXAxis);

            if (!sRange) {
                return;
            }

            // ECharts processes its raw mouseup after brushEnd. Keep the active
            // target's model/view alive until that event dispatch completes.
            requestAnimationFrame(() => {
                chartInstanceRef.current?.dispatchAction({
                    type: 'brush',
                    areas: [],
                });

                if (sRange.end <= sRange.start) {
                    return;
                }

                if (isSelectionMode) {
                    onSelection(sRange);
                    return;
                }

                if (
                    !isDragZoomEnabled ||
                    isSameRange(sRange, mainRange)
                ) {
                    return;
                }

                rangeActions.setMainRange(sRange);
            });
        },
        legendselectchanged: (params: PanelChartLegendChangePayload) => {
            visibleSeriesRef.current = params.selected ?? {};
            setSelectedSeries(visibleSeriesRef.current);
        },
        mouseover: (params: PanelChartClickPayload) => {
            const sMainSeriesName = getMainSeriesName(params);

            if (sMainSeriesName !== undefined) {
                const series = chartData.find((item) => item.echartsName === sMainSeriesName);
                onHoveredMainSeriesChange(series?.name ?? sMainSeriesName);
            }
        },
        mouseout: (params: PanelChartClickPayload) => {
            if (getMainSeriesName(params) !== undefined) {
                onHoveredMainSeriesChange(undefined);
            }
        },
        highlight: (params: PanelChartHighlightPayload) => {
            if (Array.isArray(params?.excludeSeriesId)) {
                applyLegendHoverState(
                    params.seriesName ?? params.name ?? undefined,
                );
            }
        },
        downplay: (params: PanelChartHighlightPayload) => {
            if (Array.isArray(params?.excludeSeriesId)) {
                applyLegendHoverState(undefined);
            }
        },
        updateAxisPointer: (params: PanelChartAxisPointerPayload) => {
            const xAxisInfo = params.axesInfo?.find(
                (axisInfo) => axisInfo.axisDim === 'x' && axisInfo.axisIndex === 0,
            );
            latestHoverTimestampRef.current = parsePanelChartTimestamp(
                xAxisInfo?.value,
                isNumericXAxis,
            );
        },
        globalout: () => {
            latestHoverTimestampRef.current = undefined;
            onHoveredMainSeriesChange(undefined);
        },
        click: (params: PanelChartClickPayload) => {
            const sChartInstance = chartInstanceRef.current;
            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const { pixel: sPixel, position: sPosition } =
                getPanelChartEventCoordinates(params, sChartRect);

            if (!sPosition) {
                return;
            }

            const sClickedSeriesIndex = getMainSeriesIndex(params.seriesId);
            const sIsAnnotationLabelClick = isAnnotationLabelSeries(
                params.seriesId,
            );
            const sAnnotationIndex = parseNonNegativeInteger(
                asRecord(params.data)?.annotationIndex,
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
                    !sPixel ||
                    !sChartInstance?.containPixel({ gridIndex: 0 }, sPixel)
                ) {
                    return;
                }

                const sTimestamp = getChartClickTimestamp(
                    params,
                    sPixel,
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

            const sIsHighlightLabelClick = isHighlightLabelSeries(
                params.seriesId,
            );
            const sHighlightIndex = parseNonNegativeInteger(
                asRecord(params.data)?.highlightIndex,
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
        finished: () => applyPanelNavigatorCursorStyles(chartInstanceRef.current),
    };
    const handleChartReady = (chartInstance: EChartsType) => {
        chartInstanceRef.current = chartInstance;
        attachBlankChartClickEvent(chartInstance);
        syncBrushInteraction(chartInstance);
        applyFullChartOption(chartInstance);
        applyPanelNavigatorCursorStyles(chartInstance);
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    };

    return { option, onEvents, onChartReady: handleChartReady };
}

// -------------------- Local --------------------

// Event routing and gesture decoding stay private to the interaction lifecycle.

function getMainSeriesName(payload: PanelChartClickPayload): string | undefined {
    if (getMainSeriesIndex(payload.seriesId) === undefined) {
        return undefined;
    }

    const sSeriesName = payload.seriesName?.trim();

    return sSeriesName ? sSeriesName : undefined;
}

function parseNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
}

function getMainSeriesIndex(
    seriesId: string | undefined,
): number | undefined {
    if (!seriesId?.startsWith(MAIN_PANEL_SERIES_ID_PREFIX)) {
        return undefined;
    }

    return parseNonNegativeInteger(
        /^(\d+)/.exec(seriesId.slice(MAIN_PANEL_SERIES_ID_PREFIX.length))?.[1],
    );
}

function getChartClickTimestamp(
    payload: PanelChartClickPayload,
    pixel: [number, number],
    chartInstance: EChartsType,
    latestHoverTimestamp: number | undefined,
    isNumericXAxis: boolean,
): number | undefined {
    const sDirectTimestamp =
        parsePanelChartTimestamp(payload.value, isNumericXAxis) ??
        parsePanelChartTimestamp(payload.data, isNumericXAxis) ??
        parsePanelChartTimestamp(
            asRecord(payload.data)?.value,
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(payload.axisValue, isNumericXAxis) ??
        latestHoverTimestamp;

    if (sDirectTimestamp !== undefined) {
        return sDirectTimestamp;
    }

    return convertPanelChartPixelToTimestamp(
        chartInstance,
        pixel,
        isNumericXAxis,
    );
}

type PanelChartClientPosition = {
    x: number;
    y: number;
};

function parsePanelChartTimestamp(
    value: unknown,
    isNumericXAxis = false,
): number | undefined {
    if (Array.isArray(value)) {
        return parsePanelChartTimestamp(value[0], isNumericXAxis);
    }

    const timestamp =
        value instanceof Date
            ? value.getTime()
            : typeof value === 'number' || typeof value === 'string'
              ? Number(value)
              : Number.NaN;

    return Number.isFinite(timestamp)
        ? isNumericXAxis
            ? timestamp
            : Math.floor(timestamp)
        : undefined;
}

function getPanelChartEventCoordinates(
    payload: unknown,
    chartRect: DOMRect | undefined,
): {
    pixel: [number, number] | undefined;
    position: PanelChartClientPosition | undefined;
} {
    const sEvent = asRecord(payload)?.event;
    const sNestedEvent = asRecord(sEvent)?.event;
    const sClientX =
        getFiniteRecordValue(sEvent, 'clientX') ??
        getFiniteRecordValue(sNestedEvent, 'clientX');
    const sClientY =
        getFiniteRecordValue(sEvent, 'clientY') ??
        getFiniteRecordValue(sNestedEvent, 'clientY');
    const sClientPosition =
        sClientX !== undefined && sClientY !== undefined
        ? { x: sClientX, y: sClientY }
        : undefined;
    const sOffsetX =
        getFiniteRecordValue(payload, 'offsetX', 'zrX') ??
        getFiniteRecordValue(sEvent, 'offsetX', 'zrX') ??
        getFiniteRecordValue(sNestedEvent, 'offsetX');
    const sOffsetY =
        getFiniteRecordValue(payload, 'offsetY', 'zrY') ??
        getFiniteRecordValue(sEvent, 'offsetY', 'zrY') ??
        getFiniteRecordValue(sNestedEvent, 'offsetY');
    const sPixel: [number, number] | undefined =
        sOffsetX !== undefined && sOffsetY !== undefined
            ? [sOffsetX, sOffsetY]
            : sClientPosition && chartRect
              ? [
                    sClientPosition.x - chartRect.left,
                    sClientPosition.y - chartRect.top,
                ]
              : undefined;

    return {
        pixel: sPixel,
        position:
            sClientPosition ??
            (sPixel && chartRect
                ? {
                      x: chartRect.left + sPixel[0],
                      y: chartRect.top + sPixel[1],
                  }
                : undefined),
    };
}

function convertPanelChartPixelToTimestamp(
    instance: EChartsType,
    pixel: [number, number],
    isNumericXAxis = false,
): number | undefined {
    return (
        parsePanelChartTimestamp(
            instance.convertFromPixel({ xAxisIndex: 0 }, pixel),
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(
            instance.convertFromPixel({ gridIndex: 0 }, pixel),
            isNumericXAxis,
        )
    );
}

function resolveDataZoomEventItem(
    params: EChartDataZoomEventPayload,
    fallbackState?: EChartDataZoomItem,
): EChartDataZoomItem {
    const sZoomData =
        'batch' in params
            ? selectDataZoomItem(params.batch)
            : params;

    if (
        sZoomData &&
        ((sZoomData.startValue !== undefined &&
            sZoomData.endValue !== undefined) ||
            (sZoomData.start !== undefined && sZoomData.end !== undefined))
    ) {
        return sZoomData;
    }

    return { ...fallbackState, ...sZoomData };
}

function extractDataZoomOptionRange(
    params: EChartDataZoomItem,
    axisRange: AxisRange,
): AxisRange | undefined {
    const sAxisSpan = getRangeWidth(axisRange);
    if (
        typeof params.start === 'number' &&
        typeof params.end === 'number' &&
        sAxisSpan > 0
    ) {
        const sFirst =
            axisRange.start + (sAxisSpan * params.start) / 100;
        const sSecond =
            axisRange.start + (sAxisSpan * params.end) / 100;
        return createNonEmptyAxisRange(sFirst, sSecond);
    }

    const { startValue, endValue } = params;
    if (startValue === undefined || endValue === undefined) {
        return undefined;
    }
    return createNonEmptyAxisRange(Number(startValue), Number(endValue));
}

function isSameDataZoomSelection(
    selection: EChartDataZoomItem,
    expectedRange: AxisRange,
    axisRange: AxisRange,
): boolean {
    const sAxisSpan = getRangeWidth(axisRange);
    const sFirstRatio = typeof selection.start === 'number'
        ? selection.start / 100
        : selection.startValue === undefined
          ? undefined
          : (Number(selection.startValue) - axisRange.start) / sAxisSpan;
    const sSecondRatio = typeof selection.end === 'number'
        ? selection.end / 100
        : selection.endValue === undefined
          ? undefined
          : (Number(selection.endValue) - axisRange.start) / sAxisSpan;
    const sExpectedStartRatio =
        (expectedRange.start - axisRange.start) / sAxisSpan;
    const sExpectedEndRatio =
        (expectedRange.end - axisRange.start) / sAxisSpan;
    const sExpectedWidthRatio =
        sExpectedEndRatio - sExpectedStartRatio;

    return (
        sFirstRatio !== undefined &&
        sSecondRatio !== undefined &&
        Math.abs(Math.min(sFirstRatio, sSecondRatio) - sExpectedStartRatio) /
            sExpectedWidthRatio <=
            DATA_ZOOM_RELATIVE_ERROR_RATIO &&
        Math.abs(Math.max(sFirstRatio, sSecondRatio) - sExpectedEndRatio) /
            sExpectedWidthRatio <=
            DATA_ZOOM_RELATIVE_ERROR_RATIO
    );
}

function extractBrushRange(
    params: EChartBrushPayload,
    isNumericXAxis = false,
): AxisRange | undefined {
    const sArea = params?.areas?.[0] ?? params?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    const sStart = Number(sRange[0]);
    const sEnd = Number(sRange[1]);
    const sMin = Math.min(sStart, sEnd);
    const sMax = Math.max(sStart, sEnd);

    return createNonEmptyAxisRange(
        isNumericXAxis ? sMin : Math.floor(sMin),
        isNumericXAxis ? sMax : Math.ceil(sMax),
    );
}

function selectDataZoomItem(
    zoomData: EChartDataZoomItem[] | undefined,
): EChartDataZoomItem | undefined {
    return zoomData?.find(
        (item) =>
            item.id === PANEL_SLIDER_DATA_ZOOM_ID ||
            item.dataZoomId === PANEL_SLIDER_DATA_ZOOM_ID,
    ) ?? zoomData?.[0];
}

function getFiniteRecordValue(
    source: unknown,
    ...keys: string[]
): number | undefined {
    const record = asRecord(source);

    for (const key of keys) {
        const value = record?.[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
}

const DATA_ZOOM_RELATIVE_ERROR_RATIO = 1e-9;

function useBlankAnnotationClick({
    chartAreaRef,
    isActive,
    isNumericXAxis,
    latestHoverTimestampRef,
    latestChartClickRef,
    onOpenCreateAnnotation,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isActive: boolean;
    isNumericXAxis: boolean;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    latestChartClickRef: MutableRefObject<number>;
    onOpenCreateAnnotation: PanelChartHandlers['markupHandlers']['onOpenCreateAnnotation'];
}): (instance: EChartsType) => void {
    const sListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const openCreateAnnotation = useStableCallback(onOpenCreateAnnotation);
    const handleBlankChartClick = useStableCallback((instance: EChartsType, event: ElementEvent): void => {
        if (!isActive) {
            return;
        }

        const sChartRect = chartAreaRef.current?.getBoundingClientRect();
        const { pixel: sPixel, position: sPosition } =
            getPanelChartEventCoordinates(event, sChartRect);
        const sChartClickSequence = latestChartClickRef.current;

        if (!sPixel || !sPosition) {
            return;
        }

        window.setTimeout(() => {
            if (latestChartClickRef.current !== sChartClickSequence) {
                return;
            }

            if (!instance.containPixel({ gridIndex: 0 }, sPixel)) {
                return;
            }

            const sTimestamp =
                latestHoverTimestampRef.current ??
                convertPanelChartPixelToTimestamp(
                    instance,
                    sPixel,
                    isNumericXAxis,
                );

            if (sTimestamp === undefined) {
                return;
            }

            openCreateAnnotation(
                sPosition,
                undefined,
                sTimestamp,
            );
        }, 0);
    });

    const attachBlankChartClickEvent = useCallback((instance: EChartsType): void => {
        sListenerCleanupRef.current?.();
        const zr = instance.getZr();
        const onClick = (event: ElementEvent) => handleBlankChartClick(instance, event);
        zr?.on('click', onClick);
        sListenerCleanupRef.current = () => zr?.off('click', onClick);
    }, [handleBlankChartClick]);

    useEffect(() => () => sListenerCleanupRef.current?.(), []);

    return attachBlankChartClickEvent;
}

function usePanelChartWheelZoom({
    chartAreaRef,
    chartInstanceRef,
    isWheelZoomEnabled,
    isNumericXAxis,
    mainRange,
    setMainRange,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartInstanceRef: MutableRefObject<EChartsType | undefined>;
    isWheelZoomEnabled: boolean;
    isNumericXAxis: boolean;
    mainRange: AxisRange;
    setMainRange: PanelChartHandlers['rangeActions']['setMainRange'];
}): void {
    useEffect(() => {
        const chartArea = chartAreaRef.current;
        if (!chartArea) {
            return;
        }

        const handleMouseWheelZoom = (event: WheelEvent): void => {
            if (event.deltaY === 0 || !isWheelZoomEnabled) {
                return;
            }

            const chartInstance = chartInstanceRef.current;
            const chartRect = chartAreaRef.current?.getBoundingClientRect();
            if (!chartInstance || !chartRect) {
                return;
            }

            const sPixel: [number, number] = [
                event.clientX - chartRect.left,
                event.clientY - chartRect.top,
            ];
            if (!chartInstance.containPixel({ gridIndex: 0 }, sPixel)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const sCurrentWidth = getRangeWidth(mainRange);
            const sAnchorTime =
                convertPanelChartPixelToTimestamp(
                    chartInstance,
                    sPixel,
                    isNumericXAxis,
                ) ??
                mainRange.start + sCurrentWidth / 2;
            const sAnchorRatio =
                (sAnchorTime - mainRange.start) / sCurrentWidth;
            const sZoomFactor = event.deltaY < 0
                ? PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR
                : PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR;
            const sNextWidth = sCurrentWidth * sZoomFactor;
            const sNextStart = sAnchorTime - sNextWidth * sAnchorRatio;

            setMainRange(
                {
                    start: sNextStart,
                    end: sNextStart + sNextWidth,
                },
            );
        };

        chartArea.addEventListener('wheel', handleMouseWheelZoom, {
            passive: false,
        });

        return () => {
            chartArea.removeEventListener('wheel', handleMouseWheelZoom);
        };
    }, [
        setMainRange,
        chartAreaRef,
        chartInstanceRef,
        isWheelZoomEnabled,
        isNumericXAxis,
        mainRange,
    ]);
}

const PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR = 0.82;

const PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR = 1.22;

function stripDataFromCachedDataSeries(
    seriesOptionPatch: ReturnType<typeof buildChartSeriesOption>,
): ReturnType<typeof buildChartSeriesOption> {
    return seriesOptionPatch.map((seriesOption) => {
        const sSeriesId = String(seriesOption.id ?? '');

        if (
            !sSeriesId.startsWith(MAIN_PANEL_SERIES_ID_PREFIX) &&
            !sSeriesId.startsWith(PANEL_NAVIGATOR_SERIES_ID_PREFIX)
        ) {
            return seriesOption;
        }
        const seriesOptionWithoutData = { ...seriesOption };
        delete seriesOptionWithoutData.data;

        return seriesOptionWithoutData;
    });
}

// ECharts compatibility and navigator cursor handling.

type EChartDataZoomItem = Partial<{
    id: string;
    dataZoomId: string;
    start: number;
    end: number;
    startValue: number | string | Date;
    endValue: number | string | Date;
}>;

type EChartDataZoomEventPayload =
    | EChartDataZoomItem
    | { batch: EChartDataZoomItem[] };

type EChartBrushPayload = EChartBrushSelection & {
    batch?: EChartBrushSelection[];
};

type PanelChartLegendChangePayload = {
    selected: ChartSeriesVisibilityMap | undefined;
};

type PanelChartAxisPointerPayload = Partial<{
    axesInfo: Array<
        Partial<{
            axisDim: string;
            axisIndex: number;
            value: unknown;
        }>
    >;
}>;

type PanelChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

type PanelChartClickPayload = Partial<ECElementEvent> & {
    axisValue?: number | string;
};

function setChartOption(
    instance: EChartsType,
    option: EChartsOption,
    options?: SetOptionOpts,
): void {
    // Legacy @types/echarts overrides setOption's overloads. Use the bundled
    // ECharts signature here without changing the instance's other methods.
    (instance.setOption as NativeEChartsType['setOption'])(option, options);
}

function getChartDataZoomState(
    instance: EChartsType | undefined,
): EChartDataZoomItem[] | undefined {
    // ECharts normalizes component options to arrays, but getOption leaves
    // component values untyped. Keep that narrowing at the library boundary.
    return instance?.getOption()?.dataZoom as EChartDataZoomItem[] | undefined;
}

function applyPanelNavigatorCursorStyles(
    instance: EChartsType | undefined,
): void {
    const sDisplayList: NavigatorElement[] | undefined =
        instance?.getZr()?.storage?.getDisplayList();

    if (!sDisplayList) {
        return;
    }

    for (const element of sDisplayList) {
        if (!element.draggable || element.cursor !== NAVIGATOR_EDGE_CURSOR) {
            continue;
        }

        if (element.type !== 'rect' && element.type !== 'path') {
            continue;
        }

        const cursor = element.type === 'rect' ? NAVIGATOR_BODY_CURSOR : NAVIGATOR_EDGE_CURSOR;
        const activeCursor = element.type === 'rect' ? NAVIGATOR_BODY_ACTIVE_CURSOR : cursor;
        if (element.__tagAnalyzerNavigatorCursor !== cursor) {
            element.__tagAnalyzerNavigatorCursor = cursor;
            element.on('mousedown', () => setCursor(element, activeCursor));
            for (const event of ['mouseup', 'mouseout', 'dragend']) {
                element.on(event, () => setCursor(element, cursor));
            }
        }
        setCursor(element, cursor);
    }
}

type EChartBrushSelection = {
    areas?: Array<{
        coordRange?: [number, number];
        range?: [number, number];
    }>;
};

const NAVIGATOR_BODY_CURSOR = 'grab';

const NAVIGATOR_BODY_ACTIVE_CURSOR = 'grabbing';

const NAVIGATOR_EDGE_CURSOR = 'ew-resize';

type NavigatorElement = ReturnType<
    ReturnType<EChartsType['getZr']>['storage']['getDisplayList']
>[number] & { __tagAnalyzerNavigatorCursor?: string };

function setCursor(element: NavigatorElement, cursor: string): void {
    element.attr({ cursor });
    element.cursor = cursor;
}
