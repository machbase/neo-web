import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type MouseEvent } from 'react';
import type { EChartsReactProps } from 'echarts-for-react';
import type { ChartSeriesData } from '../domain/ChartDomain';
import type { PanelBrushSelectionEvent, PanelChartHandle, PanelChartState, PanelMarkupHandlers, PanelOverlayMode, PanelRangeHandlers, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import { getNavigatorHandleMinimumRangeWidth } from '../board/PanelNavigatorRangeLimits';
import { buildChartEvent } from './chartBuilder/buildEventCallback/buildChartEvent';
import type { ChartInfo } from './chartBuilder/ChartTypes';
import { buildChartOption, buildChartSeriesOption } from './chartBuilder/OptionBuildHelpers/ChartOptionBuilder';
import { applyPanelNavigatorCursorStyles } from './chartBuilder/PanelNavigatorCursorStyles';
import type { PanelChartInstance } from './chartBuilder/PanelChartRuntimeTypes';
import { useBlankChartClickEvent } from './chartBuilder/useBlankChartClickEvent';
import { usePanelChartInstanceSync } from './chartBuilder/usePanelChartInstanceSync';

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
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
};

export type PanelChartInteractionHintMode = Extract<PanelOverlayMode, 'annotation' | 'highlight'>;

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

export type UsePanelChartRuntimeResult = {
    hintMode: PanelChartInteractionHintMode | undefined;
    cursorHintPosition: { x: number; y: number } | undefined;
    option: ReturnType<typeof buildChartOption>;
    onEvents: EChartsReactProps['onEvents'];
    handleChartReady: EChartsReactProps['onChartReady'];
    chartMouseHandlers: {
        onMouseDownCapture: (event: MouseEvent<HTMLDivElement>) => void;
        onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
        onMouseLeave: () => void;
    };
};

function useDisplayedNavigatorChartData(
    isLoading: boolean,
    navigatorChartData: ChartSeriesData[],
): ChartSeriesData[] {
    const readyNavigatorChartDataRef = useRef<ChartSeriesData[]>([]);

    if (!isLoading) {
        readyNavigatorChartDataRef.current = navigatorChartData;
    }

    return isLoading && readyNavigatorChartDataRef.current.length > 0
        ? readyNavigatorChartDataRef.current
        : navigatorChartData;
}

export function usePanelChartRuntime({
    refs,
    chartState,
    isRaw,
    overlayMode,
    data,
    rangeState,
    isLoading,
    handlers,
}: UsePanelChartRuntimeParams): UsePanelChartRuntimeResult {
    const { chartAreaRef, chartApiRef } = refs;
    const { chartData, navigatorChartData } = data;
    const { panelRange, navigatorRange } = rangeState;
    const { rangeHandlers, markupHandlers, onSelection } = handlers;
    const { axes, display, seriesList, useNormalize, highlights, annotations } =
        chartState;
    const latestHoverTimestampRef = useRef<number | undefined>();
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    const visibleSeriesRef = useRef<Record<string, boolean>>({});
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >();
    const isNumericXAxis = hasNumericBaseTimeSeries(seriesList);
    const displayedNavigatorChartData = useDisplayedNavigatorChartData(
        isLoading,
        navigatorChartData,
    );
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
        navigatorSeriesData: displayedNavigatorChartData,
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
        displayedNavigatorChartData,
        highlights,
        isNumericXAxis,
        isRaw,
        navigatorRange,
        panelRange,
        seriesList,
        useNormalize,
    ]);
    const hintMode =
        overlayMode === 'annotation' || overlayMode === 'highlight'
            ? overlayMode
            : undefined;
    const isSelectionMode =
        overlayMode === 'dragSelect' || overlayMode === 'highlight';
    const isDragZoomEnabled =
        baseChartInfo.display.use_zoom && !isSelectionMode && overlayMode !== 'annotation';
    const chartInfo = useMemo(
        () => ({ ...baseChartInfo, visibleSeries }),
        [baseChartInfo, visibleSeries],
    );
    const option = useMemo(() => buildChartOption(chartInfo), [chartInfo]);
    const attachBlankChartClickEvent = useBlankChartClickEvent({
        chartAreaRef,
        isAnnotationActive: overlayMode === 'annotation',
        isNumericXAxis,
        latestHoverTimestampRef,
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
        };
    }, [chartApiRef, chartData]);

    useEffect(() => {
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    }, [option, applyLegendHoverState]);

    useEffect(() => {
        if (!hintMode) {
            setCursorHintPosition(undefined);
        }
    }, [hintMode]);

    return {
        hintMode,
        cursorHintPosition,
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
                },
                rangeHandlers,
                markupHandlers,
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
            onMouseMove: (event: MouseEvent<HTMLDivElement>) => {
                if (!hintMode) {
                    return;
                }

                const chartRect = event.currentTarget.getBoundingClientRect();
                setCursorHintPosition({
                    x: event.clientX - chartRect.left,
                    y: event.clientY - chartRect.top,
                });
            },
            onMouseLeave: () => setCursorHintPosition(undefined),
        },
    };
}
