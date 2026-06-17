import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type MouseEvent } from 'react';
import type { EChartsReactProps } from 'echarts-for-react';
import type { ChartSeriesData } from '../../domain/ChartDomain';
import { PanelOverlayMode, type PanelRangeActions, type PanelRangeChangeEvent, type PanelChartHandle, type PanelChartState, type PanelMarkupHandlers, type PanelRangeState } from '../../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import { buildChartEvent } from './events/buildPanelChartEvent';
import type { ChartInfo } from './types/PanelChartTypes';
import { buildChartOption } from './options/buildPanelChartOption';
import { buildChartSeriesOption } from './options/buildPanelChartSeriesOption';
import { applyPanelNavigatorCursorStyles } from './utils/PanelNavigatorCursorStyles';
import type { PanelChartInstance } from './types/PanelChartRuntimeTypes';
import { useBlankChartClickEvent } from './hooks/useBlankChartClickEvent';
import { usePanelChartInstanceSync } from './hooks/usePanelChartInstanceSync';
import {
    getTimeRangeWidth,
    isValidTimeRange,
} from '../../domain/time/range/TimeRangeUtils';
import { convertPanelChartPixelToTimestamp } from './utils/PanelChartPointerUtils';

type PanelBodyRefs = {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartApiRef: MutableRefObject<PanelChartHandle | null>;
};

type PanelBodyData = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
};

type PanelBodyHandlers = {
    rangeActions: PanelRangeActions;
    markupHandlers: PanelMarkupHandlers;
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
};

export type UsePanelChartRuntimeParams = {
    refs: PanelBodyRefs;
    chartState: PanelChartState;
    isRaw: boolean;
    overlayMode: PanelOverlayMode;
    data: PanelBodyData;
    rangeState: PanelRangeState;
    isLoading: boolean;
    handlers: PanelBodyHandlers;
};

type UsePanelChartRuntimeResult = {
    option: ReturnType<typeof buildChartOption>;
    onEvents: EChartsReactProps['onEvents'];
    handleChartReady: EChartsReactProps['onChartReady'];
    chartMouseHandlers: {
        onMouseDownCapture: (event: MouseEvent<HTMLDivElement>) => void;
    };
};

const PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR = 0.82;
const PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR = 1.22;

export function usePanelChartRuntime({
    refs,
    chartState,
    isRaw,
    overlayMode,
    data,
    rangeState,
    handlers,
}: UsePanelChartRuntimeParams): UsePanelChartRuntimeResult {
    const { chartAreaRef, chartApiRef } = refs;
    const { chartData, navigatorChartData } = data;
    const { panelRange, navigatorRange } = rangeState;
    const {
        rangeActions,
        markupHandlers,
        onHoveredMainSeriesChange,
        onSelection,
    } = handlers;
    const { axes, display, seriesList, useNormalize, highlights, annotations } =
        chartState;
    const latestHoverTimestampRef = useRef<number | undefined>();
    const latestChartClickRef = useRef(0);
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    const visibleSeriesRef = useRef<Record<string, boolean>>({});
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const isNumericXAxis = hasNumericBaseTimeSeries(seriesList);
    const isSelectionMode =
        overlayMode === PanelOverlayMode.DRAG_SELECT ||
        overlayMode === PanelOverlayMode.HIGHLIGHT;
    const isDragZoomEnabled =
        display.use_zoom &&
        !isSelectionMode &&
        overlayMode !== PanelOverlayMode.ANNOTATION;
    const baseChartInfo = useMemo<ChartInfo>(() => ({
        mainSeriesData: chartData,
        seriesDefinitions: seriesList,
        panelRange,
        navigatorRange,
        axes,
        display,
        isRaw,
        useNormalize,
        visibleSeries: {},
        navigatorSeriesData: navigatorChartData,
        isNumericXAxis,
        isWheelZoomEnabled: isDragZoomEnabled,
        highlights,
        annotations,
    }), [
        annotations,
        axes,
        chartData,
        display,
        highlights,
        isNumericXAxis,
        isDragZoomEnabled,
        isRaw,
        navigatorChartData,
        navigatorRange,
        panelRange,
        seriesList,
        useNormalize,
    ]);
    const chartInfo = useMemo(
        () => ({ ...baseChartInfo, visibleSeries }),
        [baseChartInfo, visibleSeries],
    );
    const option = useMemo(() => buildChartOption(chartInfo), [chartInfo]);
    const attachBlankChartClickEvent = useBlankChartClickEvent({
        chartAreaRef,
        isAnnotationActive: overlayMode === PanelOverlayMode.ANNOTATION,
        isNumericXAxis,
        latestHoverTimestampRef,
        latestChartClickRef,
        onOpenCreateAnnotation: markupHandlers.onOpenCreateAnnotation,
    });
    const {
        chartInstanceRef,
        handleChartReady: syncChartReady,
    } = usePanelChartInstanceSync({
        isBrushActive: isSelectionMode || isDragZoomEnabled,
        optionRevision: option,
        onChartReady: attachBlankChartClickEvent,
    });
    const syncMainChartVisibleRange = useCallback((
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance || !isValidTimeRange(panelRange)) {
            return;
        }

        chartInstance.dispatchAction({
            type: 'dataZoom',
            startValue: panelRange.startTime,
            endValue: panelRange.endTime,
        });
    }, [
        chartInstanceRef,
        panelRange,
    ]);
    const applyLegendHoverState = useCallback((
        hoveredLegendSeries: string | undefined,
        force = false,
    ): void => {
        const nextHoveredLegendSeries =
            hoveredLegendSeries &&
            baseChartInfo.mainSeriesData.some(
                (series) => series.name === hoveredLegendSeries,
            )
                ? hoveredLegendSeries
                : undefined;

        if (!force && hoveredLegendSeriesRef.current === nextHoveredLegendSeries) {
            return;
        }

        hoveredLegendSeriesRef.current = nextHoveredLegendSeries;
        chartInstanceRef.current?.setOption?.(
            buildChartSeriesOption({
                ...baseChartInfo,
                visibleSeries: visibleSeriesRef.current,
                hoveredLegendSeries: nextHoveredLegendSeries,
            }),
            { lazyUpdate: true },
        );
    }, [baseChartInfo, chartInstanceRef]);
    const handleMouseWheelZoom = useCallback((event: WheelEvent): void => {
        if (
            event.deltaY === 0 ||
            !isDragZoomEnabled ||
            !isValidTimeRange(panelRange)
        ) {
            return;
        }

        const chartInstance = chartInstanceRef.current;
        const chartRect = chartAreaRef.current?.getBoundingClientRect();
        if (!chartInstance?.containPixel || !chartRect) {
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

        const sCurrentWidth = getTimeRangeWidth(panelRange);
        if (sCurrentWidth <= 0) {
            return;
        }

        const sAnchorTime =
            convertPanelChartPixelToTimestamp(
                chartInstance,
                sPixel,
                isNumericXAxis,
            ).timestamp ??
            panelRange.startTime + sCurrentWidth / 2;
        const sAnchorRatio =
            (sAnchorTime - panelRange.startTime) / sCurrentWidth;
        const sZoomFactor = event.deltaY < 0
            ? PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR
            : PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR;
        const sNextWidth = sCurrentWidth * sZoomFactor;
        const sNextStart = sAnchorTime - sNextWidth * sAnchorRatio;

        rangeActions.applyMainZoomRange({
            min: sNextStart,
            max: sNextStart + sNextWidth,
        });
    }, [
        chartAreaRef,
        chartInstanceRef,
        isDragZoomEnabled,
        isNumericXAxis,
        panelRange,
        rangeActions,
    ]);

    useEffect(() => {
        const chartArea = chartAreaRef.current;
        if (!chartArea) {
            return;
        }

        chartArea.addEventListener('wheel', handleMouseWheelZoom, {
            passive: false,
        });

        return () => {
            chartArea.removeEventListener('wheel', handleMouseWheelZoom);
        };
    }, [chartAreaRef, handleMouseWheelZoom]);

    useEffect(() => {
        const nextVisibleSeries = {
            ...Object.fromEntries(chartData.map((series) => [series.name, true])),
            ...visibleSeriesRef.current,
        };

        visibleSeriesRef.current = nextVisibleSeries;
        setVisibleSeries(nextVisibleSeries);
    }, [chartData]);

    useEffect(() => {
        chartApiRef.current = {
            getVisibleSeries: () =>
                chartData.map((series) => ({
                    name: series.name,
                    visible: visibleSeriesRef.current[series.name] !== false,
                })),
            isPointInsideMainGrid: (clientX: number, clientY: number) => {
                const chartInstance = chartInstanceRef.current;
                const chartRect = chartAreaRef.current?.getBoundingClientRect();

                if (!chartInstance?.containPixel || !chartRect) {
                    return false;
                }

                return chartInstance.containPixel(
                    { gridIndex: 0 },
                    [clientX - chartRect.left, clientY - chartRect.top],
                );
            },
        };
    }, [chartApiRef, chartAreaRef, chartData, chartInstanceRef]);

    useEffect(() => {
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    }, [option, applyLegendHoverState]);

    useEffect(() => {
        syncMainChartVisibleRange();
    }, [option, syncMainChartVisibleRange]);

    return {
        option,
        onEvents: {
            ...buildChartEvent({
                ranges: rangeState,
                interactionMode: {
                    overlayMode,
                    isSelectionMode,
                    isDragZoomEnabled,
                    isNumericXAxis,
                },
                chartRefs: {
                    chartAreaRef,
                    chartInstanceRef,
                    latestHoverTimestampRef,
                    latestChartClickRef,
                },
                rangeActions,
                markupHandlers,
                onHoveredMainSeriesChange,
                onSelection,
                legendState: {
                    applyLegendHoverState,
                    setVisibleSeries,
                    visibleSeriesRef,
                },
            }),
            finished: () => applyPanelNavigatorCursorStyles(chartInstanceRef.current),
        },
        handleChartReady: (instance: unknown) => {
            const chartInstance = instance as PanelChartInstance;
            syncChartReady(chartInstance);
            syncMainChartVisibleRange(chartInstance);
            applyPanelNavigatorCursorStyles(chartInstance);
            if (hoveredLegendSeriesRef.current) {
                applyLegendHoverState(hoveredLegendSeriesRef.current, true);
            }
        },
        chartMouseHandlers: {
            onMouseDownCapture: (event: MouseEvent<HTMLDivElement>) => {
                if (event.button === 2) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            },
        },
    };
}
