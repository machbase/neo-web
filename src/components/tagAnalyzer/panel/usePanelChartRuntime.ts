import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type MouseEvent } from 'react';
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

function useDisplayedNavigatorChartData(
    isLoading: boolean,
    navigatorChartData: ChartSeriesData[],
) {
    const readyNavigatorChartDataRef = useRef<ChartSeriesData[]>([]);

    if (!isLoading) {
        readyNavigatorChartDataRef.current = navigatorChartData;
    }

    return isLoading && readyNavigatorChartDataRef.current.length > 0
        ? readyNavigatorChartDataRef.current
        : navigatorChartData;
}

function useStableChartOption(chartInfo: ChartInfo) {
    const sOptionKey = JSON.stringify(chartInfo);
    const sOptionRef = useRef<ReturnType<typeof buildChartOption> | undefined>();
    const sOptionKeyRef = useRef<string | undefined>();

    if (!sOptionRef.current || sOptionKeyRef.current !== sOptionKey) {
        sOptionKeyRef.current = sOptionKey;
        sOptionRef.current = buildChartOption(chartInfo);
    }

    return sOptionRef.current;
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
}: UsePanelChartRuntimeParams) {
    const { chartAreaRef, chartApiRef } = refs;
    const { chartData, navigatorChartData } = data;
    const { panelRange, navigatorRange } = rangeState;
    const { rangeHandlers, markupHandlers, onSelection } = handlers;
    const latestHoverTimestampRef = useRef<number | undefined>();
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    const visibleSeriesRef = useRef<Record<string, boolean>>({});
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >();
    const isNumericXAxis = hasNumericBaseTimeSeries(chartState.seriesList);
    const displayedNavigatorChartData = useDisplayedNavigatorChartData(
        isLoading,
        navigatorChartData,
    );
    const chartAreaWidth = chartAreaRef.current?.clientWidth;
    const baseChartInfo = useMemo<ChartInfo>(() => ({
        mainSeriesData: chartData,
        seriesDefinitions: chartState.seriesList,
        panelRange,
        navigatorRange,
        axes: chartState.axes,
        display: chartState.display,
        isRaw,
        useNormalize: chartState.useNormalize,
        visibleSeries: {},
        navigatorSeriesData: displayedNavigatorChartData,
        navigatorSelectionMinValueSpan: getNavigatorHandleMinimumRangeWidth({
            navigatorRange,
            chartAreaWidth,
            isNumericXAxis,
        }),
        isNumericXAxis,
        highlights: chartState.highlights,
        annotations: chartState.annotations,
    }), [
        chartAreaWidth,
        chartData,
        chartState,
        displayedNavigatorChartData,
        isNumericXAxis,
        isRaw,
        navigatorRange,
        panelRange,
    ]);
    const hintMode =
        overlayMode === 'annotation' || overlayMode === 'highlight'
            ? overlayMode
            : undefined;
    const isSelectionMode =
        overlayMode === 'dragSelect' || overlayMode === 'highlight';
    const isDragZoomEnabled =
        baseChartInfo.display.use_zoom && !isSelectionMode && overlayMode !== 'annotation';
    const chartInfo = { ...baseChartInfo, visibleSeries };
    const option = useStableChartOption(chartInfo);
    const attachBlankChartClickEvent = useBlankChartClickEvent({
        chartAreaRef,
        isAnnotationActive: overlayMode === 'annotation',
        isNumericXAxis,
        latestHoverTimestampRef,
        onOpenCreateAnnotation: markupHandlers.onOpenCreateAnnotation,
    });
    const {
        getChartInstance,
        handleChartReady: syncChartReady,
    } = usePanelChartInstanceSync({
        isBrushActive: isSelectionMode || isDragZoomEnabled,
        optionRevision: option,
        onChartReady: attachBlankChartClickEvent,
    });
    const applyLegendHoverState = useCallback(
        (hoveredLegendSeries: string | undefined, force = false) => {
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
            getChartInstance()?.setOption?.(
                buildChartSeriesOption({
                    ...baseChartInfo,
                    visibleSeries: visibleSeriesRef.current,
                    hoveredLegendSeries: nextHoveredLegendSeries,
                }),
                { lazyUpdate: true },
            );
        },
        [baseChartInfo, getChartInstance],
    );

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
                currentRanges: rangeState,
                overlayMode,
                chartAreaRef,
                rangeHandlers,
                markupHandlers,
                onSelection,
                isSelectionMode,
                isDragZoomEnabled,
                isNumericXAxis,
                getChartInstance,
                applyLegendHoverState,
                setVisibleSeries,
                visibleSeriesRef,
                latestHoverTimestampRef,
            }),
            finished: () => applyPanelNavigatorCursorStyles(getChartInstance()),
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
