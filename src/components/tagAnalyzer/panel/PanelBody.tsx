import {
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
import type { ChartSeriesData } from '../domain/ChartDomain';
import {
    getChartLayoutMetrics,
    PANEL_CHART_HEIGHT,
} from './chartBuilder/PanelChartLayoutMetrics';
import type {
    PanelChartHandle,
    PanelChartState,
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
    PanelRangeState,
} from '../domain/PanelDomain';
import { Button } from '@/design-system/components';
import { usePanelChartInstanceSync } from './chartBuilder/usePanelChartInstanceSync';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import { PANEL_GRID_SIDE } from './chartBuilder/OptionBuildHelpers/ChartOptionConstants';
import {
    getNavigatorHandleMinimumRangeWidth,
} from '../board/PanelNavigatorRangeLimits';

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

function getInteractionHintMode(
    overlayMode: PanelOverlayMode,
): PanelChartInteractionHintMode | undefined {
    if (overlayMode === 'annotation') {
        return 'annotation';
    }

    if (overlayMode === 'highlight') {
        return 'highlight';
    }

    return undefined;
}

function getPanelBodyInteractionState(
    overlayMode: PanelOverlayMode,
    useZoom: boolean,
) {
    const isSelectionMode =
        overlayMode === 'dragSelect' || overlayMode === 'highlight';
    const isDragZoomEnabled =
        useZoom &&
        !isSelectionMode &&
        overlayMode !== 'annotation';

    return {
        hintMode: getInteractionHintMode(overlayMode),
        isSelectionMode,
        isDragZoomEnabled,
        isBrushActive: isSelectionMode || isDragZoomEnabled,
    };
}

function useDisplayedNavigatorChartData(
    isLoading: boolean,
    navigatorChartData: ChartSeriesData[],
) {
    const readyNavigatorChartDataRef = useRef<ChartSeriesData[]>([]);

    if (!isLoading) {
        readyNavigatorChartDataRef.current = navigatorChartData;
    }

    return isLoading && readyNavigatorChartDataRef.current.length > 0
        ? readyNavigatorChartDataRef.current
        : navigatorChartData;
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

function PanelMainChartLoadingOverlay({
    showLegend,
}: {
    showLegend: boolean;
}) {
    const sLayout = getChartLayoutMetrics(showLegend);

    return (
        <div
            className="panel-main-chart-loading-overlay"
            style={{
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: sLayout.mainGridTop,
                height: sLayout.mainGridHeight,
            }}
        >
            <span className="panel-main-chart-loading-spinner" />
            <span>Loading...</span>
        </div>
    );
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

type PanelBodyRefs = {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartApiRef: MutableRefObject<PanelChartHandle | null>;
};

type PanelBodyData = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
};

type PanelBodyHandlers = {
    rangeHandlers: PanelRangeHandlers;
    markupHandlers: PanelMarkupHandlers;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
};

type PanelBodyProps = {
    refs: PanelBodyRefs;
    chartState: PanelChartState;
    isRaw: boolean;
    overlayMode: PanelOverlayMode;
    data: PanelBodyData;
    rangeState: PanelRangeState;
    isLoading: boolean;
    handlers: PanelBodyHandlers;
};

const PanelBody = ({
    refs,
    chartState,
    isRaw,
    overlayMode,
    data,
    rangeState,
    isLoading,
    handlers,
}: PanelBodyProps) => {
    const { chartAreaRef, chartApiRef } = refs;
    const { chartData, navigatorChartData } = data;
    const { panelRange, navigatorRange } = rangeState;
    const { rangeHandlers, markupHandlers, onSelection } = handlers;
    const sLatestHoverTimestampRef = useRef<number | undefined>(undefined);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [cursorHintPosition, setCursorHintPosition] = useState<
        { x: number; y: number } | undefined
    >(undefined);
    const sIsNumericXAxis = hasNumericBaseTimeSeries(chartState.seriesList);
    const sDisplayedNavigatorChartData = useDisplayedNavigatorChartData(
        isLoading,
        navigatorChartData,
    );
    const sBaseChartInfo: ChartInfo = {
        mainSeriesData: chartData,
        seriesDefinitions: chartState.seriesList,
        panelRange,
        navigatorRange,
        axes: chartState.axes,
        display: chartState.display,
        isRaw,
        useNormalize: chartState.useNormalize,
        visibleSeries: {},
        navigatorSeriesData: sDisplayedNavigatorChartData,
        navigatorSelectionMinValueSpan: getNavigatorHandleMinimumRangeWidth({
            navigatorRange,
            chartAreaWidth: chartAreaRef.current?.clientWidth,
            isNumericXAxis: sIsNumericXAxis,
        }),
        isNumericXAxis: sIsNumericXAxis,
        highlights: chartState.highlights,
        annotations: chartState.annotations,
    };
    const attachBlankChartClickEvent = useBlankChartClickEvent({
        chartAreaRef,
        isAnnotationActive: overlayMode === 'annotation',
        isNumericXAxis: sIsNumericXAxis,
        latestHoverTimestampRef: sLatestHoverTimestampRef,
        onOpenCreateAnnotation: markupHandlers.onOpenCreateAnnotation,
    });

    const {
        hintMode,
        isSelectionMode,
        isDragZoomEnabled,
        isBrushActive,
    } = getPanelBodyInteractionState(
        overlayMode,
        sBaseChartInfo.display.use_zoom,
    );

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
    } = usePanelChartInstanceSync({
        isBrushActive,
        optionRevision: sOption,
        onChartReady: attachBlankChartClickEvent,
    });
    function applyLegendHoverState(
        hoveredLegendSeries: string | undefined,
        force = false,
    ) {
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
    }
    useEffect(() => {
        chartApiRef.current = {
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
    }, [sOption]);

    const sOnEvents = {
        ...buildChartEvent({
            currentRanges: rangeState,
            overlayMode,
            chartAreaRef,
            rangeHandlers,
            markupHandlers,
            onSelection,
            isSelectionMode,
            isDragZoomEnabled,
            isNumericXAxis: sIsNumericXAxis,
            getChartInstance,
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
        if (!hintMode) {
            return;
        }

        const sChartRect = event.currentTarget.getBoundingClientRect();

        setCursorHintPosition({
            x: event.clientX - sChartRect.left,
            y: event.clientY - sChartRect.top,
        });
    }

    useEffect(() => {
        if (!hintMode) {
            setCursorHintPosition(undefined);
        }
    }, [hintMode]);

    return (
        <div className="chart">
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                icon={<VscChevronLeft size={16} />}
                onClick={rangeHandlers.onShiftPanelRangeLeft}
            />
            <div
                className="chart-body"
                ref={chartAreaRef}
                onMouseDownCapture={handleChartMouseDownCapture}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={() => setCursorHintPosition(undefined)}
            >
                <PanelChartInteractionHint
                    mode={hintMode}
                    position={cursorHintPosition}
                />
                <ReactECharts
                    option={sOption}
                    onEvents={sOnEvents}
                    onChartReady={(instance) => {
                        handleChartReady(instance as unknown as PanelChartInstance);
                    }}
                    replaceMerge={['series']}
                    lazyUpdate
                    style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
                    opts={{ renderer: 'canvas' }}
                />
                {isLoading ? (
                    <PanelMainChartLoadingOverlay
                        showLegend={chartState.display.show_legend}
                    />
                ) : null}
            </div>
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range forward"
                icon={<VscChevronRight size={16} />}
                onClick={rangeHandlers.onShiftPanelRangeRight}
            />
        </div>
    );
};

export default PanelBody;
