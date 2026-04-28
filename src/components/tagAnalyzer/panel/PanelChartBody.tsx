import ReactECharts from 'echarts-for-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type { PanelChartInfo } from '../chart/ChartInfoTypes';
import {
    extractDataZoomOptionRange,
    hasExplicitDataZoomOptionRange,
} from '../chart/chartInternal/ChartDataZoomUtils';
import { getHighlightIndexAtClientPosition } from '../chart/chartInternal/ChartHighlightHitTesting';
import { buildPanelChartEvents } from '../chart/chartInternal/PanelChartEventHandlers';
import type {
    PanelChartInstance,
    PanelChartWrapperHandle,
} from '../chart/chartInternal/PanelChartRuntimeTypes';
import {
    buildChartOption,
    buildChartSeriesOption,
} from '../chart/options/ChartOptionBuilder';
import {
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
} from '../chart/options/ChartLegendVisibility';
import { PANEL_CHART_HEIGHT } from '../chart/options/OptionBuildHelpers/ChartOptionConstants';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import {
    SelectionSummaryPopover,
    type SelectionSummaryState,
} from './modal/SelectionSummaryPopover';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from './PanelTypes';
import type { PanelSeriesDefinition } from '../utils/series/PanelSeriesTypes';
import { buildSeriesSummaryRows } from '../utils/series/SelectedRangeSeriesSummaryBuilder';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';

const INITIAL_SELECTION_SUMMARY_STATE: SelectionSummaryState = {
    isOpen: false,
    startTime: 0,
    endTime: 0,
    seriesSummaries: [],
    menuPosition: { x: 0, y: 0 },
};

function useStableChartOptionValue<T>(value: T) {
    const sValueKey = JSON.stringify(value);
    const sValueRef = useRef(value);
    const sValueKeyRef = useRef(sValueKey);

    if (sValueKeyRef.current !== sValueKey) {
        sValueKeyRef.current = sValueKey;
        sValueRef.current = value;
    }

    return sValueRef.current;
}

const PanelChartBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
    pTagSet,
    pOnDragSelectStateChange,
    pOnHighlightSelection,
    pOnFftSelectionChange,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pShiftHandlers: PanelShiftHandlers;
    pTagSet: PanelSeriesDefinition[];
    pOnDragSelectStateChange: (isDragSelectActive: boolean) => void;
    pOnHighlightSelection: (startTime: number, endTime: number) => void;
    pOnFftSelectionChange?: (selection: FFTSelectionPayload | undefined) => void;
}) => {
    const sChartWrapperRef = useRef<PanelChartWrapperHandle | null>(null);
    const sReadyChartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sLatestPanelRangeRef = useRef<TimeRangeMs>(pNavigateState.panelRange);
    const sLastZoomRangeRef = useRef<TimeRangeMs>(pNavigateState.panelRange);
    const sAppliedZoomRangeRef = useRef<TimeRangeMs | undefined>(undefined);
    const sSkipNextPanelRangeSyncRef = useRef(false);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [selectionState, setSelectionState] = useState<SelectionSummaryState>(
        INITIAL_SELECTION_SUMMARY_STATE,
    );
    const sBaseChartInfo = useMemo<PanelChartInfo>(
        () => ({
            mainSeriesData: pNavigateState.chartData,
            seriesDefinitions: pChartState.seriesList,
            navigatorRange: pNavigateState.navigatorRange,
            axes: pChartState.axes,
            display: pChartState.display,
            isRaw: pPanelState.isRaw,
            useNormalize: pChartState.useNormalize,
            visibleSeries: {},
            navigatorSeriesData: pNavigateState.navigatorChartData,
            highlights: pChartState.highlights,
        }),
        [
            pChartState.axes,
            pChartState.display,
            pChartState.highlights,
            pChartState.seriesList,
            pChartState.useNormalize,
            pNavigateState.chartData,
            pNavigateState.navigatorChartData,
            pNavigateState.navigatorRange,
            pPanelState.isRaw,
        ],
    );
    useEffect(() => {
        if (!pPanelState.isDragSelectActive) {
            setSelectionState(INITIAL_SELECTION_SUMMARY_STATE);
            pOnFftSelectionChange?.(undefined);
        }
    }, [pOnFftSelectionChange, pPanelState.isDragSelectActive]);

    const handleSelection = useCallback(
        (event: { min?: number; max?: number }) => {
            if (event.min === undefined || event.max === undefined) {
                return false;
            }

            if (pPanelState.isHighlightActive) {
                pOnHighlightSelection(Math.floor(event.min), Math.ceil(event.max));
                return false;
            }

            const sSeriesSummaries = buildSeriesSummaryRows(
                pNavigateState.chartData,
                pTagSet,
                event.min,
                event.max,
            );
            if (isEmpty(sSeriesSummaries)) {
                Toast.error('There is no data in the selected area.', undefined);
                return false;
            }

            const sStartTime = Math.floor(event.min);
            const sEndTime = Math.ceil(event.max);
            const sRect = pChartRefs.areaChart.current?.getBoundingClientRect();
            const sMenuPosition = sRect
                ? { x: sRect.left - 90, y: sRect.top - 35 }
                : { x: 10, y: 10 };

            setSelectionState({
                isOpen: true,
                startTime: sStartTime,
                endTime: sEndTime,
                seriesSummaries: sSeriesSummaries,
                menuPosition: sMenuPosition,
            });
            pOnDragSelectStateChange(true);
            pOnFftSelectionChange?.({
                startTime: sStartTime,
                endTime: sEndTime,
                seriesSummaries: sSeriesSummaries,
            });
            return false;
        },
        [
            pChartRefs.areaChart,
            pNavigateState.chartData,
            pOnDragSelectStateChange,
            pOnFftSelectionChange,
            pOnHighlightSelection,
            pPanelState.isHighlightActive,
            pTagSet,
        ],
    );

    const handleCloseSelection = useCallback(() => {
        setSelectionState(INITIAL_SELECTION_SUMMARY_STATE);
        pOnDragSelectStateChange(false);
        pOnFftSelectionChange?.(undefined);
    }, [pOnDragSelectStateChange, pOnFftSelectionChange]);

    const sChartHandlers = useMemo<PanelChartHandlers>(
        () => ({
            ...pChartHandlers,
            onSelection: handleSelection,
        }),
        [handleSelection, pChartHandlers],
    );
    const sIsSelectionMode =
        pPanelState.isDragSelectActive || pPanelState.isHighlightActive;
    const sStableBaseChartInfo = useStableChartOptionValue(sBaseChartInfo);
    const sStableAxes = useStableChartOptionValue(sStableBaseChartInfo.axes);
    const sStableDisplay = useStableChartOptionValue(sStableBaseChartInfo.display);
    const sIsDragZoomEnabled =
        sStableBaseChartInfo.display.use_zoom && !sIsSelectionMode;
    const sIsBrushActive =
        sIsSelectionMode || sStableBaseChartInfo.display.use_zoom;
    sLatestPanelRangeRef.current = pNavigateState.panelRange;

    const setChartWrapper = useCallback((chart: unknown) => {
        sChartWrapperRef.current = chart as PanelChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback(
        (): PanelChartInstance | undefined => sChartWrapperRef.current?.getEchartsInstance?.(),
        [],
    );

    useEffect(() => {
        sLastZoomRangeRef.current = pNavigateState.panelRange;
    }, [pNavigateState.panelRange]);

    const getLivePanelRange = useCallback(
        (instance: PanelChartInstance | undefined): TimeRangeMs | undefined => {
            const sInstance = instance ?? getChartInstance();
            const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0];

            if (!sDataZoomState || !hasExplicitDataZoomOptionRange(sDataZoomState)) {
                return undefined;
            }

            return extractDataZoomOptionRange(
                sDataZoomState,
                pNavigateState.panelRange,
                pNavigateState.navigatorRange,
            );
        },
        [getChartInstance, pNavigateState.navigatorRange, pNavigateState.panelRange],
    );

    const syncPanelRange = useCallback(
        (
            range: TimeRangeMs,
            instance: PanelChartInstance | undefined,
            force = false,
        ) => {
            const sInstance = instance ?? getChartInstance();

            if (!sInstance) {
                return;
            }

            const sAppliedZoomRange = sAppliedZoomRangeRef.current;

            if (!force && sAppliedZoomRange && isSameTimeRange(sAppliedZoomRange, range)) {
                if (sSkipNextPanelRangeSyncRef.current) {
                    sSkipNextPanelRangeSyncRef.current = false;
                }
                return;
            }

            const sLiveRange =
                !force && !sAppliedZoomRange ? getLivePanelRange(sInstance) : undefined;

            if (sLiveRange && isSameTimeRange(sLiveRange, range)) {
                sAppliedZoomRangeRef.current = range;
                return;
            }

            sLastZoomRangeRef.current = range;
            sAppliedZoomRangeRef.current = range;
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

    const applyLegendHoverState = useCallback(
        (hoveredLegendSeries: string | undefined, force = false) => {
            const sNextHoveredLegendSeries =
                hoveredLegendSeries &&
                [
                    ...sStableBaseChartInfo.mainSeriesData,
                    ...sStableBaseChartInfo.navigatorSeriesData,
                ].some((series) => series.name === hoveredLegendSeries)
                    ? hoveredLegendSeries
                    : undefined;

            if (!force && sHoveredLegendSeriesRef.current === sNextHoveredLegendSeries) {
                return;
            }

            sHoveredLegendSeriesRef.current = sNextHoveredLegendSeries;

            const sInstance = getChartInstance();

            if (!sInstance?.setOption) {
                return;
            }

            const sHoveredChartInfo: PanelChartInfo = {
                ...sStableBaseChartInfo,
                visibleSeries: sVisibleSeriesRef.current,
                hoveredLegendSeries: sNextHoveredLegendSeries,
            };

            sInstance.setOption(buildChartSeriesOption(sHoveredChartInfo), {
                lazyUpdate: true,
            });
        },
        [getChartInstance, sStableBaseChartInfo],
    );

    useEffect(() => {
        pChartRefs.chartWrap.current = {
            setPanelRange: (range) => syncPanelRange(range, undefined),
            getVisibleSeries: () =>
                buildVisibleSeriesList(
                    sStableBaseChartInfo.mainSeriesData,
                    sVisibleSeriesRef.current,
                ),
            getHighlightIndexAtClientPosition: (clientX, clientY) =>
                getHighlightIndexAtClientPosition({
                    areaChartRef: pChartRefs.areaChart,
                    chartInstance: getChartInstance(),
                    highlights: sStableBaseChartInfo.highlights,
                    clientX,
                    clientY,
                }),
        };
    }, [
        getChartInstance,
        pChartRefs.areaChart,
        pChartRefs.chartWrap,
        sStableBaseChartInfo.highlights,
        sStableBaseChartInfo.mainSeriesData,
        syncPanelRange,
    ]);

    const handleChartReady = useCallback(
        (instance: PanelChartInstance) => {
            const sShouldForceSync = sReadyChartInstanceRef.current !== instance;

            sReadyChartInstanceRef.current = instance;
            syncBrushInteraction(instance);
            syncPanelRange(sLatestPanelRangeRef.current, instance, sShouldForceSync);
            if (sHoveredLegendSeriesRef.current) {
                applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, syncBrushInteraction, syncPanelRange],
    );

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(sStableBaseChartInfo.mainSeriesData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [sStableBaseChartInfo.mainSeriesData]);

    const sChartInfo = useMemo<PanelChartInfo>(
        () => ({
            ...sStableBaseChartInfo,
            axes: sStableAxes,
            display: sStableDisplay,
            visibleSeries: sVisibleSeries,
        }),
        [sStableAxes, sStableBaseChartInfo, sStableDisplay, sVisibleSeries],
    );
    const sOption = useMemo(() => buildChartOption(sChartInfo), [sChartInfo]);
    const sChartSync = useMemo(
        () => ({
            getChartInstance: getChartInstance,
            lastZoomRangeRef: sLastZoomRangeRef,
            appliedZoomRangeRef: sAppliedZoomRangeRef,
            skipNextPanelRangeSyncRef: sSkipNextPanelRangeSyncRef,
            applyLegendHoverState: applyLegendHoverState,
            setVisibleSeries: setVisibleSeries,
            visibleSeriesRef: sVisibleSeriesRef,
        }),
        [applyLegendHoverState, getChartInstance],
    );

    useEffect(() => {
        syncBrushInteraction(undefined);
        syncPanelRange(sLastZoomRangeRef.current, undefined, true);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }, [applyLegendHoverState, sOption, syncBrushInteraction, syncPanelRange]);

    useEffect(() => {
        syncPanelRange(pNavigateState.panelRange, undefined);
    }, [pNavigateState.panelRange, syncPanelRange]);

    const sOnEvents = useMemo(
        () =>
            buildPanelChartEvents({
                chartSync: sChartSync,
                navigateState: pNavigateState,
                panelState: pPanelState,
                chartRefs: pChartRefs,
                chartHandlers: sChartHandlers,
                isSelectionMode: sIsSelectionMode,
                isDragZoomEnabled: sIsDragZoomEnabled,
            }),
        [
            pChartRefs,
            pNavigateState,
            pPanelState,
            sChartHandlers,
            sChartSync,
            sIsDragZoomEnabled,
            sIsSelectionMode,
        ],
    );

    function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>) {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeLeft}
                />
                <div
                    className="chart-body"
                    ref={pChartRefs.areaChart}
                    onMouseDownCapture={handleChartMouseDownCapture}
                >
                    <ReactECharts
                        ref={setChartWrapper}
                        option={sOption}
                        onEvents={sOnEvents}
                        onChartReady={(instance) => {
                            handleChartReady(instance as unknown as PanelChartInstance);
                        }}
                        notMerge
                        lazyUpdate
                        style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
                        opts={{ renderer: 'canvas' }}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeRight}
                />
            </div>
            <SelectionSummaryPopover
                selectionState={selectionState}
                onClose={handleCloseSelection}
            />
        </>
    );
};

export default PanelChartBody;
