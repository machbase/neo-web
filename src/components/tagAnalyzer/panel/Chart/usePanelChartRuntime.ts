import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type MouseEvent } from 'react';
import type { EChartsReactProps } from 'echarts-for-react';
import type { ChartSeriesData } from '../../domain/ChartDomain';
import { PanelOverlayMode, type PanelDisplayRangeState, type PanelRangeActions, type PanelRangeChangeEvent, type PanelChartHandle, type PanelChartState, type PanelMarkupHandlers } from '../../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import { buildChartEvent } from './events/buildPanelChartEvent';
import type { ChartInfo } from './types/PanelChartTypes';
import {
    buildChartFrameOption,
    buildChartOption,
} from './options/buildPanelChartOption';
import {
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_NAVIGATOR_SERIES_ID_PREFIX,
    PANEL_SLIDER_DATA_ZOOM_ID,
} from './options/PanelChartOptionConstants';
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
    rangeState: PanelDisplayRangeState;
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

type PanelChartSeriesIdentityOption = {
    id?: unknown;
    name?: unknown;
    type?: unknown;
};

type PanelChartSeriesOptionWithData = PanelChartSeriesIdentityOption & {
    data?: unknown;
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
    const { displayPanelRange, displayNavigatorRange } = rangeState;
    const {
        rangeActions,
        markupHandlers,
        onHoveredMainSeriesChange,
        onSelection,
    } = handlers;
    const {
        axes,
        display,
        seriesList,
        useNormalize,
        highlights,
        draftHighlight,
        annotations,
    } = chartState;
    const latestHoverTimestampRef = useRef<number | undefined>();
    const latestChartClickRef = useRef(0);
    const latestDisplayPanelRangeRef = useRef(displayPanelRange);
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    const visibleSeriesRef = useRef<Record<string, boolean>>({});

    latestDisplayPanelRangeRef.current = displayPanelRange;
    const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const isNumericXAxis = hasNumericBaseTimeSeries(seriesList);
    const isSelectionMode =
        overlayMode === PanelOverlayMode.DRAG_SELECT ||
        overlayMode === PanelOverlayMode.HIGHLIGHT;
    const isDragZoomEnabled =
        display.useZoom &&
        !isSelectionMode &&
        overlayMode !== PanelOverlayMode.ANNOTATION;
    const baseChartInfo = useMemo<ChartInfo>(() => ({
        mainSeriesData: chartData,
        seriesDefinitions: seriesList,
        displayPanelRange,
        displayNavigatorRange,
        axes,
        display,
        isRaw,
        useNormalize,
        visibleSeries: {},
        navigatorSeriesData: navigatorChartData,
        isNumericXAxis,
        isWheelZoomEnabled: isDragZoomEnabled,
        highlights,
        draftHighlight,
        annotations,
    }), [
        annotations,
        axes,
        chartData,
        display,
        draftHighlight,
        highlights,
        isNumericXAxis,
        isDragZoomEnabled,
        isRaw,
        navigatorChartData,
        displayNavigatorRange,
        displayPanelRange,
        seriesList,
        useNormalize,
    ]);
    const chartInfo = useMemo(
        () => ({ ...baseChartInfo, visibleSeries }),
        [baseChartInfo, visibleSeries],
    );
    const currentFullOption = useMemo(() => buildChartOption(chartInfo), [chartInfo]);
    const currentFrameOption = useMemo(
        () => buildChartFrameOption(chartInfo),
        [chartInfo],
    );
    const latestFullOptionRef = useRef(currentFullOption);
    const latestFrameOptionRef = useRef(currentFrameOption);
    const initialOptionRef = useRef<ReturnType<typeof buildChartOption>>();

    latestFullOptionRef.current = currentFullOption;
    latestFrameOptionRef.current = currentFrameOption;
    if (!initialOptionRef.current) {
        initialOptionRef.current = currentFullOption;
    }

    const option = initialOptionRef.current;
    const seriesStructureKey = useMemo(
        () => getSeriesStructureKey(currentFullOption.series),
        [currentFullOption],
    );
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
        optionRevision: currentFrameOption,
        onChartReady: attachBlankChartClickEvent,
    });
    const syncMainChartVisibleRange = useCallback((
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        const sDisplayPanelRange = latestDisplayPanelRangeRef.current;

        if (!chartInstance || !isValidTimeRange(sDisplayPanelRange)) {
            return;
        }

        chartInstance.dispatchAction({
            type: 'dataZoom',
            dataZoomId: PANEL_SLIDER_DATA_ZOOM_ID,
            startValue: sDisplayPanelRange.startTime,
            endValue: sDisplayPanelRange.endTime,
        });
    }, [chartInstanceRef]);
    const applyFullChartOption = useCallback((
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance?.setOption) {
            return;
        }

        chartInstance.dispatchAction({ type: 'hideTip' });
        chartInstance.setOption(
            latestFullOptionRef.current,
            {
                lazyUpdate: true,
                replaceMerge: ['series', 'xAxis', 'yAxis', 'dataZoom'],
            },
        );
        syncMainChartVisibleRange(chartInstance);
    }, [chartInstanceRef, syncMainChartVisibleRange]);

    const applyRangeChartOption = useCallback((
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance?.setOption) {
            return;
        }

        chartInstance.setOption(
            latestFrameOptionRef.current,
            { lazyUpdate: true },
        );
        syncMainChartVisibleRange(chartInstance);
    }, [chartInstanceRef, syncMainChartVisibleRange]);

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

        const chartInstance = chartInstanceRef.current;
        if (!chartInstance?.setOption) {
            return;
        }

        chartInstance.dispatchAction({ type: 'hideTip' });
        chartInstance.setOption(
            stripDataFromCachedDataSeries(
                buildChartSeriesOption({
                    ...baseChartInfo,
                    visibleSeries: visibleSeriesRef.current,
                    hoveredLegendSeries: nextHoveredLegendSeries,
                }),
            ),
            { lazyUpdate: true },
        );
    }, [baseChartInfo, chartInstanceRef]);
    const handleMouseWheelZoom = useCallback((event: WheelEvent): void => {
        if (
            event.deltaY === 0 ||
            !isDragZoomEnabled ||
            !isValidTimeRange(displayPanelRange)
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

        const sCurrentWidth = getTimeRangeWidth(displayPanelRange);
        if (sCurrentWidth <= 0) {
            return;
        }

        const sAnchorTime =
            convertPanelChartPixelToTimestamp(
                chartInstance,
                sPixel,
                isNumericXAxis,
            ).timestamp ??
            displayPanelRange.startTime + sCurrentWidth / 2;
        const sAnchorRatio =
            (sAnchorTime - displayPanelRange.startTime) / sCurrentWidth;
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
        displayPanelRange,
        rangeActions,
    ]);

    useLayoutEffect(() => {
        chartInstanceRef.current?.dispatchAction({ type: 'hideTip' });
    }, [chartInstanceRef, seriesStructureKey]);

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
        applyFullChartOption();
        applyRangeChartOption();
    }, [
        annotations,
        applyFullChartOption,
        applyRangeChartOption,
        axes,
        chartData,
        display,
        draftHighlight,
        highlights,
        isDragZoomEnabled,
        isNumericXAxis,
        isRaw,
        navigatorChartData,
        seriesList,
        useNormalize,
        visibleSeries,
    ]);

    useEffect(() => {
        applyRangeChartOption();
    }, [
        applyRangeChartOption,
        displayNavigatorRange,
        displayPanelRange,
    ]);

    useEffect(() => {
        if (hoveredLegendSeriesRef.current) {
            applyLegendHoverState(hoveredLegendSeriesRef.current, true);
        }
    }, [seriesStructureKey, applyLegendHoverState]);

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
            applyFullChartOption(chartInstance);
            applyRangeChartOption(chartInstance);
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

function stripDataFromCachedDataSeries(
    seriesOptionPatch: ReturnType<typeof buildChartSeriesOption>,
): ReturnType<typeof buildChartSeriesOption> {
    return {
        series: seriesOptionPatch.series.map((seriesOption) => {
            const sSeries = seriesOption as PanelChartSeriesOptionWithData;
            const sSeriesId = String(sSeries.id ?? '');
            const sIsCachedDataSeries =
                sSeriesId.startsWith(MAIN_PANEL_SERIES_ID_PREFIX) ||
                sSeriesId.startsWith(PANEL_NAVIGATOR_SERIES_ID_PREFIX);

            if (!sIsCachedDataSeries) {
                return seriesOption;
            }
            const seriesOptionWithoutData = { ...sSeries };
            delete seriesOptionWithoutData.data;

            return seriesOptionWithoutData as typeof seriesOption;
        }),
    };
}
function getSeriesStructureKey(
    seriesOption: ReturnType<typeof buildChartOption>['series'],
): string {
    const seriesList = Array.isArray(seriesOption)
        ? seriesOption
        : seriesOption
            ? [seriesOption]
            : [];

    return seriesList
        .map((series, seriesIndex) => {
            const seriesIdentity = series as PanelChartSeriesIdentityOption;

            return [
                seriesIndex,
                String(seriesIdentity.id ?? ''),
                String(seriesIdentity.name ?? ''),
                String(seriesIdentity.type ?? ''),
            ].join(':');
        })
        .join('|');
}
