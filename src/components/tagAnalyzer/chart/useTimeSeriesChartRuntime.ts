import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { buildVisibleSeriesList } from './options/ChartLegendVisibility';
import {
    buildChartSeriesOption,
    buildPanelChartSeriesLayers,
} from './options/ChartOptionBuilder';
import { getHighlightIndexAtClientPosition as resolveHighlightIndexAtClientPosition } from './ChartHighlightHitTesting';
import {
    extractDataZoomOptionRange,
    hasExplicitDataZoomOptionRange,
} from './ChartDataZoomUtils';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type {
    PanelChartInstance,
    PanelChartWrapperHandle,
} from './PanelChartRuntimeTypes';

type UseTimeSeriesChartRuntimeParams = {
    chartRefs: PanelChartRefs;
    chartState: PanelChartState;
    panelState: Pick<PanelState, 'isRaw'>;
    navigateState: PanelNavigateState;
    isBrushActive: boolean;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
};

export function useTimeSeriesChartRuntime({
    chartRefs,
    chartState,
    panelState,
    navigateState,
    isBrushActive,
    visibleSeriesRef,
}: UseTimeSeriesChartRuntimeParams) {
    const chartWrapperRef = useRef<PanelChartWrapperHandle | null>(null);
    const readyChartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const latestPanelRangeRef = useRef<TimeRangeMs>(navigateState.panelRange);
    const lastZoomRangeRef = useRef<TimeRangeMs>(navigateState.panelRange);
    const appliedZoomRangeRef = useRef<TimeRangeMs | undefined>(undefined);
    const skipNextPanelRangeSyncRef = useRef(false);
    const hoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    latestPanelRangeRef.current = navigateState.panelRange;

    const setChartWrapper = useCallback((chart: unknown) => {
        chartWrapperRef.current = chart as PanelChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback((): PanelChartInstance | undefined => chartWrapperRef.current?.getEchartsInstance?.(), []);

    useEffect(() => {
        lastZoomRangeRef.current = navigateState.panelRange;
    }, [navigateState.panelRange]);

    const getLivePanelRange = useCallback(
        (instance: PanelChartInstance | undefined): TimeRangeMs | undefined => {
            const sInstance = instance ?? getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            if (!sDataZoomState || !hasExplicitDataZoomOptionRange(sDataZoomState)) {
                return undefined;
            }

            return extractDataZoomOptionRange(
                sDataZoomState,
                navigateState.panelRange,
                navigateState.navigatorRange,
            );
        },
        [getChartInstance, navigateState.navigatorRange, navigateState.panelRange],
    );

    const syncPanelRange = useCallback(
        (range: TimeRangeMs, instance: PanelChartInstance | undefined, force = false) => {
            const sInstance = instance ?? getChartInstance();
            if (!sInstance) {
                return;
            }

            const sAppliedZoomRange = appliedZoomRangeRef.current;
            if (!force && sAppliedZoomRange && isSameTimeRange(sAppliedZoomRange, range)) {
                if (skipNextPanelRangeSyncRef.current) {
                    skipNextPanelRangeSyncRef.current = false;
                }
                return;
            }

            const sLiveRange = !force && !sAppliedZoomRange ? getLivePanelRange(sInstance) : undefined;
            if (sLiveRange && isSameTimeRange(sLiveRange, range)) {
                appliedZoomRangeRef.current = range;
                return;
            }

            lastZoomRangeRef.current = range;
            appliedZoomRangeRef.current = range;
            sInstance.dispatchAction({
                type: 'dataZoom',
                startValue: range.startTime,
                endValue: range.endTime,
            });
        },
        [getChartInstance, getLivePanelRange],
    );

    const syncBrushInteraction = useCallback(
        (instance: PanelChartInstance | undefined) => {
            const sInstance = instance ?? getChartInstance();
            if (!sInstance) {
                return;
            }

            if (isBrushActive) {
                sInstance.dispatchAction({
                    type: 'takeGlobalCursor',
                    key: 'brush',
                    brushOption: {
                        brushType: 'lineX',
                        brushMode: 'single',
                        xAxisIndex: 0,
                    },
                });
                return;
            }

            sInstance.dispatchAction({
                type: 'brush',
                areas: [],
            });
            sInstance.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                    brushType: false,
                    brushMode: undefined,
                    xAxisIndex: undefined,
                },
            });
        },
        [getChartInstance, isBrushActive],
    );

    const applyLegendHoverState = useCallback(
        (hoveredLegendSeries: string | undefined, force = false) => {
            const sNextHoveredLegendSeries =
                hoveredLegendSeries &&
                [...navigateState.chartData, ...navigateState.navigatorChartData].some(
                    (series) => series.name === hoveredLegendSeries,
                )
                    ? hoveredLegendSeries
                    : undefined;

            if (!force && hoveredLegendSeriesRef.current === sNextHoveredLegendSeries) {
                return;
            }

            hoveredLegendSeriesRef.current = sNextHoveredLegendSeries;

            const sInstance = getChartInstance();
            if (!sInstance?.setOption) {
                return;
            }

            const sSeriesLayers = buildPanelChartSeriesLayers({
                chartData: navigateState.chartData,
                seriesList: chartState.seriesList,
                navigatorRange: navigateState.navigatorRange,
                axes: chartState.axes,
                display: chartState.display,
                isRaw: panelState.isRaw,
                useNormalize: chartState.useNormalize,
                visibleSeries: visibleSeriesRef.current,
                navigatorChartData: navigateState.navigatorChartData,
                hoveredLegendSeries: sNextHoveredLegendSeries,
                highlights: chartState.highlights,
            });

            sInstance.setOption(
                buildChartSeriesOption(
                    sSeriesLayers.highlightOverlaySeries,
                    sSeriesLayers.highlightLabelSeries,
                    sSeriesLayers.annotationGuideLineSeries,
                    sSeriesLayers.annotationLabelSeries,
                    sSeriesLayers.mainSeries,
                    sSeriesLayers.navigatorSeries,
                ),
                { lazyUpdate: true },
            );
        },
        [
            chartState.axes,
            chartState.display,
            chartState.highlights,
            chartState.seriesList,
            chartState.useNormalize,
            getChartInstance,
            navigateState.chartData,
            navigateState.navigatorChartData,
            navigateState.navigatorRange,
            panelState.isRaw,
            visibleSeriesRef,
        ],
    );

    useEffect(() => {
        chartRefs.chartWrap.current = {
            setPanelRange: (range) => syncPanelRange(range, undefined),
            getVisibleSeries: () =>
                buildVisibleSeriesList(navigateState.chartData, visibleSeriesRef.current),
            getHighlightIndexAtClientPosition: (clientX, clientY) =>
                resolveHighlightIndexAtClientPosition({
                    areaChartRef: chartRefs.areaChart,
                    chartInstance: getChartInstance(),
                    highlights: chartState.highlights,
                    clientX,
                    clientY,
                }),
        };
    }, [
        chartRefs.areaChart,
        chartRefs.chartWrap,
        chartState.highlights,
        getChartInstance,
        navigateState.chartData,
        syncPanelRange,
        visibleSeriesRef,
    ]);

    const handleChartReady = useCallback(
        (instance: PanelChartInstance) => {
            const sShouldForceSync = readyChartInstanceRef.current !== instance;
            readyChartInstanceRef.current = instance;
            syncBrushInteraction(instance);
            syncPanelRange(latestPanelRangeRef.current, instance, sShouldForceSync);
            if (hoveredLegendSeriesRef.current) {
                applyLegendHoverState(hoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, syncBrushInteraction, syncPanelRange],
    );

    return {
        appliedZoomRangeRef,
        applyLegendHoverState,
        getChartInstance,
        handleChartReady,
        hoveredLegendSeriesRef,
        lastZoomRangeRef,
        setChartWrapper,
        skipNextPanelRangeSyncRef,
        syncBrushInteraction,
        syncPanelRange,
    };
}
