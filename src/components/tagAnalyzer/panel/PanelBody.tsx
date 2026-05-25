import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type MouseEvent,
} from 'react';
import ReactECharts from 'echarts-for-react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import type { ChartInfo } from './chartBuilder/ChartTypes';
import { buildChartEvent } from './chartBuilder/buildEventCallback/buildChartEvent';
import { useBlankChartClickEvent } from './chartBuilder/useBlankChartClickEvent';
import type { PanelChartInstance } from './chartBuilder/PanelChartRuntimeTypes';
import {
    buildChartOption,
    buildChartSeriesOption,
} from './chartBuilder/OptionBuildHelpers/ChartOptionBuilder';
import { applyPanelNavigatorCursorStyles } from './chartBuilder/PanelNavigatorCursorStyles';
import {
    type ChartSeriesData,
} from '../domain/ChartDomain';
import { PANEL_CHART_HEIGHT } from './chartBuilder/PanelChartLayoutMetrics';
import type {
    PanelChartHandle,
    PanelChartState,
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
} from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { Button } from '@/design-system/components';
import { usePanelChartInstanceSync } from './chartBuilder/usePanelChartInstanceSync';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';

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

const PanelBody = ({
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
    const sLatestHoverTimestampRef = useRef<number | undefined>(undefined);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const sReadyNavigatorChartDataRef = useRef<ChartSeriesData[]>([]);
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >(undefined);
    const sIsNumericXAxis = hasNumericBaseTimeSeries(pChartState.seriesList);
    const sCurrentRanges = {
        panelRange: pPanelRange,
        navigatorRange: pNavigatorRange,
    };
    if (!pIsLoading) {
        sReadyNavigatorChartDataRef.current = pNavigatorChartData;
    }

    const sDisplayedNavigatorChartData =
        pIsLoading && sReadyNavigatorChartDataRef.current.length > 0
            ? sReadyNavigatorChartDataRef.current
            : pNavigatorChartData;
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
        navigatorSeriesData: sDisplayedNavigatorChartData,
        isNumericXAxis: sIsNumericXAxis,
        highlights: pChartState.highlights,
        annotations: pChartState.annotations,
    });
    const attachBlankChartClickEvent = useBlankChartClickEvent({
        chartAreaRef: pChartAreaRef,
        isAnnotationActive: pOverlayMode === 'annotation',
        isNumericXAxis: sIsNumericXAxis,
        latestHoverTimestampRef: sLatestHoverTimestampRef,
        onOpenCreateAnnotation: pMarkupHandlers.onOpenCreateAnnotation,
    });

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
    } = usePanelChartInstanceSync({
        panelRange: pPanelRange,
        navigatorRange: pNavigatorRange,
        isLoading: pIsLoading,
        isBrushActive: sIsBrushActive,
        optionRevision: sOption,
        onChartReady: attachBlankChartClickEvent,
    });
    const applyLegendHoverState = useCallback(
        (hoveredLegendSeries: string | undefined, force = false) => {
            const sNextHoveredLegendSeries =
                hoveredLegendSeries &&
                sBaseChartInfo.mainSeriesData.some((series) => series.name === hoveredLegendSeries)
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
        },
        [getChartInstance, sBaseChartInfo],
    );
    useEffect(() => {
        pChartApiRef.current = {
            getVisibleSeries: () =>
                buildVisibleSeriesList(
                    sBaseChartInfo.mainSeriesData,
                    sVisibleSeriesRef.current,
                ),
        };
    });

    function handleChartReady(instance: PanelChartInstance) {
        syncChartReady(instance);
        applyPanelNavigatorCursorStyles(instance);
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }

    useEffect(() => {
        if (sHoveredLegendSeriesRef.current) {
            applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
        }
    }, [applyLegendHoverState, sOption]);

    const sOnEvents = {
        ...buildChartEvent({
            currentRanges: sCurrentRanges,
            overlayMode: pOverlayMode,
            chartAreaRef: pChartAreaRef,
            rangeHandlers: pRangeHandlers,
            markupHandlers: pMarkupHandlers,
            onSelection: pOnSelection,
            isSelectionMode: sIsSelectionMode,
            isDragZoomEnabled: sIsDragZoomEnabled,
            isNumericXAxis: sIsNumericXAxis,
            getChartInstance,
            lastZoomRangeRef,
            applyLegendHoverState,
            setVisibleSeries,
            visibleSeriesRef: sVisibleSeriesRef,
            latestHoverTimestampRef: sLatestHoverTimestampRef,
        }),
        finished: () => applyPanelNavigatorCursorStyles(getChartInstance()),
    };

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

export default PanelBody;
