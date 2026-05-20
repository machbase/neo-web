import ReactECharts from 'echarts-for-react';
import {
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type MouseEvent,
} from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import type { ChartInfo } from './ChartTypes';
import { getHighlightIndexAtClientPosition } from './chartInternal/ChartHighlightHitTesting';
import { buildPanelChartEvents } from './chartInternal/PanelChartEventHandlers';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventClientPosition,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
} from './chartInternal/PanelChartPointerUtils';
import type {
    PanelChartBlankClickPayload,
    PanelChartInstance,
} from './chartInternal/PanelChartRuntimeTypes';
import {
    buildChartOption,
    buildChartSeriesOption,
} from './options/ChartOptionBuilder';
import { PANEL_CHART_HEIGHT } from '../domain/ChartConstants';
import type {
    PanelChartHandle,
    PanelChartState,
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
} from '../domain/PanelChartModel';
import type { ChartSeriesData } from '../domain/ChartDataModel';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { Button } from '@/design-system/components';
import { usePanelChartInstanceSync } from './chartBody/usePanelChartInstanceSync';

type PanelChartInteractionHintMode = 'annotation' | 'highlight';

const PANEL_CHART_INTERACTION_HINT_TEXT: Record<
    PanelChartInteractionHintMode,
    string
> = {
    annotation: 'Click to create annotation',
    highlight: 'Drag to create highlight',
};

function isChartSeriesVisible(
    visibleSeries: Record<string, boolean>,
    seriesName: string,
) {
    return visibleSeries[seriesName] !== false;
}

function buildDefaultVisibleSeriesMap(chartData: ChartInfo['mainSeriesData']) {
    return Object.fromEntries(chartData.map((series) => [series.name, true]));
}

function buildVisibleSeriesList(
    chartData: ChartInfo['mainSeriesData'],
    visibleSeries: Record<string, boolean>,
) {
    return chartData.map((series) => ({
        name: series.name,
        visible: isChartSeriesVisible(visibleSeries, series.name),
    }));
}

function PanelChartInteractionHint({
    mode,
    position,
}: {
    mode: PanelChartInteractionHintMode | undefined;
    position: { x: number; y: number } | undefined;
}) {
    if (!mode || !position) {
        return null;
    }

    return (
        <span
            className="panel-chart-interaction-hint"
            style={{
                left: position.x + 14,
                top: Math.max(6, position.y - 34),
            }}
        >
            {PANEL_CHART_INTERACTION_HINT_TEXT[mode]}
        </span>
    );
}

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

const PanelChartBody = ({
    pChartAreaRef,
    pChartApiRef,
    pChartState,
    pIsRaw,
    pOverlayMode,
    pChartData,
    pNavigatorChartData,
    pPanelRange,
    pNavigatorRange,
    pIsLoading,
    pRangeHandlers,
    pMarkupHandlers,
    pOnSelection,
}: {
    pChartAreaRef: MutableRefObject<HTMLDivElement | null>;
    pChartApiRef: MutableRefObject<PanelChartHandle | null>;
    pChartState: PanelChartState;
    pIsRaw: boolean;
    pOverlayMode: PanelOverlayMode;
    pChartData: ChartSeriesData[];
    pNavigatorChartData: ChartSeriesData[];
    pPanelRange: TimeRangeMs;
    pNavigatorRange: TimeRangeMs;
    pIsLoading: boolean;
    pRangeHandlers: PanelRangeHandlers;
    pMarkupHandlers: PanelMarkupHandlers;
    pOnSelection: (event: PanelBrushSelectionEvent) => unknown;
}) => {
    const sBlankClickListenerInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sBlankClickListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const sIsAnnotationActiveRef = useRef(pOverlayMode === 'annotation');
    const sOpenCreateAnnotationRef = useRef(pMarkupHandlers.onOpenCreateAnnotation);
    const sLatestHoverTimestampRef = useRef<number | undefined>(undefined);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >(undefined);
    const sNavigateRangeState = {
        panelRange: pPanelRange,
        navigatorRange: pNavigatorRange,
    };
    const sBaseChartInfo = useStableChartOptionValue<ChartInfo>({
        mainSeriesData: pChartData,
        seriesDefinitions: pChartState.seriesList,
        panelRange: pPanelRange,
        navigatorRange: pNavigatorRange,
        axes: pChartState.axes,
        display: pChartState.display,
        isRaw: pIsRaw,
        useNormalize: pChartState.useNormalize,
        visibleSeries: {},
        navigatorSeriesData: pNavigatorChartData,
        highlights: pChartState.highlights,
    });
    sIsAnnotationActiveRef.current = pOverlayMode === 'annotation';
    sOpenCreateAnnotationRef.current = pMarkupHandlers.onOpenCreateAnnotation;

    const sChartHandlers = {
        onPanelRangeChange: pRangeHandlers.onPanelRangeChange,
        onNavigatorRangeChange: pRangeHandlers.onNavigatorRangeChange,
        onSelection: pOnSelection,
        onOpenCreateAnnotation: pMarkupHandlers.onOpenCreateAnnotation,
        onActivateHighlightEditor: pMarkupHandlers.onActivateHighlightEditor,
        onActivateAnnotationEditor: pMarkupHandlers.onActivateAnnotationEditor,
    };
    const sIsSelectionMode =
        pOverlayMode === 'dragSelect' || pOverlayMode === 'highlight';
    const sInteractionHintMode: PanelChartInteractionHintMode | undefined =
        pOverlayMode === 'annotation'
            ? 'annotation'
            : pOverlayMode === 'highlight'
            ? 'highlight'
            : undefined;
    const sIsDragZoomEnabled =
        sBaseChartInfo.display.use_zoom &&
        !sIsSelectionMode &&
        pOverlayMode !== 'annotation';
    const sIsBrushActive =
        sIsSelectionMode || sIsDragZoomEnabled;

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

            sOpenCreateAnnotationRef.current(
                getPanelChartEventPosition(
                    event,
                    sChartRect,
                    sPixel,
                    sClientPosition,
                ),
                undefined,
                sTimestamp,
            );
        }

        sZr.on('click', handleBlankChartClick);
        sBlankClickListenerInstanceRef.current = instance;
        sBlankClickListenerCleanupRef.current = () =>
            sZr.off?.('click', handleBlankChartClick);
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
    const {
        getChartInstance,
        handleChartReady: syncChartReady,
        lastZoomRangeRef,
        syncPanelRange,
    } = usePanelChartInstanceSync({
        panelRange: pPanelRange,
        navigatorRange: pNavigatorRange,
        isLoading: pIsLoading,
        isBrushActive: sIsBrushActive,
        optionRevision: sOption,
        onChartReady: attachBlankClickListener,
    });
    const applyLegendHoverState = (hoveredLegendSeries: string | undefined, force = false) => {
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
            if (!sInstance?.setOption) return;

            sInstance.setOption(
                buildChartSeriesOption({
                    ...sBaseChartInfo,
                    visibleSeries: sVisibleSeriesRef.current,
                    hoveredLegendSeries: sNextHoveredLegendSeries,
                }),
                { lazyUpdate: true },
            );
        };
    const sChartSync = {
        getChartInstance: getChartInstance,
        lastZoomRangeRef: lastZoomRangeRef,
        applyLegendHoverState: applyLegendHoverState,
        setVisibleSeries: setVisibleSeries,
        visibleSeriesRef: sVisibleSeriesRef,
        latestHoverTimestampRef: sLatestHoverTimestampRef,
    };

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
        syncChartReady(instance);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }

    useEffect(() => {
        return () => {
            sBlankClickListenerCleanupRef.current?.();
            sBlankClickListenerCleanupRef.current = undefined;
            sBlankClickListenerInstanceRef.current = undefined;
        };
    }, []);

    useEffect(() => {
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }, [applyLegendHoverState, sOption]);

    const sOnEvents = buildPanelChartEvents({
        chartSync: sChartSync,
        navigateState: sNavigateRangeState,
        overlayMode: pOverlayMode,
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
                        mode={sInteractionHintMode}
                        position={cursorHintPosition}
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
        </>
    );
};

export default PanelChartBody;
