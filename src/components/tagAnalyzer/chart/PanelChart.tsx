import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
    type MouseEvent,
    type ReactNode,
} from 'react';
import ReactECharts from 'echarts-for-react';
import { MdBlock, MdCheckCircle } from 'react-icons/md';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type { PanelHighlight, PanelInfo } from '../panel/panelModel';
import { hasNumericBaseTimeSeries } from '../seriesModel';
import { getRangeWidth } from '../range/rangeArithmetic';
import {
    type AxisRange,
    type RangeState,
} from '../range/rangeModel';
import {
    applyPanelNavigatorCursorStyles,
    type PanelChartBlankClickPayload,
    type PanelChartInstance,
    type PanelChartRuntime,
    type RuntimePanelChartConfig,
    resolveRuntimePanelChartConfig,
} from './chartRuntime';
import {
    PanelOverlayMode,
    type PanelOverlayCursorHintState,
} from '../panel/panelInteraction';
import {
    type ChartSeriesVisibilityMap,
    getChartSeriesEChartsName,
} from './chartData';

import {
    buildChartEvent,
    buildChartOption,
    buildChartSeriesOption,
    MAIN_PANEL_SERIES_ID_PREFIX,
    PANEL_NAVIGATOR_SERIES_ID_PREFIX,
    PANEL_SLIDER_DATA_ZOOM_ID,
    type PanelChartHandlers,
} from './chartModel';
import {
    convertPanelChartPixelToTimestamp,
    getChartLayoutMetrics,
    getPanelChartEventCoordinates,
    isSameDataZoomSelection,
    PANEL_CHART_HEIGHT,
    PANEL_GRID_SIDE,
} from './chartGeometry';

export type PanelChartHandle = {
    getVisibleSeries: () => Array<{ name: string; visible: boolean }>;
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

type PanelChartRefs = {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartApiRef: MutableRefObject<PanelChartHandle | null>;
};

type UsePanelChartRuntimeParams = {
    refs: PanelChartRefs;
    runtimeConfig: RuntimePanelChartConfig;
    draftHighlight?: PanelHighlight;
    overlayMode: PanelOverlayMode;
    data: PanelChartRuntime['data'];
    rangeState: RangeState;
    handlers: PanelChartHandlers;
};

function usePanelChartRuntime({
    refs,
    runtimeConfig,
    draftHighlight,
    overlayMode,
    data,
    rangeState,
    handlers,
}: UsePanelChartRuntimeParams) {
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
    const latestMainRangeRef = useRef(mainRange);
    const latestNavigatorRangeRef = useRef(navigatorRange);
    const latestAppliedChartDataRef = useRef(chartData);
    const latestAppliedNavigatorChartDataRef = useRef(navigatorChartData);
    const hoveredLegendSeriesRef = useRef<string | undefined>();
    const visibleSeriesRef = useRef<ChartSeriesVisibilityMap>({});

    latestMainRangeRef.current = mainRange;
    latestNavigatorRangeRef.current = navigatorRange;
    const sAnimateMainDataUpdate = latestAppliedChartDataRef.current === chartData;
    const sAnimateNavigatorDataUpdate =
        latestAppliedNavigatorChartDataRef.current === navigatorChartData;
    const [visibleSeries, setVisibleSeries] = useState<ChartSeriesVisibilityMap>({});
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
    const currentRangeOption = useMemo(
        () => ({
            ...currentFullOption,
            series: stripDataFromCachedDataSeries(
                currentFullOption.series,
            ),
        }),
        [currentFullOption],
    );
    const latestFullOptionRef = useRef(currentFullOption);
    const latestRangeOptionRef = useRef(currentRangeOption);
    const initialOptionRef = useRef(currentFullOption);
    const lastRenderedChartDataRef = useRef<PanelChartRuntime['data']>();

    latestFullOptionRef.current = currentFullOption;
    latestRangeOptionRef.current = currentRangeOption;
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
        syncBrushInteraction,
    } = usePanelChartInstanceSync({
        isBrushActive: isSelectionMode || isDragZoomEnabled,
        optionRevision: currentRangeOption,
        onChartReady: attachBlankChartClickEvent,
    });
    const syncMainChartVisibleRange = useCallback((
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        const sMainRange = latestMainRangeRef.current;

        if (!chartInstance) {
            return;
        }

        const sSliderState = chartInstance.getOption?.()?.dataZoom?.find(
            (item) =>
                item.id === PANEL_SLIDER_DATA_ZOOM_ID ||
                item.dataZoomId === PANEL_SLIDER_DATA_ZOOM_ID,
        );
        if (
            sSliderState &&
            isSameDataZoomSelection(
                sSliderState,
                sMainRange,
                latestNavigatorRangeRef.current,
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
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance?.setOption) {
            return;
        }

        const sShouldResetChartData =
            lastRenderedChartDataRef.current !== undefined &&
            (lastRenderedChartDataRef.current.chartData !== chartData ||
                lastRenderedChartDataRef.current.navigatorChartData !==
                    navigatorChartData);

        chartInstance.dispatchAction({ type: 'hideTip' });
        if (sShouldResetChartData) {
            chartInstance.clear?.();
        }

        chartInstance.setOption(
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
        chartInstance: PanelChartInstance | undefined = chartInstanceRef.current,
    ): void => {
        if (!chartInstance?.setOption) {
            return;
        }

        chartInstance.setOption(
            latestRangeOptionRef.current,
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
                (series) => getChartSeriesEChartsName(series) === hoveredLegendSeries,
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
        applyMainZoomRange: rangeActions.applyMainZoomRange,
    });

    useLayoutEffect(() => {
        chartInstanceRef.current?.dispatchAction({ type: 'hideTip' });
    }, [chartInstanceRef, seriesStructureKey]);

    useLayoutEffect(() => {
        latestAppliedChartDataRef.current = chartData;
        latestAppliedNavigatorChartDataRef.current = navigatorChartData;
    }, [chartData, navigatorChartData]);

    useEffect(() => {
        const nextVisibleSeries = {
            ...Object.fromEntries(
                chartData.map((series) => [
                    getChartSeriesEChartsName(series),
                    true,
                ]),
            ),
            ...visibleSeriesRef.current,
        };

        visibleSeriesRef.current = nextVisibleSeries;
        setVisibleSeries(nextVisibleSeries);
    }, [chartData]);

    useEffect(() => {
        chartApiRef.current = {
            getVisibleSeries: () =>
                chartData.map((series) => {
                    const sEChartsName = getChartSeriesEChartsName(series);

                    return {
                        name: series.name,
                        visible: visibleSeriesRef.current[sEChartsName] !== false,
                    };
                }),
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
                onHoveredMainSeriesChange: (seriesName) => {
                    const sVisibleSeries = seriesName === undefined
                        ? undefined
                        : chartData.find(
                            (series) =>
                                getChartSeriesEChartsName(series) === seriesName,
                        );
                    onHoveredMainSeriesChange(
                        sVisibleSeries?.name ?? seriesName,
                    );
                },
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
    };
}

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

function getSeriesStructureKey(
    seriesOption: ReturnType<typeof buildChartOption>['series'],
): string {
    return seriesOption
        .map((series, seriesIndex) => {
            return [
                seriesIndex,
                String(series.id ?? ''),
                String(series.name ?? ''),
                String(series.type ?? ''),
            ].join(':');
        })
        .join('|');
}

type PanelChartProps = Omit<
    UsePanelChartRuntimeParams,
    'rangeState' | 'runtimeConfig'
> & {
    panelInfo: PanelInfo;
    isLoading: boolean;
    rangeState: RangeState | undefined;
    displayNotice: string | undefined;
};

function ReadyPanelChart(props: UsePanelChartRuntimeParams) {
    const {
        option,
        onEvents,
        handleChartReady,
    } = usePanelChartRuntime(props);

    return (
        <ReactECharts
            option={option}
            onEvents={onEvents}
            onChartReady={handleChartReady}
            replaceMerge={['series', 'xAxis', 'yAxis', 'dataZoom']}
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
}

function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>): void {
    if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
    }
}

export default function PanelChart({
    panelInfo,
    isLoading,
    rangeState,
    displayNotice,
    ...runtimeProps
}: PanelChartProps) {
    const runtimeConfig = useMemo(
        () => resolveRuntimePanelChartConfig(panelInfo),
        [panelInfo],
    );
    const { refs, handlers } = runtimeProps;
    const rangeReady = rangeState !== undefined;

    return (
        <div className="chart">
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                icon={<VscChevronLeft size={16} />}
                disabled={!rangeReady}
                onClick={handlers.rangeActions.shiftMainRangeLeft}
            />
            <div
                className="chart-body"
                ref={refs.chartAreaRef}
                style={{ height: PANEL_CHART_HEIGHT }}
                onMouseDownCapture={handleChartMouseDownCapture}
            >
                {rangeState && (
                    <ReadyPanelChart
                        {...runtimeProps}
                        runtimeConfig={runtimeConfig}
                        rangeState={rangeState}
                    />
                )}
                {(isLoading || displayNotice) && (
                    <PanelMainChartOverlay
                        showLegend={runtimeConfig.display.showLegend}
                        className={`panel-main-chart-${isLoading ? 'loading' : 'notice'}-overlay`}
                    >
                        {isLoading && (
                            <span className="panel-main-chart-loading-spinner" />
                        )}
                        <span>{isLoading ? 'Loading...' : displayNotice}</span>
                    </PanelMainChartOverlay>
                )}
            </div>
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range forward"
                icon={<VscChevronRight size={16} />}
                disabled={!rangeReady}
                onClick={handlers.rangeActions.shiftMainRangeRight}
            />
        </div>
    );
}

function PanelMainChartOverlay({
    showLegend,
    className,
    children,
}: {
    showLegend: boolean;
    className: string;
    children: ReactNode;
}) {
    const layout = getChartLayoutMetrics(showLegend);

    return (
        <div
            className={className}
            style={{
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: layout.mainGridTop,
                height: layout.mainGridHeight,
            }}
        >
            {children}
        </div>
    );
}

function usePanelChartInstanceSync({
    isBrushActive,
    optionRevision,
    onChartReady,
}: {
    isBrushActive: boolean;
    optionRevision: unknown;
    onChartReady: (instance: PanelChartInstance) => void;
}) {
    const chartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);

    const syncBrushInteraction = useCallback((instance?: PanelChartInstance): void => {
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

    const handleChartReady = (instance: PanelChartInstance): void => {
        chartInstanceRef.current = instance;
        onChartReady(instance);
        instance.hideLoading?.();
        syncBrushInteraction(instance);
    };

    useEffect(() => {
        syncBrushInteraction();
    }, [optionRevision, syncBrushInteraction]);

    return {
        chartInstanceRef,
        handleChartReady,
        syncBrushInteraction,
    };
}

function usePanelChartWheelZoom({
    chartAreaRef,
    chartInstanceRef,
    isWheelZoomEnabled,
    isNumericXAxis,
    mainRange,
    applyMainZoomRange,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartInstanceRef: MutableRefObject<PanelChartInstance | undefined>;
    isWheelZoomEnabled: boolean;
    isNumericXAxis: boolean;
    mainRange: AxisRange;
    applyMainZoomRange: PanelChartHandlers['rangeActions']['applyMainZoomRange'];
}): void {
    const handleMouseWheelZoom = useCallback((event: WheelEvent): void => {
        if (event.deltaY === 0 || !isWheelZoomEnabled) {
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

        applyMainZoomRange(
            {
                start: sNextStart,
                end: sNextStart + sNextWidth,
            },
        );
    }, [
        applyMainZoomRange,
        chartAreaRef,
        chartInstanceRef,
        isWheelZoomEnabled,
        isNumericXAxis,
        mainRange,
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
}

const PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR = 0.82;
const PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR = 1.22;

function useBlankChartClickEvent({
    chartAreaRef,
    isAnnotationActive,
    isNumericXAxis,
    latestHoverTimestampRef,
    latestChartClickRef,
    onOpenCreateAnnotation,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isAnnotationActive: boolean;
    isNumericXAxis: boolean;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    latestChartClickRef: MutableRefObject<number>;
    onOpenCreateAnnotation:
        PanelChartHandlers['markupHandlers']['onOpenCreateAnnotation'];
}): (instance: PanelChartInstance) => void {
    const sListenerInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const sOpenCreateAnnotationRef = useRef(onOpenCreateAnnotation);
    sOpenCreateAnnotationRef.current = onOpenCreateAnnotation;

    const removeBlankChartClickEvent = useCallback((): void => {
        sListenerCleanupRef.current?.();
        sListenerCleanupRef.current = undefined;
        sListenerInstanceRef.current = undefined;
    }, []);

    const attachBlankChartClickEvent = useCallback((instance: PanelChartInstance): void => {
        if (
            sListenerInstanceRef.current === instance &&
            sListenerCleanupRef.current
        ) {
            return;
        }

        removeBlankChartClickEvent();

        const sZr = instance.getZr?.();
        if (!sZr?.on || !sZr.off) {
            return;
        }

        function handleBlankChartClick(event: PanelChartBlankClickPayload): void {
            if (!isAnnotationActive) {
                return;
            }

            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const { pixel: sPixel, position: sPosition } =
                getPanelChartEventCoordinates(
                    event,
                    sChartRect,
                );
            const sChartClickSequence = latestChartClickRef.current;

            if (!sPixel || !sPosition) {
                return;
            }

            window.setTimeout(() => {
                if (latestChartClickRef.current !== sChartClickSequence) {
                    return;
                }

                if (
                    instance.containPixel &&
                    !instance.containPixel({ gridIndex: 0 }, sPixel)
                ) {
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

                sOpenCreateAnnotationRef.current(
                    sPosition,
                    undefined,
                    sTimestamp,
                );
            }, 0);
        }

        sZr.on('click', handleBlankChartClick);
        sListenerInstanceRef.current = instance;
        sListenerCleanupRef.current = () =>
            sZr.off?.('click', handleBlankChartClick);
    }, [
        chartAreaRef,
        isAnnotationActive,
        isNumericXAxis,
        latestChartClickRef,
        latestHoverTimestampRef,
        removeBlankChartClickEvent,
    ]);

    useEffect(() => {
        const sListenerInstance = sListenerInstanceRef.current;
        if (!sListenerInstance) {
            return;
        }

        removeBlankChartClickEvent();
        attachBlankChartClickEvent(sListenerInstance);
    }, [attachBlankChartClickEvent, removeBlankChartClickEvent]);

    useEffect(() => removeBlankChartClickEvent, [removeBlankChartClickEvent]);

    return attachBlankChartClickEvent;
}

// eslint-disable-next-line react-refresh/only-export-components -- Panel owns this chart-only observer.
export function useChartAreaWidthObserver(
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    onWidthChange: (width: number | undefined) => void,
): void {
    const onWidthChangeRef = useRef(onWidthChange);
    onWidthChangeRef.current = onWidthChange;

    useEffect(() => {
        const sChartArea = chartAreaRef.current;
        if (!sChartArea) {
            onWidthChangeRef.current(undefined);
            return undefined;
        }

        let sLastWidth: number | undefined;
        const updateChartAreaWidth = (): void => {
            const sWidth = sChartArea.clientWidth;
            const sNextWidth = sWidth > 0 ? sWidth : undefined;

            if (sNextWidth === sLastWidth) {
                return;
            }

            sLastWidth = sNextWidth;
            onWidthChangeRef.current(sNextWidth);
        };

        updateChartAreaWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateChartAreaWidth);
            return () => window.removeEventListener('resize', updateChartAreaWidth);
        }

        const sResizeObserver = new ResizeObserver(updateChartAreaWidth);
        sResizeObserver.observe(sChartArea);

        return () => sResizeObserver.disconnect();
    }, [chartAreaRef]);
}

export const ANNOTATION_INVALID_TARGET_MESSAGE =
    'Annotation can only be created on the main chart.';
const HIGHLIGHT_INVALID_TARGET_MESSAGE =
    'Highlight can only be created on the main chart.';
const DRAG_SELECT_INVALID_TARGET_MESSAGE =
    'Selection can only be made on the main chart.';
const INTERACTION_HINT_MARGIN = 6;
const INTERACTION_HINT_TOP_MARGIN = 42;
const INTERACTION_HINT_CURSOR_OFFSET_X = 14;
const INTERACTION_HINT_CURSOR_OFFSET_Y = -34;

type PanelOverlayCursorHintLayout = {
    width: number;
    height: number;
    parentWidth: number;
    parentHeight: number;
};

export function PanelOverlayCursorHint({
    hint,
}: {
    hint: PanelOverlayCursorHintState | undefined;
}) {
    const hintRef = useRef<HTMLSpanElement | null>(null);
    const [layout, setLayout] = useState<
        PanelOverlayCursorHintLayout | undefined
    >(undefined);

    useLayoutEffect(() => {
        if (!hint) {
            return;
        }

        const hintElement = hintRef.current;

        if (!hintElement) {
            throw new Error('Cannot measure an unmounted panel cursor hint.');
        }

        const parentElement = hintElement.parentElement;

        if (!parentElement) {
            throw new Error('Cannot measure a panel cursor hint without its panel.');
        }

        const hintRect = hintElement.getBoundingClientRect();
        const nextLayout = {
            width: hintRect.width,
            height: hintRect.height,
            parentWidth: parentElement.clientWidth,
            parentHeight: parentElement.clientHeight,
        };

        setLayout((currentLayout) =>
            currentLayout?.width === nextLayout.width &&
            currentLayout.height === nextLayout.height &&
            currentLayout.parentWidth === nextLayout.parentWidth &&
            currentLayout.parentHeight === nextLayout.parentHeight
                ? currentLayout
                : nextLayout,
        );
    }, [hint]);

    if (!hint) {
        return null;
    }

    const left = getClampedInteractionHintCoordinate(
        hint.x + INTERACTION_HINT_CURSOR_OFFSET_X,
        layout?.width,
        layout?.parentWidth,
        INTERACTION_HINT_MARGIN,
    );
    const top = getClampedInteractionHintCoordinate(
        hint.y + INTERACTION_HINT_CURSOR_OFFSET_Y,
        layout?.height,
        layout?.parentHeight,
        INTERACTION_HINT_TOP_MARGIN,
    );

    return (
        <span
            ref={hintRef}
            className={`panel-chart-interaction-hint panel-chart-interaction-hint--${hint.isValidTarget ? 'valid' : 'invalid'}`}
            style={{
                left,
                top,
            }}
        >
            {hint.isValidTarget ? (
                <MdCheckCircle size={13} />
            ) : (
                <MdBlock size={13} />
            )}
            <span>{getPanelOverlayCursorHintMessage(hint)}</span>
        </span>
    );
}

function getClampedInteractionHintCoordinate(
    requestedCoordinate: number,
    hintSize: number | undefined,
    parentSize: number | undefined,
    minCoordinate: number,
): number {
    if (hintSize === undefined || parentSize === undefined) {
        return Math.max(minCoordinate, requestedCoordinate);
    }

    const maxCoordinate = Math.max(
        minCoordinate,
        parentSize - hintSize - INTERACTION_HINT_MARGIN,
    );

    return Math.min(
        Math.max(minCoordinate, requestedCoordinate),
        maxCoordinate,
    );
}

function getPanelOverlayCursorHintMessage(
    hint: PanelOverlayCursorHintState,
): string {
    if (hint.overlayMode === PanelOverlayMode.ANNOTATION) {
        if (hint.isValidTarget && hint.hoveredMainSeriesName) {
            return `Create annotation on ${hint.hoveredMainSeriesName}`;
        }

        return hint.isValidTarget
            ? 'Create annotation here'
            : ANNOTATION_INVALID_TARGET_MESSAGE;
    }

    if (hint.overlayMode === PanelOverlayMode.DRAG_SELECT) {
        return hint.isValidTarget
            ? 'Drag to select area'
            : DRAG_SELECT_INVALID_TARGET_MESSAGE;
    }

    return hint.isValidTarget
        ? 'Drag to create highlight'
        : HIGHLIGHT_INVALID_TARGET_MESSAGE;
}
