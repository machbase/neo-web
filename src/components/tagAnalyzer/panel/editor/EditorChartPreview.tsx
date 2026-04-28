import ReactECharts from 'echarts-for-react';
import PanelChartFooter from '../PanelChartFooter';
import '../PanelChartHeader.scss';
import '../PanelChartShell.scss';
import { Refresh, LuTimerReset, MdRawOn, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import { changeUtcToText } from '@/utils/helpers/date';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import type { PanelChartInfo } from '../../chart/ChartInfoTypes';
import {
    extractDataZoomOptionRange,
    hasExplicitDataZoomOptionRange,
} from '../../chart/chartInternal/ChartDataZoomUtils';
import { buildPanelChartEvents } from '../../chart/chartInternal/PanelChartEventHandlers';
import type {
    PanelChartInstance,
    PanelChartWrapperHandle,
} from '../../chart/chartInternal/PanelChartRuntimeTypes';
import {
    buildChartOption,
    buildChartSeriesOption,
} from '../../chart/options/ChartOptionBuilder';
import {
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
} from '../../chart/options/ChartLegendVisibility';
import { PANEL_CHART_HEIGHT } from '../../chart/options/OptionBuildHelpers/ChartOptionConstants';
import { usePanelChartRuntimeController } from '../usePanelChartRuntimeController';
import type { PanelInfo } from '../../utils/panelModelTypes';
import type {
    PanelChartHandle,
    PanelChartHandlers,
    PanelChartRefs,
    PanelPresentationState,
    PanelState,
} from '../PanelTypes';
import {
    createPanelRangeControlHandlers,
} from '../../utils/time/PanelRangeControlLogic';
import { isSameTimeRange } from '../../utils/time/PanelTimeRangeResolver';
import { hasResolvedIntervalOption } from '../../utils/time/IntervalUtils';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';
import { resolveEditorTimeBounds } from './PanelEditorUtils';

function EditorChartPreview({
    pPanelInfo,
    pFooterRange,
    pPreviewRange,
    pRollupTableList,
}: {
    pPanelInfo: PanelInfo;
    pFooterRange: TimeRangeMs;
    pPreviewRange: TimeRangeMs;
    pRollupTableList: string[];
}) {
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<PanelChartHandle | null>(null);
    const sChartWrapperRef = useRef<PanelChartWrapperHandle | null>(null);
    const sPanelFormRef = useRef<HTMLDivElement | null>(null);
    const sLatestPanelRangeRef = useRef<TimeRangeMs>(pPreviewRange);
    const sLastZoomRangeRef = useRef<TimeRangeMs>(pPreviewRange);
    const sAppliedZoomRangeRef = useRef<TimeRangeMs | undefined>(undefined);
    const sSkipNextPanelRangeSyncRef = useRef(false);
    const sHoveredLegendSeriesRef = useRef<string | undefined>(undefined);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const sChartRefs = useMemo<PanelChartRefs>(
        () => ({
            areaChart: sAreaChart,
            chartWrap: sChartRef,
        }),
        [],
    );
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const [sPanelState, setPanelState] = useState<PanelState>({
        isRaw: pPanelInfo.toolbar.isRaw,
        isFFTModal: false,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
    });

    const {
        navigateState,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        areaChartRef: sAreaChart,
        chartRef: sChartRef,
        rollupTableList: pRollupTableList,
        isRaw: sPanelState.isRaw,
        boardTime: { kind: 'empty' },
        onPanelRangeApplied: undefined,
    });
    const sChartHandlers = useMemo<PanelChartHandlers>(
        () => ({
            onSetExtremes: handlePanelRangeChange,
            onSetNavigatorExtremes: handleNavigatorRangeChange,
            onSelection: (_event) => undefined,
            onOpenHighlightRename: (_request) => undefined,
            onOpenSeriesAnnotationEditor: (_request) => undefined,
        }),
        [handleNavigatorRangeChange, handlePanelRangeChange],
    );
    const sBaseChartInfo = useMemo<PanelChartInfo>(
        () => ({
            mainSeriesData: navigateState.chartData,
            seriesDefinitions: sPanelData.tag_set,
            navigatorRange: navigateState.navigatorRange,
            axes: sPanelAxes,
            display: sPanelDisplay,
            isRaw: sPanelState.isRaw,
            useNormalize: pPanelInfo.use_normalize,
            visibleSeries: {},
            navigatorSeriesData: navigateState.navigatorChartData,
            highlights: pPanelInfo.highlights ?? [],
        }),
        [
            navigateState.chartData,
            navigateState.navigatorChartData,
            navigateState.navigatorRange,
            pPanelInfo.highlights,
            pPanelInfo.use_normalize,
            sPanelAxes,
            sPanelData.tag_set,
            sPanelDisplay,
            sPanelState.isRaw,
        ],
    );
    const sIsDragZoomEnabled = sPanelDisplay.use_zoom;
    const sIsBrushActive = sPanelDisplay.use_zoom;
    sLatestPanelRangeRef.current = navigateState.panelRange;

    function getPreviewNavigatorRange() {
        if (navigateState.navigatorRange.startTime || navigateState.navigatorRange.endTime) {
            return navigateState.navigatorRange;
        }

        return pFooterRange;
    }

    const loadPreviewRanges = async function loadPreviewRanges(
        previewRange = pPreviewRange,
    ) {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) {
            return;
        }

        await applyLoadedRanges(previewRange, getPreviewNavigatorRange());
    };

    const refreshPreviewTimeRange = async function refreshPreviewTimeRange() {
        const sNavigatorRange = getPreviewNavigatorRange();
        const sNextPreviewRange = await resolveEditorTimeBounds({
            timeConfig: {
                range_bgn: pPanelInfo.time.range_bgn,
                range_end: pPanelInfo.time.range_end,
                range_config: pPanelInfo.time.range_config,
            },
            tag_set: pPanelInfo.data.tag_set,
            navigatorRange: sNavigatorRange,
        });

        await loadPreviewRanges(sNextPreviewRange);
    };

    const toggleRawMode = function toggleRawMode() {
        const sNextRaw = !sPanelState.isRaw;
        setPanelState((prev) => ({ ...prev, isRaw: sNextRaw }));
        void refreshPanelData(navigateState.panelRange, sNextRaw, navigateState.navigatorRange);
    };

    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );
    const sResolvedIntervalOption = hasResolvedIntervalOption(navigateState.rangeOption)
        ? navigateState.rangeOption
        : undefined;
    const sTimeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const sIntervalText =
        !sPanelState.isRaw && sResolvedIntervalOption
            ? `${sResolvedIntervalOption.IntervalValue}${sResolvedIntervalOption.IntervalType}`
            : '';
    const sPanelPresentationState: PanelPresentationState = {
        title: sPanelMeta.chart_title,
        timeText: sTimeText,
        intervalText: sIntervalText,
        isEdit: true,
        isRaw: sPanelState.isRaw,
        isSelectedForOverlap: false,
        isOverlapAnchor: false,
        canToggleOverlap: false,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
        canOpenFft: false,
        canSetGlobalTime: false,
        canSaveLocal: false,
    };
    const sPreviewIntervalSummaryText =
        !sPanelPresentationState.isRaw && sPanelPresentationState.intervalText
            ? ` ( interval : ${sPanelPresentationState.intervalText} )`
            : '';

    const setChartWrapper = useCallback((chart: unknown) => {
        sChartWrapperRef.current = chart as PanelChartWrapperHandle | null;
    }, []);

    const getChartInstance = useCallback(
        (): PanelChartInstance | undefined => sChartWrapperRef.current?.getEchartsInstance?.(),
        [],
    );

    useEffect(() => {
        sLastZoomRangeRef.current = navigateState.panelRange;
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

            const sHoveredChartInfo: PanelChartInfo = {
                ...sBaseChartInfo,
                visibleSeries: sVisibleSeriesRef.current,
                hoveredLegendSeries: sNextHoveredLegendSeries,
            };

            sInstance.setOption(buildChartSeriesOption(sHoveredChartInfo), {
                lazyUpdate: true,
            });
        },
        [getChartInstance, sBaseChartInfo],
    );

    useEffect(() => {
        sChartRef.current = {
            setPanelRange: (range) => syncPanelRange(range, undefined),
            getVisibleSeries: () =>
                buildVisibleSeriesList(sBaseChartInfo.mainSeriesData, sVisibleSeriesRef.current),
            getHighlightIndexAtClientPosition: () => undefined,
        };
    }, [sBaseChartInfo.mainSeriesData, syncPanelRange]);

    const handleChartReady = useCallback(
        (instance: PanelChartInstance) => {
            syncBrushInteraction(instance);
            syncPanelRange(sLatestPanelRangeRef.current, instance, true);
            if (sHoveredLegendSeriesRef.current) {
                applyLegendHoverState(sHoveredLegendSeriesRef.current, true);
            }
        },
        [applyLegendHoverState, syncBrushInteraction, syncPanelRange],
    );

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(sBaseChartInfo.mainSeriesData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [sBaseChartInfo.mainSeriesData]);

    const sChartInfo = useMemo<PanelChartInfo>(
        () => ({
            ...sBaseChartInfo,
            visibleSeries: sVisibleSeries,
        }),
        [sBaseChartInfo, sVisibleSeries],
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
        syncPanelRange(navigateState.panelRange, undefined);
    }, [navigateState.panelRange, syncPanelRange]);

    const sOnEvents = useMemo(
        () =>
            buildPanelChartEvents({
                chartSync: sChartSync,
                navigateState: navigateState,
                panelState: sPanelState,
                chartRefs: sChartRefs,
                chartHandlers: sChartHandlers,
                isSelectionMode: false,
                isDragZoomEnabled: sIsDragZoomEnabled,
            }),
        [
            navigateState,
            sChartHandlers,
            sChartRefs,
            sChartSync,
            sIsDragZoomEnabled,
            sPanelState,
        ],
    );

    useEffect(() => {
        void loadPreviewRanges();
    }, [pPanelInfo, pPreviewRange]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>) {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    return (
        <div ref={sPanelFormRef} className="panel-form" style={{ border: '0.5px solid #454545' }}>
            <div className="panel-header">
                <div className="title">{sPanelPresentationState.title}</div>
                <div className="time">
                    {sPanelPresentationState.timeText}
                    <span>{' ' + sPreviewIntervalSummaryText}</span>
                </div>
                <Button.Group>
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={
                            !sPanelPresentationState.isRaw
                                ? 'Enable raw data mode'
                                : 'Disable raw data mode'
                        }
                        icon={
                            <MdRawOn
                                size={16}
                                style={{
                                    color: sPanelPresentationState.isRaw ? '#fdb532 ' : '',
                                    height: '32px',
                                    width: '32px',
                                }}
                            />
                        }
                        onClick={toggleRawMode}
                        style={{ minWidth: '36px' }}
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh data'}
                        icon={<Refresh size={14} />}
                        onClick={() =>
                            void refreshPanelData(
                                navigateState.panelRange,
                                sPanelState.isRaw,
                                navigateState.navigatorRange,
                            )
                        }
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh time'}
                        icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                        onClick={() => void refreshPreviewTimeRange()}
                    />
                </Button.Group>
            </div>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={shiftHandlers.onShiftPanelRangeLeft}
                />
                <div
                    className="chart-body"
                    ref={sAreaChart}
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
                    onClick={shiftHandlers.onShiftPanelRangeRight}
                />
            </div>
            <PanelChartFooter
                pPanelSummary={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pVisibleRange={navigateState.panelRange}
                pShiftHandlers={shiftHandlers}
                pZoomHandlers={zoomHandlers}
            />
        </div>
    );
}

export default EditorChartPreview;
