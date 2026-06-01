import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type MouseEvent } from 'react';
import type { EChartsReactProps } from 'echarts-for-react';
import type { ChartSeriesData } from '../../domain/ChartDomain';
import { PanelOverlayMode, type PanelBrushSelectionEvent, type PanelChartHandle, type PanelChartState, type PanelMarkupHandlers, type PanelRangeHandlers, type PanelRangeState } from '../../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import { getNavigatorHandleMinimumRangeWidth } from '../../board/PanelNavigatorRangeLimits';
import { buildChartEvent } from './events/buildPanelChartEvent';
import type { ChartInfo } from './types/PanelChartTypes';
import { buildChartOption } from './options/buildPanelChartOption';
import { buildChartSeriesOption } from './options/buildPanelChartSeriesOption';
import { applyPanelNavigatorCursorStyles } from './utils/PanelNavigatorCursorStyles';
import type { PanelChartInstance } from './types/PanelChartRuntimeTypes';
import { useBlankChartClickEvent } from './hooks/useBlankChartClickEvent';
import { usePanelChartInstanceSync } from './hooks/usePanelChartInstanceSync';
import { isConcreteTimeRange } from '../../domain/time/TimeRangeUtils';

type PanelBodyRefs = {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartApiRef: MutableRefObject<PanelChartHandle | null>;
};

type PanelBodyData = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
};

type PanelBodyHandlers = {
    rangeHandlers: PanelRangeHandlers;
    markupHandlers: PanelMarkupHandlers;
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
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
    const { panelRange, navigatorRange, fullRange } = rangeState;
    const {
        rangeHandlers,
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
    const chartAreaWidth = chartAreaRef.current?.clientWidth;
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
        navigatorSelectionMinValueSpan: getNavigatorHandleMinimumRangeWidth({
            navigatorRange,
            chartAreaWidth,
            isNumericXAxis,
        }),
        isNumericXAxis,
        highlights,
        annotations,
    }), [
        annotations,
        axes,
        chartAreaWidth,
        chartData,
        display,
        highlights,
        isNumericXAxis,
        isRaw,
        navigatorChartData,
        navigatorRange,
        panelRange,
        seriesList,
        useNormalize,
    ]);
    const isSelectionMode =
        overlayMode === PanelOverlayMode.DRAG_SELECT ||
        overlayMode === PanelOverlayMode.HIGHLIGHT;
    const isDragZoomEnabled =
        baseChartInfo.display.use_zoom &&
        !isSelectionMode &&
        overlayMode !== PanelOverlayMode.ANNOTATION;
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
        if (!chartInstance || !isConcreteTimeRange(panelRange)) {
            return;
        }

        chartInstance.dispatchAction({
            type: 'dataZoom',
            startValue: panelRange.startTime,
            endValue: panelRange.endTime,
        });

        const sChartOption = chartInstance.getOption?.() as
            | {
                  dataZoom?: Array<{
                      start?: number;
                      end?: number;
                      startValue?: number;
                      endValue?: number;
                  }>;
                  xAxis?: Array<{
                      id?: string;
                      min?: number;
                      max?: number;
                  }>;
              }
            | undefined;
        const sDataZoom = sChartOption?.dataZoom?.[0];
        const sXAxis = sChartOption?.xAxis ?? [];

        console.log('[TA nav debug]', {
            selectedRangeForNavigator: {
                startTime: sDataZoom?.startValue ?? panelRange.startTime,
                endTime: sDataZoom?.endValue ?? panelRange.endTime,
                percentStart: sDataZoom?.start,
                percentEnd: sDataZoom?.end,
            },
            mainChartRange: panelRange,
            navigatorRange,
            fullNavigatorRange: fullRange,
            echartXAxisRanges: {
                main: sXAxis[0]
                    ? {
                          id: sXAxis[0].id,
                          min: sXAxis[0].min,
                          max: sXAxis[0].max,
                      }
                    : undefined,
                navigatorSlider: sXAxis[1]
                    ? {
                          id: sXAxis[1].id,
                          min: sXAxis[1].min,
                          max: sXAxis[1].max,
                      }
                    : undefined,
                navigatorData: sXAxis[2]
                    ? {
                          id: sXAxis[2].id,
                          min: sXAxis[2].min,
                          max: sXAxis[2].max,
                      }
                    : undefined,
            },
        });
    }, [
        chartInstanceRef,
        fullRange,
        navigatorRange,
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
                rangeHandlers,
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
