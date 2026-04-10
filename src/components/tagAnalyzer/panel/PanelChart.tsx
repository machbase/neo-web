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
    batch?: PanelChartDataZoomState[];
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
 * Returns the primary data-zoom payload regardless of whether ECharts sent it directly or inside `batch`.
 * @param aDataZoomState The incoming data-zoom payload.
 * @returns The primary zoom payload object to inspect.
 */
const getPrimaryDataZoomState = (aDataZoomState?: PanelChartDataZoomState) => {
    return aDataZoomState?.batch?.[0] ?? aDataZoomState;
};

/**
 * Returns whether a live data-zoom payload exposes enough state to reconstruct a range.
 * @param aDataZoomState The current live ECharts data-zoom state.
 * @returns Whether the payload contains a complete zoom range.
 */
const hasExplicitDataZoomRange = (aDataZoomState?: PanelChartDataZoomState): boolean => {
    const sDataZoomState = getPrimaryDataZoomState(aDataZoomState);
    if (!sDataZoomState) {
        return false;
    }

    return (
        (sDataZoomState.startValue !== undefined && sDataZoomState.endValue !== undefined) ||
        (sDataZoomState.start !== undefined && sDataZoomState.end !== undefined)
    );
};

/**
 * Keeps panel range updates from firing when the chart is already aligned to that window.
 * @param aLeft The first time range to compare.
 * @param aRight The second time range to compare.
 * @returns Whether both ranges describe the same visible window.
 */
const isSameTimeRange = (aLeft: TagAnalyzerTimeRange, aRight: TagAnalyzerTimeRange) => {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
};

/**
 * Displays the main panel graph and its navigator/scroll area.
 * It assembles the ECharts option tree, keeps the zoom window in sync, and forwards chart interactions back up.
 * @param props The chart refs, state, and callbacks used to drive the panel chart.
 * @returns The rendered ECharts panel, or `null` while navigator data is unavailable.
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
    const sLatestPanelRangeRef = useRef<TagAnalyzerTimeRange>(pNavigateState.panelRange);
    const sLastZoomRangeRef = useRef<TagAnalyzerTimeRange>(pNavigateState.panelRange);
    const sAppliedZoomRangeRef = useRef<TagAnalyzerTimeRange | null>(null);
    const sSkipNextPanelRangeSyncRef = useRef(false);
    const sReadyChartInstanceRef = useRef<PanelChartInstance | null>(null);
    const sIsSelectionMode = pPanelState.isDragSelectActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom === 'Y' && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;
    const sAxesSignature = JSON.stringify(pChartState.axes);
    const sDisplaySignature = JSON.stringify(pChartState.display);
    sLatestPanelRangeRef.current = pNavigateState.panelRange;

    /**
     * Reads the current ECharts instance without leaking the third-party ref shape elsewhere.
     * @returns The active ECharts instance, if the chart has mounted.
     */
    const getChartInstance = useCallback((): PanelChartInstance | undefined => {
        return sChartRef.current?.getEchartsInstance?.();
    }, []);

    /**
     * Reads the live panel zoom window from the chart when ECharts exposes enough state for it.
     * @param aInstance The current ECharts instance, when already available.
     * @returns The live panel range from ECharts, or `undefined` when it cannot be reconstructed.
     */
    const getLivePanelRange = useCallback(
        (aInstance?: PanelChartInstance): TagAnalyzerTimeRange | undefined => {
            const sInstance = aInstance ?? getChartInstance();
            const sDataZoomState = getPrimaryDataZoomState(sInstance?.getOption?.()?.dataZoom?.[0]);
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
     * @param aInstance The current ECharts instance, when already available.
     * @returns Nothing.
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
     * @param aRange The panel range that should be visible in the live chart.
     * @param aInstance The current ECharts instance, when already available.
     * @param aForce Whether the range should be re-applied even when we already know the chart is at that window.
     * @returns Nothing.
     */
    const syncPanelRange = useCallback(
        (
            aRange: TagAnalyzerTimeRange,
            aInstance?: PanelChartInstance,
            aForce = false,
        ) => {
            const sInstance = aInstance ?? getChartInstance();
            if (!sInstance) return;

            if (
                !aForce &&
                sSkipNextPanelRangeSyncRef.current &&
                sAppliedZoomRangeRef.current &&
                isSameTimeRange(sAppliedZoomRangeRef.current, aRange)
            ) {
                sSkipNextPanelRangeSyncRef.current = false;
                return;
            }

            if (!aForce && sAppliedZoomRangeRef.current && isSameTimeRange(sAppliedZoomRangeRef.current, aRange)) {
                return;
            }

            const sLiveRange =
                !aForce && !sAppliedZoomRangeRef.current
                    ? getLivePanelRange(sInstance)
                    : undefined;
            if (sLiveRange && isSameTimeRange(sLiveRange, aRange)) {
                sAppliedZoomRangeRef.current = aRange;
                return;
            }

            sLastZoomRangeRef.current = aRange;
            sAppliedZoomRangeRef.current = aRange;
            sInstance.dispatchAction({
                type: 'dataZoom',
                startValue: aRange.startTime,
                endValue: aRange.endTime,
            });
        },
        [getChartInstance, getLivePanelRange],
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
                navigatorRange: pNavigateState.navigatorRange,
                axes: pChartState.axes,
                display: pChartState.display,
                isRaw: pPanelState.isRaw,
                useNormalize: pChartState.useNormalize,
                visibleSeries: sVisibleSeries,
            }),
        [
            sAxesSignature,
            sDisplaySignature,
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
            sVisibleSeries,
        ],
    );

    useEffect(() => {
        // `notMerge` replaces the option tree, so re-apply the brush cursor after chart option updates.
        syncBrushInteraction();
        syncPanelRange(sLastZoomRangeRef.current, undefined, true);
    }, [sOption, syncBrushInteraction, syncPanelRange]);

    useEffect(() => {
        syncPanelRange(pNavigateState.panelRange);
    }, [pNavigateState.panelRange, syncPanelRange]);

    const sOnEvents = useMemo(
        () => ({
            // Resolves any slider or programmatic zoom back into a concrete time range.
            datazoom: (aParams: PanelChartDataZoomState) => {
                const sInstance = getChartInstance();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0] ?? {};
                // Trust the live drag payload first. When ECharts emits percent-based `start/end`,
                // merging in older absolute values from `getOption()` makes the window lag behind the cursor.
                const sRange = hasExplicitDataZoomRange(aParams)
                    ? extractDataZoomRange(
                          aParams,
                          pNavigateState.panelRange,
                          pNavigateState.navigatorRange,
                      )
                    : extractDataZoomRange(
                          { ...sDataZoomState, ...aParams },
                          pNavigateState.panelRange,
                          pNavigateState.navigatorRange,
                      );
                if (isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                sAppliedZoomRangeRef.current = sRange;
                sSkipNextPanelRangeSyncRef.current = true;
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
     * @param aInstance The newly ready ECharts instance.
     * @returns Nothing.
     */
    const handleChartReady = useCallback(
        (aInstance: PanelChartInstance) => {
            const sShouldForceSync = sReadyChartInstanceRef.current !== aInstance;
            sReadyChartInstanceRef.current = aInstance;
            syncBrushInteraction(aInstance);
            syncPanelRange(sLatestPanelRangeRef.current, aInstance, sShouldForceSync);
        },
        [syncBrushInteraction, syncPanelRange],
    );

    if (!pNavigateState.chartData) {
        return null;
    }

    return (
        <ReactECharts
            ref={(aChart) => {
                sChartRef.current = aChart as unknown as PanelChartWrapperHandle | null;
            }}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={(aInstance) => {
                handleChartReady(aInstance as unknown as PanelChartInstance);
            }}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default PanelChart;
