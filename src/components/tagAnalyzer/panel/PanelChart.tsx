import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    PANEL_CHART_HEIGHT,
    buildPanelChartOption,
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
    extractBrushRange,
    extractDataZoomRange,
} from './PanelEChartUtil';
import type { PanelChartHandle, PanelChartHandlers, PanelChartRefs, PanelChartState, PanelNavigateState } from './TagAnalyzerPanelTypes';
import type { TagAnalyzerTimeRange } from './TagAnalyzerPanelModelTypes';

type PanelChartProps = {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: { isRaw: boolean; isDragSelectActive: boolean };
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
};

type PanelChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode?: 'single';
    xAxisIndex?: number;
};

type PanelChartAction =
    | {
          type: 'takeGlobalCursor';
          key: 'brush';
          brushOption: PanelChartBrushOption;
      }
    | {
          type: 'brush';
          areas: [];
      }
    | {
          type: 'dataZoom';
          startValue: number;
          endValue: number;
      };

type PanelChartDataZoomState = {
    startValue?: number | number[];
    endValue?: number | number[];
    start?: number;
    end?: number;
};

type PanelChartOptionState = {
    dataZoom?: PanelChartDataZoomState[];
};

type PanelChartBrushAreaPayload = {
    coordRange?: [number, number];
    range?: [number, number];
};

type PanelChartBrushEventPayload = {
    areas?: PanelChartBrushAreaPayload[];
    batch?: Array<{
        areas?: PanelChartBrushAreaPayload[];
    }>;
};

type PanelChartLegendChangePayload = {
    selected?: Record<string, boolean>;
};

type PanelChartInstance = {
    dispatchAction: (aAction: PanelChartAction) => void;
    getOption?: () => PanelChartOptionState;
};

type PanelChartWrapperHandle = {
    getEchartsInstance: () => PanelChartInstance;
};

/**
 * Returns whether a live data-zoom payload exposes enough state to reconstruct a range.
 */
const hasExplicitDataZoomRange = (aDataZoomState?: PanelChartDataZoomState): boolean => {
    if (!aDataZoomState) {
        return false;
    }

    return (
        (aDataZoomState.startValue !== undefined && aDataZoomState.endValue !== undefined) ||
        (aDataZoomState.start !== undefined && aDataZoomState.end !== undefined)
    );
};

/**
 * Keeps panel range updates from firing when the chart is already aligned to that window.
 */
const isSameTimeRange = (aLeft: TagAnalyzerTimeRange, aRight: TagAnalyzerTimeRange) => {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
};

/**
 * Displays the main panel graph and its navigator/scroll area.
 * It assembles the ECharts option tree, keeps the zoom window in sync, and forwards chart interactions back up.
 */
const PanelChart = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
}: PanelChartProps) => {
    const sChartRef = useRef<PanelChartWrapperHandle | null>(null);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const sLastZoomRangeRef = useRef<TagAnalyzerTimeRange>(pNavigateState.panelRange);
    const sIsSelectionMode = pPanelState.isDragSelectActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom === 'Y' && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;

    /**
     * Reads the current ECharts instance without leaking the third-party ref shape elsewhere.
     */
    const getChartInstance = useCallback((): PanelChartInstance | undefined => {
        return sChartRef.current?.getEchartsInstance?.();
    }, []);

    /**
     * Reads the live panel zoom window from the chart when ECharts exposes enough state for it.
     */
    const getLivePanelRange = useCallback(
        (aInstance?: PanelChartInstance): TagAnalyzerTimeRange | undefined => {
            const sInstance = aInstance ?? getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
            if (!hasExplicitDataZoomRange(sDataZoomState)) {
                return undefined;
            }

            return extractDataZoomRange(
                sDataZoomState,
                pNavigateState.panelRange,
                pNavigateState.navigatorRange,
            );
        },
        [getChartInstance, pNavigateState.navigatorRange, pNavigateState.panelRange],
    );

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(pNavigateState.chartData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [pNavigateState.chartData]);

    useEffect(() => {
        sLastZoomRangeRef.current = pNavigateState.panelRange;
    }, [pNavigateState.panelRange]);

    /**
     * Keeps the global brush cursor in sync with either drag-zoom mode or drag-select mode.
     */
    const syncBrushInteraction = useCallback((aInstance?: PanelChartInstance) => {
        const sInstance = aInstance ?? getChartInstance();
        if (!sInstance) return;

        if (sIsBrushActive) {
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
            },
        });
    }, [getChartInstance, sIsBrushActive]);

    /**
     * Keeps the live chart zoom aligned with the current panel range without rebuilding the option.
     */
    const syncPanelRange = useCallback(
        (aRange: TagAnalyzerTimeRange = pNavigateState.panelRange, aInstance?: PanelChartInstance) => {
            const sInstance = aInstance ?? getChartInstance();
            if (!sInstance) return;

            const sLiveRange = getLivePanelRange(sInstance);
            if (sLiveRange && isSameTimeRange(sLiveRange, aRange)) {
                return;
            }

            sLastZoomRangeRef.current = aRange;
            sInstance.dispatchAction({
                type: 'dataZoom',
                startValue: aRange.startTime,
                endValue: aRange.endTime,
            });
        },
        [getChartInstance, getLivePanelRange, pNavigateState.panelRange],
    );

    useEffect(() => {
        const sHandle: PanelChartHandle = {
            // Lets parent controllers drive the visible panel window without rebuilding the chart component.
            setPanelRange: (aRange) => {
                syncPanelRange(aRange);
            },
            getVisibleSeries: () => buildVisibleSeriesList(pNavigateState.chartData, sVisibleSeriesRef.current),
        };

        pChartRefs.chartWrap.current = sHandle;
    }, [pChartRefs.chartWrap, pNavigateState.chartData, syncPanelRange]);

    const sOption = useMemo(
        () =>
            buildPanelChartOption({
                chartData: pNavigateState.chartData,
                navigatorData: pNavigateState.navigatorData,
                navigatorRange: pNavigateState.navigatorRange,
                axes: pChartState.axes,
                display: pChartState.display,
                isRaw: pPanelState.isRaw,
                useNormalize: pChartState.useNormalize,
                visibleSeries: sVisibleSeries,
            }),
        [
            pChartState.axes,
            pChartState.display,
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
            sVisibleSeries,
        ],
    );

    useEffect(() => {
        // `notMerge` replaces the option tree, so re-apply the brush cursor after chart option updates.
        syncBrushInteraction();
        syncPanelRange();
    }, [sOption, syncBrushInteraction, syncPanelRange]);

    useEffect(() => {
        syncPanelRange();
    }, [pNavigateState.panelRange, syncPanelRange]);

    const sOnEvents = useMemo(
        () => ({
            // Resolves any slider or programmatic zoom back into a concrete time range.
            datazoom: (aParams: PanelChartDataZoomState) => {
                const sInstance = getChartInstance();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0] ?? {};
                // ECharts can report percent-based `start/end` while the live option still keeps absolute values.
                // Merge both so the controller always receives a concrete time range.
                const sRange = extractDataZoomRange(
                    { ...sDataZoomState, ...aParams },
                    pNavigateState.panelRange,
                    pNavigateState.navigatorRange,
                );
                if (isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                pChartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'dataZoom',
                });
            },
            // Commits the selected brush range only after the user releases the drag.
            brushEnd: (aParams: PanelChartBrushEventPayload) => {
                const sRange = extractBrushRange(aParams);
                if (!sRange) return;

                const sInstance = getChartInstance();
                sInstance?.dispatchAction({
                    type: 'brush',
                    areas: [],
                });

                if (sRange.endTime <= sRange.startTime) {
                    return;
                }

                // Brush drives two paths here: selection mode opens stats/FFT, otherwise it becomes drag-zoom.
                if (sIsSelectionMode) {
                    pChartHandlers.onSelection({
                        min: sRange.startTime,
                        max: sRange.endTime,
                    });
                    return;
                }

                if (!sIsDragZoomEnabled || isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                pChartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'brushZoom',
                });
            },
            // Mirrors legend visibility so parent UI can read back the active series list.
            legendselectchanged: (aParams: PanelChartLegendChangePayload) => {
                sVisibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
        }),
        [getChartInstance, pChartHandlers, pNavigateState.navigatorRange, pNavigateState.panelRange, sIsDragZoomEnabled, sIsSelectionMode],
    );

    /**
     * Reconnects brush mode and zoom state after the ECharts instance becomes available.
     */
    const handleChartReady = useCallback(
        (aInstance: PanelChartInstance) => {
            syncBrushInteraction(aInstance);
            syncPanelRange(pNavigateState.panelRange, aInstance);
        },
        [pNavigateState.panelRange, syncBrushInteraction, syncPanelRange],
    );

    if (!pNavigateState.navigatorData?.datasets) {
        return null;
    }

    return (
        <ReactECharts
            ref={sChartRef}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={handleChartReady}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default PanelChart;
