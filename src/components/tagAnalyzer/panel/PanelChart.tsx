import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PANEL_CHART_HEIGHT } from './chartOptions/PanelChartOptionConstants';
import { buildPanelChartOption } from './chartOptions/PanelChartOptionBuilder';
import {
    buildPanelChartSeriesOption,
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
} from './chartOptions/PanelChartSeriesUtils';
import { extractBrushRange, extractDataZoomRange } from './chartOptions/PanelChartInteractionUtils';
import type {
    EChartBrushPayload,
    PanelDataZoomEventItem,
    PanelDataZoomEventPayload,
} from './chartOptions/PanelChartOptionTypes';
import type {
    PanelChartHandle,
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
} from './PanelModel';
import type { TimeRange } from '../common/modelTypes';
import { isSameTimeRange } from '../utils/TagAnalyzerDateUtils';

// Used by PanelChart to type brush option.
type PanelChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode: 'single' | undefined;
    xAxisIndex: number | undefined;
};

// Used by PanelChart to type action.
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

// Used by PanelChart to type option state.
type PanelChartOptionState = {
    dataZoom: PanelDataZoomEventItem[] | undefined;
};

// Used by PanelChart to type hover-only option patches.
type PanelChartSeriesOptionState = ReturnType<typeof buildPanelChartSeriesOption>;

// Used by PanelChart to type legend change payload.
type PanelChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

// Used by PanelChart to type legend hover payload.
type PanelChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

// Used by PanelChart to type instance.
type PanelChartInstance = {
    dispatchAction: (aAction: PanelChartAction) => void;
    getOption: (() => PanelChartOptionState) | undefined;
    setOption:
        | ((aOption: PanelChartSeriesOptionState, aOptions?: { lazyUpdate?: boolean }) => void)
        | undefined;
};

// Used by PanelChart to type wrapper handle.
type PanelChartWrapperHandle = {
    getEchartsInstance: () => PanelChartInstance;
};

/**
 * Returns whether a highlight/downplay payload came from legend hover actions.
 * Legend-originated payloads include `excludeSeriesId`, while ordinary line hover payloads do not.
 * @param aPayload The incoming ECharts highlight/downplay payload.
 * @returns Whether the payload was dispatched by legend hover behavior.
 */
const isLegendHoverPayload = (
    aPayload: PanelChartHighlightPayload | undefined,
): aPayload is PanelChartHighlightPayload & { excludeSeriesId: string[] } => {
    return Array.isArray(aPayload?.excludeSeriesId);
};

/**
 * Returns the primary data-zoom payload regardless of whether ECharts sent it directly or inside `batch`.
 * @param aDataZoomState The incoming data-zoom payload.
 * @returns The primary zoom payload object to inspect.
 */
const getPrimaryDataZoomState = (
    aDataZoomState: PanelDataZoomEventPayload | PanelDataZoomEventItem | undefined,
): PanelDataZoomEventItem | undefined => {
    if (!aDataZoomState) {
        return undefined;
    }

    return 'batch' in aDataZoomState ? aDataZoomState.batch?.[0] ?? aDataZoomState : aDataZoomState;
};

/**
 * Returns whether a live data-zoom payload exposes enough state to reconstruct a range.
 * @param aDataZoomState The current live ECharts data-zoom state.
 * @returns Whether the payload contains a complete zoom range.
 */
const hasExplicitDataZoomRange = (
    aDataZoomState: PanelDataZoomEventPayload | PanelDataZoomEventItem | undefined,
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
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: { isRaw: boolean; isDragSelectActive: boolean };
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
}) => {
    const sChartRef = useRef<PanelChartWrapperHandle | null>(null);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sLatestPanelRangeRef = useRef<TimeRange>(pNavigateState.panelRange);
    const sLastZoomRangeRef = useRef<TimeRange>(pNavigateState.panelRange);
    const sAppliedZoomRangeRef = useRef<TimeRange | undefined>(undefined);
    const sSkipNextPanelRangeSyncRef = useRef(false);
    const sReadyChartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sIsSelectionMode = pPanelState.isDragSelectActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;
    const sAxesOptionKey = JSON.stringify(pChartState.axes);
    const sDisplayOptionKey = JSON.stringify(pChartState.display);
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
        (aInstance: PanelChartInstance | undefined): TimeRange | undefined => {
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
     * @param aInstance The current ECharts instance, when already available.
     * @returns Nothing.
     */
    const syncBrushInteraction = useCallback(
        (aInstance: PanelChartInstance | undefined) => {
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
     * @param aRange The panel range that should be visible in the live chart.
     * @param aInstance The current ECharts instance, when already available.
     * @param aForce Whether the range should be re-applied even when we already know the chart is at that window.
     * @returns Nothing.
     */
    const syncPanelRange = useCallback(
        (aRange: TimeRange, aInstance: PanelChartInstance | undefined, aForce = false) => {
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
        };

        pChartRefs.chartWrap.current = sHandle;
    }, [pChartRefs.chartWrap, pNavigateState.chartData, syncPanelRange]);

    const sOption = useMemo(
        () =>
            buildPanelChartOption(
                pNavigateState.chartData,
                pNavigateState.navigatorRange,
                pChartState.axes,
                pChartState.display,
                pPanelState.isRaw,
                pChartState.useNormalize,
                sVisibleSeries,
                pNavigateState.navigatorChartData,
            ),
        [
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
            sAxesOptionKey,
            sDisplayOptionKey,
            sVisibleSeries,
        ],
    );

    /**
     * Applies the temporary legend-hover series styling directly on the ECharts instance
     * so transient hover does not rebuild the full React option tree.
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
                buildPanelChartSeriesOption(
                    pNavigateState.chartData,
                    pChartState.display,
                    pChartState.axes,
                    pNavigateState.navigatorChartData,
                    sNextHoveredLegendSeries,
                ),
                { lazyUpdate: true },
            );
        },
        [
            getChartInstance,
            pChartState.axes,
            pChartState.display,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
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
            datazoom: (aParams: PanelDataZoomEventPayload) => {
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
            legendselectchanged: (aParams: PanelChartLegendChangePayload) => {
                sVisibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
            // Applies temporary single-series emphasis only while the pointer sits on a legend item.
            highlight: (aParams: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(aParams.seriesName ?? aParams.name ?? undefined);
            },
            // Restores the normal multi-series view when the legend hover ends.
            downplay: (aParams: PanelChartHighlightPayload) => {
                if (!isLegendHoverPayload(aParams)) {
                    return;
                }

                applyLegendHoverState(undefined);
            },
        }),
        [
            applyLegendHoverState,
            getChartInstance,
            pChartHandlers,
            pNavigateState.navigatorRange,
            pNavigateState.panelRange,
            sIsDragZoomEnabled,
            sIsSelectionMode,
        ],
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
            if (sHoveredLegendSeriesRef.current) {
                applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, syncBrushInteraction, syncPanelRange],
    );

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
