import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PANEL_CHART_HEIGHT } from './options/ChartOptionConstants';
import { buildChartOption } from './options/ChartOptionBuilder';
import {
    HIGHLIGHT_LABEL_SERIES_ID,
    buildChartSeriesOption,
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
} from './options/ChartSeriesUtils';
import { extractBrushRange, extractDataZoomRange } from './options/ChartInteractionUtils';
import type {
    EChartBrushPayload,
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from './options/ChartOptionTypes';
import type {
    PanelChartHandle,
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { TimeRangeMs } from '../utils/time/timeTypes';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';

// Used by PanelChart to type brush option.
type ChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode: 'single' | undefined;
    xAxisIndex: number | undefined;
};

// Used by PanelChart to type action.
type ChartAction =
    | {
          type: 'takeGlobalCursor';
          key: 'brush';
          brushOption: ChartBrushOption;
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

// Used by PanelChart to type option state.
type ChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

// Used by PanelChart to type hover-only option patches.
type ChartSeriesOptionState = ReturnType<typeof buildChartSeriesOption>;

// Used by PanelChart to type legend change payload.
type ChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

// Used by PanelChart to type legend hover payload.
type ChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

// Used by PanelChart to type click payload.
type ChartClickPayload = Partial<{
    seriesId: string;
    dataIndex: number;
    event: {
        event: Partial<{
            clientX: number;
            clientY: number;
        }>;
    };
}>;

// Used by PanelChart to type instance.
type ChartInstance = {
    dispatchAction: (aAction: ChartAction) => void;
    getOption: (() => ChartOptionState) | undefined;
    setOption:
        | ((aOption: ChartSeriesOptionState, aOptions?: { lazyUpdate?: boolean }) => void)
        | undefined;
    containPixel?: (
        aFinder: { gridIndex: number },
        aValue: [number, number],
    ) => boolean;
    convertFromPixel?: (
        aFinder: { xAxisIndex: number },
        aValue: [number, number],
    ) => unknown;
};

// Used by PanelChart to type wrapper handle.
type ChartWrapperHandle = {
    getEchartsInstance: () => ChartInstance;
};

/**
 * Returns whether a highlight/downplay payload came from legend hover actions.
 * Intent: Detect legend hover payloads so the chart can skip ordinary highlight handling.
 * @param aPayload The incoming ECharts highlight/downplay payload.
 * @returns Whether the payload was dispatched by legend hover behavior.
 */
const isLegendHoverPayload = (
    aPayload: ChartHighlightPayload | undefined,
): aPayload is ChartHighlightPayload & { excludeSeriesId: string[] } => {
    return Array.isArray(aPayload?.excludeSeriesId);
};

/**
 * Returns the primary data-zoom payload regardless of whether ECharts sent it directly or inside `batch`.
 * Intent: Normalize the zoom payload shape before the range extraction logic reads it.
 * @param aDataZoomState The incoming data-zoom payload.
 * @returns The primary zoom payload object to inspect.
 */
const getPrimaryDataZoomState = (
    aDataZoomState:
        | EChartDataZoomEventPayload
        | EChartDataZoomOptionStateItem
        | undefined,
): EChartDataZoomEventItem | EChartDataZoomOptionStateItem | undefined => {
    if (!aDataZoomState) {
        return undefined;
    }

    return 'batch' in aDataZoomState ? aDataZoomState.batch[0] : aDataZoomState;
};

/**
 * Returns whether a live data-zoom payload exposes enough state to reconstruct a range.
 * Intent: Gate range reconstruction on the fields ECharts actually provided.
 * @param aDataZoomState The current live ECharts data-zoom state.
 * @returns Whether the payload contains a complete zoom range.
 */
const hasExplicitDataZoomRange = (
    aDataZoomState:
        | EChartDataZoomEventPayload
        | EChartDataZoomOptionStateItem
        | undefined,
): boolean => {
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
 * Displays the main panel graph and its navigator/scroll area.
 * Intent: Keep the chart shell in sync with panel state without rebuilding live interaction state.
 * @param props The chart refs, state, and callbacks used to drive the panel chart.
 * @returns The rendered ECharts panel, or `null` while navigator data is unavailable.
 */
const TimeSeriesChart = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: Pick<PanelState, 'isRaw' | 'isDragSelectActive' | 'isHighlightActive'>;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
}) => {
    const sChartRef = useRef<ChartWrapperHandle | null>(null);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sLatestPanelRangeRef = useRef<TimeRangeMs>(pNavigateState.panelRange);
    const sLastZoomRangeRef = useRef<TimeRangeMs>(pNavigateState.panelRange);
    const sAppliedZoomRangeRef = useRef<TimeRangeMs | undefined>(undefined);
    const sSkipNextPanelRangeSyncRef = useRef(false);
    const sReadyChartInstanceRef = useRef<ChartInstance | undefined>(undefined);
    const sIsSelectionMode = pPanelState.isDragSelectActive || pPanelState.isHighlightActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;
    const sAxesOptionKey = JSON.stringify(pChartState.axes);
    const sDisplayOptionKey = JSON.stringify(pChartState.display);
    const sStableAxesRef = useRef(pChartState.axes);
    const sStableAxesKeyRef = useRef(sAxesOptionKey);
    const sStableDisplayRef = useRef(pChartState.display);
    const sStableDisplayKeyRef = useRef(sDisplayOptionKey);
    if (sStableAxesKeyRef.current !== sAxesOptionKey) {
        sStableAxesKeyRef.current = sAxesOptionKey;
        sStableAxesRef.current = pChartState.axes;
    }
    if (sStableDisplayKeyRef.current !== sDisplayOptionKey) {
        sStableDisplayKeyRef.current = sDisplayOptionKey;
        sStableDisplayRef.current = pChartState.display;
    }

    const sStableAxes = sStableAxesRef.current;
    const sStableDisplay = sStableDisplayRef.current;
    sLatestPanelRangeRef.current = pNavigateState.panelRange;

    /**
     * Reads the current ECharts instance without leaking the third-party ref shape elsewhere.
     * Intent: Keep the wrapper's imperative chart access isolated in one helper.
     * @returns The active ECharts instance, if the chart has mounted.
     */
    const getChartInstance = useCallback((): ChartInstance | undefined => {
        return sChartRef.current?.getEchartsInstance?.();
    }, []);

    /**
     * Resolves which saved highlight contains the requested client position.
     * Intent: Let the outer chart wrapper intercept highlight right clicks before the panel context menu opens.
     * @param aClientX The viewport x coordinate from the mouse event.
     * @param aClientY The viewport y coordinate from the mouse event.
     * @returns The matched highlight index, or `undefined` when the position is not inside a saved highlight.
     */
    const getHighlightIndexAtClientPosition = useCallback(
        (aClientX: number, aClientY: number): number | undefined => {
            const sChartRect = pChartRefs.areaChart.current?.getBoundingClientRect();
            const sInstance = getChartInstance();

            if (!sChartRect || !sInstance?.containPixel || !sInstance?.convertFromPixel) {
                return undefined;
            }

            const sPixelX = aClientX - sChartRect.left;
            const sPixelY = aClientY - sChartRect.top;
            if (
                !Number.isFinite(sPixelX) ||
                !Number.isFinite(sPixelY) ||
                !sInstance.containPixel({ gridIndex: 0 }, [sPixelX, sPixelY])
            ) {
                return undefined;
            }

            const sConvertedValue = sInstance.convertFromPixel(
                { xAxisIndex: 0 },
                [sPixelX, sPixelY],
            );
            const sTimeValue = Array.isArray(sConvertedValue)
                ? Number(sConvertedValue[0])
                : Number(sConvertedValue);

            if (!Number.isFinite(sTimeValue)) {
                return undefined;
            }

            return pChartState.highlights.findIndex(
                (aHighlight) =>
                    aHighlight.timeRange.startTime <= sTimeValue &&
                    sTimeValue <= aHighlight.timeRange.endTime,
            );
        },
        [getChartInstance, pChartRefs.areaChart, pChartState.highlights],
    );

    /**
     * Reads the live panel zoom window from the chart when ECharts exposes enough state for it.
     * Intent: Reuse live ECharts state before falling back to the last known React range.
     * @param aInstance The current ECharts instance, when already available.
     * @returns The live panel range from ECharts, or `undefined` when it cannot be reconstructed.
     */
    const getLivePanelRange = useCallback(
        (aInstance: ChartInstance | undefined): TimeRangeMs | undefined => {
            const sInstance = aInstance ?? getChartInstance();
            const sDataZoomState = getPrimaryDataZoomState(sInstance?.getOption?.()?.dataZoom?.[0]);
            if (!sDataZoomState || !hasExplicitDataZoomRange(sDataZoomState)) {
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
     * Intent: Make the brush cursor follow the panel's current interaction mode.
     * @param aInstance The current ECharts instance, when already available.
     * @returns Nothing.
     */
    const syncBrushInteraction = useCallback(
        (aInstance: ChartInstance | undefined) => {
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

                    brushMode: undefined,
                    xAxisIndex: undefined,
                },
            });
        },
        [getChartInstance, sIsBrushActive],
    );

    /**
     * Keeps the live chart zoom aligned with the current panel range without rebuilding the option.
     * Intent: Push visible-range updates imperatively so the React option tree stays stable.
     * @param aRange The panel range that should be visible in the live chart.
     * @param aInstance The current ECharts instance, when already available.
     * @param aForce Whether the range should be re-applied even when we already know the chart is at that window.
     * @returns Nothing.
     */
    const syncPanelRange = useCallback(
        (aRange: TimeRangeMs, aInstance: ChartInstance | undefined, aForce = false) => {
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

            if (
                !aForce &&
                sAppliedZoomRangeRef.current &&
                isSameTimeRange(sAppliedZoomRangeRef.current, aRange)
            ) {
                return;
            }

            const sLiveRange =
                !aForce && !sAppliedZoomRangeRef.current ? getLivePanelRange(sInstance) : undefined;
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
                syncPanelRange(aRange, undefined, undefined);
            },
            getVisibleSeries: () =>
                buildVisibleSeriesList(pNavigateState.chartData, sVisibleSeriesRef.current),
            getHighlightIndexAtClientPosition,
        };

        pChartRefs.chartWrap.current = sHandle;
    }, [
        getHighlightIndexAtClientPosition,
        pChartRefs.chartWrap,
        pNavigateState.chartData,
        syncPanelRange,
    ]);

    const sOption = useMemo(
        () =>
            buildChartOption(
                pNavigateState.chartData,
                pNavigateState.navigatorRange,
                sStableAxes,
                sStableDisplay,
                pPanelState.isRaw,
                pChartState.useNormalize,
                sVisibleSeries,
                pNavigateState.navigatorChartData,
                undefined,
                pChartState.highlights,
            ),
        [
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
            pChartState.highlights,
            sStableAxes,
            sStableDisplay,
            sVisibleSeries,
        ],
    );

    /**
     * Applies the temporary legend-hover series styling directly on the ECharts instance
     * so transient hover does not rebuild the full React option tree.
     * Intent: Keep legend hover feedback instantaneous without changing the structural option.
     * @param aHoveredLegendSeries The legend series currently under the pointer.
     * @param aForce Whether to re-apply the current hover styling after a structural option refresh.
     * @returns Nothing.
     */
    const applyLegendHoverState = useCallback(
        (aHoveredLegendSeries: string | undefined, aForce = false) => {
            const sKnownSeriesNames = new Set(
                [...pNavigateState.chartData, ...pNavigateState.navigatorChartData].map(
                    (aSeries) => aSeries.name,
                ),
            );
            const sNextHoveredLegendSeries =
                aHoveredLegendSeries && sKnownSeriesNames.has(aHoveredLegendSeries)
                    ? aHoveredLegendSeries
                    : undefined;

            if (!aForce && sHoveredLegendSeriesRef.current === sNextHoveredLegendSeries) {
                return;
            }

            sHoveredLegendSeriesRef.current = sNextHoveredLegendSeries;

            const sInstance = getChartInstance();
            if (!sInstance?.setOption) {
                return;
            }

            sInstance.setOption(
                buildChartSeriesOption(
                    pNavigateState.chartData,
                    pChartState.display,
                    pChartState.axes,
                    pNavigateState.navigatorChartData,
                    sNextHoveredLegendSeries,
                    pChartState.highlights,
                    pNavigateState.navigatorRange,
                    pPanelState.isRaw,
                    pChartState.useNormalize,
                ),
                { lazyUpdate: true },
            );
        },
        [
            getChartInstance,
            pChartState.axes,
            pChartState.display,
            pChartState.highlights,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
            pNavigateState.navigatorRange,
        ],
    );

    useEffect(() => {
        // `notMerge` replaces the option tree, so re-apply the brush cursor after chart option updates.
        syncBrushInteraction(undefined);
        syncPanelRange(sLastZoomRangeRef.current, undefined, true);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }, [applyLegendHoverState, sOption, syncBrushInteraction, syncPanelRange]);

    useEffect(() => {
        syncPanelRange(pNavigateState.panelRange, undefined, undefined);
    }, [pNavigateState.panelRange, syncPanelRange]);

    const sOnEvents = useMemo(
        () => ({
            // Resolves lower navigator-slider drags back into the concrete visible panel range.
            datazoom: (aParams: EChartDataZoomEventPayload) => {
                const sInstance = getChartInstance();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];
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
                    trigger: 'navigator',
                });
            },
            // Commits the selected brush range only after the user releases the drag.
            brushEnd: (aParams: EChartBrushPayload) => {
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

                        trigger: undefined,
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
            legendselectchanged: (aParams: ChartLegendChangePayload) => {
                sVisibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
            // Applies temporary single-series emphasis only while the pointer sits on a legend item.
            highlight: (aParams: ChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(aParams.seriesName ?? aParams.name ?? undefined);
            },
            // Restores the normal multi-series view when the legend hover ends.
            downplay: (aParams: ChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(undefined);
            },
            // Opens highlight rename only when the dedicated highlight label series is clicked.
            click: (aParams: ChartClickPayload) => {
                const sHighlightIndex = Number(aParams.dataIndex);

                if (
                    pPanelState.isHighlightActive ||
                    aParams.seriesId !== HIGHLIGHT_LABEL_SERIES_ID ||
                    !Number.isInteger(sHighlightIndex) ||
                    sHighlightIndex < 0
                ) {
                    return;
                }

                const sChartRect = pChartRefs.areaChart.current?.getBoundingClientRect();
                const sClientX = aParams.event?.event?.clientX ?? sChartRect?.left ?? 0;
                const sClientY = aParams.event?.event?.clientY ?? sChartRect?.top ?? 0;

                pChartHandlers.onOpenHighlightRename({
                    highlightIndex: sHighlightIndex,
                    position: {
                        x: sClientX,
                        y: sClientY,
                    },
                });
            },
        }),
        [
            applyLegendHoverState,
            getChartInstance,
            pChartHandlers,
            pChartRefs.areaChart,
            pChartState.highlights,
            pNavigateState.navigatorRange,
            pNavigateState.panelRange,
            pPanelState.isHighlightActive,
            sIsDragZoomEnabled,
            sIsSelectionMode,
        ],
    );

    /**
     * Reconnects brush mode and zoom state after the ECharts instance becomes available.
     * Intent: Restore imperative chart state whenever the chart ref mounts or refreshes.
     * @param aInstance The newly ready ECharts instance.
     * @returns Nothing.
     */
    const handleChartReady = useCallback(
        (aInstance: ChartInstance) => {
            const sShouldForceSync = sReadyChartInstanceRef.current !== aInstance;
            sReadyChartInstanceRef.current = aInstance;
            syncBrushInteraction(aInstance);
            syncPanelRange(sLatestPanelRangeRef.current, aInstance, sShouldForceSync);
            if (sHoveredLegendSeriesRef.current) {
                applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, syncBrushInteraction, syncPanelRange],
    );

    return (
        <ReactECharts
            ref={(aChart) => {
                sChartRef.current = aChart as unknown as ChartWrapperHandle | null;
            }}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={(aInstance) => {
                handleChartReady(aInstance as unknown as ChartInstance);
            }}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default TimeSeriesChart;

