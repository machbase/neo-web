import ReactECharts from 'echarts-for-react';
import {
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type MouseEvent,
} from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import type { ChartInfo } from '../chart/ChartTypes';
import {
    extractDataZoomOptionRange,
    hasExplicitDataZoomOptionRange,
} from '../chart/chartInternal/ChartDataZoomUtils';
import { getHighlightIndexAtClientPosition } from '../chart/chartInternal/ChartHighlightHitTesting';
import { buildPanelChartEvents } from '../chart/chartInternal/PanelChartEventHandlers';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventClientPosition,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
} from '../chart/chartInternal/PanelChartPointerUtils';
import type {
    PanelChartBlankClickPayload,
    PanelChartInstance,
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
import PanelChartInteractionHint, {
    type PanelChartInteractionHintMode,
} from './PanelChartInteractionHint';
import type {
    PanelChartHandle,
    PanelChartState,
    PanelMarkupHandlers,
    PanelNavigateState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
    PanelRangeHandlers,
} from './PanelTypes';
import { buildSeriesSummaryRows } from '../chart/ChartSeriesSummaryBuilder';
import { isSameTimeRange } from '../time/TimeRangeUtils';
import type { ResolvedTimeRangeMs } from '../time/TimeTypes';
import { Button, Toast } from '@/design-system/components';
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

function useStableChartOption(chartInfo: ChartInfo) {
    const sOptionKey = JSON.stringify(chartInfo);
    const sOptionRef = useRef<ReturnType<typeof buildChartOption> | undefined>(
        undefined,
    );
    const sOptionKeyRef = useRef<string | undefined>(undefined);

    if (sOptionRef.current === undefined || sOptionKeyRef.current !== sOptionKey) {
        sOptionKeyRef.current = sOptionKey;
        sOptionRef.current = buildChartOption(chartInfo);
    }

    return sOptionRef.current;
}

function setEChartsLoadingState(
    instance: PanelChartInstance | undefined,
    isLoading: boolean,
) {
    if (!instance) {
        return;
    }

    if (isLoading) {
        instance.showLoading?.('default', {
            text: 'Loading...',
        });
        return;
    }

    instance.hideLoading?.();
}

const PanelChartBody = ({
    pChartAreaRef,
    pChartApiRef,
    pChartState,
    pIsRaw,
    pOverlayModeState,
    pOverlayModeActions,
    pNavigateState,
    pIsLoading,
    pRangeHandlers,
    pMarkupHandlers,
    pOnHighlightSelection,
    pOnFftSelectionChange,
}: {
    pChartAreaRef: MutableRefObject<HTMLDivElement | null>;
    pChartApiRef: MutableRefObject<PanelChartHandle | null>;
    pChartState: PanelChartState;
    pIsRaw: boolean;
    pOverlayModeState: PanelOverlayModeState;
    pOverlayModeActions: PanelOverlayModeActions;
    pNavigateState: PanelNavigateState;
    pIsLoading: boolean;
    pRangeHandlers: PanelRangeHandlers;
    pMarkupHandlers: PanelMarkupHandlers;
    pOnHighlightSelection: (startTime: number, endTime: number) => void;
    pOnFftSelectionChange?: (selection: FFTSelectionPayload | undefined) => void;
}) => {
    const sLastZoomRangeRef = useRef<ResolvedTimeRangeMs>(pNavigateState.panelRange);
    const sChartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sBlankClickListenerInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sBlankClickListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const sIsAnnotationActiveRef = useRef(pOverlayModeState.isAnnotationActive);
    const sOpenCreateAnnotationRef = useRef(pMarkupHandlers.onOpenCreateAnnotation);
    const sLatestHoverTimestampRef = useRef<number | undefined>(undefined);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [selectionState, setSelectionState] = useState<SelectionSummaryState>(
        INITIAL_SELECTION_SUMMARY_STATE,
    );
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >(undefined);
    const sBaseChartInfo = useStableChartOptionValue<ChartInfo>({
        mainSeriesData: pNavigateState.chartData,
        seriesDefinitions: pChartState.seriesList,
        navigatorRange: pNavigateState.navigatorRange,
        axes: pChartState.axes,
        display: pChartState.display,
        isRaw: pIsRaw,
        useNormalize: pChartState.useNormalize,
        visibleSeries: {},
        navigatorSeriesData: pNavigateState.navigatorChartData,
        highlights: pChartState.highlights,
    });
    sIsAnnotationActiveRef.current = pOverlayModeState.isAnnotationActive;
    sOpenCreateAnnotationRef.current = pMarkupHandlers.onOpenCreateAnnotation;

    useEffect(() => {
        if (!pOverlayModeState.isDragSelectActive) {
            setSelectionState(INITIAL_SELECTION_SUMMARY_STATE);
            pOnFftSelectionChange?.(undefined);
        }
    }, [pOnFftSelectionChange, pOverlayModeState.isDragSelectActive]);

    function handleSelection(event: { min?: number; max?: number }) {
        if (event.min === undefined || event.max === undefined) {
            return false;
        }

        if (pOverlayModeState.isHighlightActive) {
            pOnHighlightSelection(Math.floor(event.min), Math.ceil(event.max));
            pOverlayModeActions.onCloseHighlight();
            return false;
        }

        const sSeriesSummaries = buildSeriesSummaryRows(
            pNavigateState.chartData,
            pChartState.seriesList,
            event.min,
            event.max,
        );
        if (isEmpty(sSeriesSummaries)) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        const sStartTime = Math.floor(event.min);
        const sEndTime = Math.ceil(event.max);
        const sRect = pChartAreaRef.current?.getBoundingClientRect();
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
        pOverlayModeActions.onDragSelectStateChange(true);
        pOnFftSelectionChange?.({
            startTime: sStartTime,
            endTime: sEndTime,
            seriesSummaries: sSeriesSummaries,
        });
        return false;
    }

    function handleCloseSelection() {
        setSelectionState(INITIAL_SELECTION_SUMMARY_STATE);
        pOverlayModeActions.onDragSelectStateChange(false);
        pOnFftSelectionChange?.(undefined);
    }

    const sChartHandlers = {
        onPanelRangeChange: pRangeHandlers.onPanelRangeChange,
        onNavigatorRangeChange: pRangeHandlers.onNavigatorRangeChange,
        onSelection: handleSelection,
        onOpenCreateAnnotation: pMarkupHandlers.onOpenCreateAnnotation,
        onActivateHighlightEditor: pMarkupHandlers.onActivateHighlightEditor,
        onActivateAnnotationEditor: pMarkupHandlers.onActivateAnnotationEditor,
    };
    const sIsSelectionMode =
        pOverlayModeState.isDragSelectActive || pOverlayModeState.isHighlightActive;
    const sInteractionHintMode: PanelChartInteractionHintMode | undefined =
        pOverlayModeState.isAnnotationActive
            ? 'annotation'
            : pOverlayModeState.isHighlightActive
            ? 'highlight'
            : undefined;
    const sIsDragZoomEnabled =
        sBaseChartInfo.display.use_zoom &&
        !sIsSelectionMode &&
        !pOverlayModeState.isAnnotationActive;
    const sIsBrushActive =
        sIsSelectionMode || sIsDragZoomEnabled;

    function getChartInstance(): PanelChartInstance | undefined {
        return sChartInstanceRef.current;
    }

    useEffect(() => {
        sLastZoomRangeRef.current = pNavigateState.panelRange;
    }, [pNavigateState.panelRange]);

    function getLivePanelRange(
        instance: PanelChartInstance | undefined,
    ): ResolvedTimeRangeMs | undefined {
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
    }

    function syncPanelRange(
        range: ResolvedTimeRangeMs,
        instance: PanelChartInstance | undefined,
        force = false,
    ) {
        const sInstance = instance ?? getChartInstance();

        if (!sInstance) {
            return;
        }

        if (!force) {
            const sLiveRange = getLivePanelRange(sInstance);

            if (sLiveRange && isSameTimeRange(sLiveRange, range)) {
                sLastZoomRangeRef.current = range;
                return;
            }
        }

        sLastZoomRangeRef.current = range;
        sInstance.dispatchAction({
            type: 'dataZoom',
            startValue: range.startTime,
            endValue: range.endTime,
        });
    }

    function syncBrushInteraction(instance: PanelChartInstance | undefined) {
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
    }

    function removeBlankClickListener() {
        sBlankClickListenerCleanupRef.current?.();
        sBlankClickListenerCleanupRef.current = undefined;
        sBlankClickListenerInstanceRef.current = undefined;
    }

    function attachBlankClickListener(instance: PanelChartInstance) {
        if (
            sBlankClickListenerInstanceRef.current === instance &&
            sBlankClickListenerCleanupRef.current
        ) {
            return;
        }

        removeBlankClickListener();

        const sZr = instance.getZr?.();
        if (!sZr?.on || !sZr.off) {
            return;
        }

        function handleBlankChartClick(event: PanelChartBlankClickPayload) {
            if (!sIsAnnotationActiveRef.current || event.target) {
                return;
            }

            const sChartRect = pChartAreaRef.current?.getBoundingClientRect();
            const sPixel = getPanelChartEventPixel(event, sChartRect);
            const sClientPosition = getPanelChartEventClientPosition(event);

            if (!sPixel) {
                return;
            }

            const sIsInsideGrid = instance.containPixel
                ? instance.containPixel({ gridIndex: 0 }, sPixel)
                : true;

            if (!sIsInsideGrid) {
                return;
            }

            const sTimestamp = sLatestHoverTimestampRef.current ??
                convertPanelChartPixelToTimestamp(instance, sPixel).timestamp;

            if (sTimestamp === undefined) {
                return;
            }

            const sCreateRequest = {
                timestamp: sTimestamp,
                position: getPanelChartEventPosition(
                    event,
                    sChartRect,
                    sPixel,
                    sClientPosition,
                ),
            };

            sOpenCreateAnnotationRef.current(sCreateRequest);
        }

        sZr.on('click', handleBlankChartClick);
        sBlankClickListenerInstanceRef.current = instance;
        sBlankClickListenerCleanupRef.current = () =>
            sZr.off?.('click', handleBlankChartClick);
    }

    function applyLegendHoverState(
        hoveredLegendSeries: string | undefined,
        force = false,
    ) {
        const sNextHoveredLegendSeries =
            hoveredLegendSeries &&
            [
                ...sBaseChartInfo.mainSeriesData,
                ...sBaseChartInfo.navigatorSeriesData,
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

        const sHoveredChartInfo: ChartInfo = {
            ...sBaseChartInfo,
            visibleSeries: sVisibleSeriesRef.current,
            hoveredLegendSeries: sNextHoveredLegendSeries,
        };

        sInstance.setOption(buildChartSeriesOption(sHoveredChartInfo), {
            lazyUpdate: true,
        });
    }

    useEffect(() => {
        pChartApiRef.current = {
            setPanelRange: (range) => syncPanelRange(range, undefined),
            getVisibleSeries: () =>
                buildVisibleSeriesList(
                    sBaseChartInfo.mainSeriesData,
                    sVisibleSeriesRef.current,
                ),
            getHighlightIndexAtClientPosition: (clientX, clientY) =>
                getHighlightIndexAtClientPosition({
                    chartAreaRef: pChartAreaRef,
                    chartInstance: getChartInstance(),
                    highlights: sBaseChartInfo.highlights,
                    clientX,
                    clientY,
                }),
        };
    });

    function handleChartReady(instance: PanelChartInstance) {
        sChartInstanceRef.current = instance;
        attachBlankClickListener(instance);
        setEChartsLoadingState(instance, pIsLoading);
        syncBrushInteraction(instance);
        syncPanelRange(pNavigateState.panelRange, instance, true);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(sBaseChartInfo.mainSeriesData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [sBaseChartInfo.mainSeriesData]);

    const sChartInfo: ChartInfo = {
        ...sBaseChartInfo,
        visibleSeries: sVisibleSeries,
    };
    const sOption = useStableChartOption(sChartInfo);
    const sChartSync = {
        getChartInstance: getChartInstance,
        lastZoomRangeRef: sLastZoomRangeRef,
        applyLegendHoverState: applyLegendHoverState,
        setVisibleSeries: setVisibleSeries,
        visibleSeriesRef: sVisibleSeriesRef,
        latestHoverTimestampRef: sLatestHoverTimestampRef,
    };

    useEffect(() => {
        setEChartsLoadingState(sChartInstanceRef.current, pIsLoading);
    }, [pIsLoading]);

    useEffect(() => {
        return () => {
            sBlankClickListenerCleanupRef.current?.();
            sBlankClickListenerCleanupRef.current = undefined;
            sBlankClickListenerInstanceRef.current = undefined;
        };
    }, []);

    useEffect(() => {
        syncBrushInteraction(undefined);
        syncPanelRange(sLastZoomRangeRef.current, undefined, true);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }, [sIsBrushActive, sOption]);

    useEffect(() => {
        syncPanelRange(pNavigateState.panelRange, undefined);
    }, [pNavigateState.navigatorRange, pNavigateState.panelRange]);

    const sOnEvents = buildPanelChartEvents({
        chartSync: sChartSync,
        navigateState: pNavigateState,
        panelState: pOverlayModeState,
        chartAreaRef: pChartAreaRef,
        chartHandlers: sChartHandlers,
        isSelectionMode: sIsSelectionMode,
        isDragZoomEnabled: sIsDragZoomEnabled,
    });

    function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>) {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function handleChartMouseMove(event: MouseEvent<HTMLDivElement>) {
        if (!sInteractionHintMode) {
            return;
        }

        const sChartRect = event.currentTarget.getBoundingClientRect();

        setCursorHintPosition({
            x: event.clientX - sChartRect.left,
            y: event.clientY - sChartRect.top,
        });
    }

    useEffect(() => {
        if (!sInteractionHintMode) {
            setCursorHintPosition(undefined);
        }
    }, [sInteractionHintMode]);

    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pRangeHandlers.onShiftPanelRangeLeft}
                />
                <div
                    className="chart-body"
                    ref={pChartAreaRef}
                    onMouseDownCapture={handleChartMouseDownCapture}
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={() => setCursorHintPosition(undefined)}
                >
                    <PanelChartInteractionHint
                        pMode={sInteractionHintMode}
                        pPosition={cursorHintPosition}
                    />
                    <ReactECharts
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
                    onClick={pRangeHandlers.onShiftPanelRangeRight}
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
