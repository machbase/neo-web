import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
//import Chart from './Chart';
import { useEffect, useRef, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { isEmpty } from '@/utils';
import { Toast } from '@/design-system/components';
import {
    buildPanelHeaderState,
    createPanelTimeKeeperPayload,
    fetchPanelDatasets,
    getFocusedPanelRange,
    getExpandedNavigatorRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getNavigatorRangeFromEvent,
    getSelectionMenuPosition,
    normalizeChartWidth,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    shouldReloadNavigatorData,
    getZoomInPanelRange,
    getZoomOutRange,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelHelper';
import { getDuration, computeSeriesCalcList } from '../TagAnalyzerUtil';
import type { TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState, TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import {
    type CoordinateType,
} from './TagAnalyzerPanelTypes';
import {
    EMPTY_TAG_ANALYZER_TIME_RANGE,
    createTagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelUtil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartData,
    TagAnalyzerIntervalOption,
    TagAnalyzerMinMaxItem,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

type PanelSelectionState = {
    isSelectionActive: boolean;
    axis: any;
    minMaxList: TagAnalyzerMinMaxItem[];
    fftMinTime: number;
    fftMaxTime: number;
    isMenuOpen: boolean;
    menuPosition: CoordinateType;
};

type PanelFetchParams = {
    timeRange?: TagAnalyzerTimeRange;
    raw?: boolean;
};

const INITIAL_SELECTION_STATE: PanelSelectionState = {
    isSelectionActive: false,
    axis: null,
    minMaxList: [],
    fftMinTime: 0,
    fftMaxTime: 0,
    isMenuOpen: false,
    menuPosition: { x: 0, y: 0 },
};

// Owns one TagAnalyzer chart panel from data loading through chart interaction.
// It fetches panel and navigator series, manages range changes, and coordinates header/footer actions.
const TagAnalyzerPanel = ({
    pPanelInfo,
    pBoardInfo,
    pIsEdit,
    pFooterRange,
    pNavigatorRange,
    pBgnEndTimeRange,
    pPanelBoardState,
    pPanelBoardActions,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardInfo: TagAnalyzerBoardInfo;
    pIsEdit?: boolean;
    pFooterRange?: TagAnalyzerTimeRange;
    pNavigatorRange?: TagAnalyzerTimeRange;
    pBgnEndTimeRange?: Partial<TagAnalyzerBgnEndTimeRange>;
    pPanelBoardState?: TagAnalyzerBoardPanelState;
    pPanelBoardActions?: TagAnalyzerBoardPanelActions;
}) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<any>();
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelTime = pPanelInfo.time;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const [sChartData, setChartData] = useState<TagAnalyzerChartData | undefined>();
    const [sNavigatorData, setNavigatorData] = useState<TagAnalyzerChartData | undefined>();
    const [sPanelRange, setPanelRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const [sNavigatorRange, setNavigatorRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const [sIsRaw, setIsRaw] = useState<boolean>(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper);
    const [sRangeOption, setRangeOption] = useState<TagAnalyzerIntervalOption | null>(null);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sIsFFTModal, setIsFFTModal] = useState<boolean>(false);
    const [sSelectionState, setSelectionState] = useState<PanelSelectionState>(INITIAL_SELECTION_STATE);
    const [sSaveEditedInfo, setSaveEditedInfo] = useState<boolean>(false);
    const sSkipNextFetchRef = useRef<boolean>(false);
    const sPanelFormRef = useRef<any>(null);
    const [sPreOverflowTimeRange, setPreOverflowTimeRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const sFooterRange = pFooterRange ?? pNavigatorRange;
    const sBoardState = pPanelBoardState;
    const sBoardActions = pPanelBoardActions;
    const sBgnEndTimeRange = sBoardState?.bgnEndTimeRange ?? pBgnEndTimeRange;
    const sIsSelectedForOverlap = Boolean(
        sBoardState?.overlapPanels?.find((aItem) => aItem.board.meta.index_key === sPanelMeta.index_key),
    );

    const applyNavigatorRangeChange = (aEvent: any) => {
        const sExpandedNavigatorRange = getExpandedNavigatorRange(aEvent, sNavigatorRange);
        if (!sExpandedNavigatorRange) return;

        sChartRef.current.chart.navigator.xAxis.setExtremes(
            sExpandedNavigatorRange.startTime,
            sExpandedNavigatorRange.endTime,
        );
    };

    const syncPanelRangeData = async (aPanelRange: TagAnalyzerTimeRange) => {
        if (!sSkipNextFetchRef.current) {
            await loadPanelData(aPanelRange);
        } else {
            sSkipNextFetchRef.current = false;
        }

        setPanelRange(aPanelRange);
    };

    const persistPanelTimeKeeper = (aPanelRange: TagAnalyzerTimeRange) => {
        if (sPanelTime.use_time_keeper !== 'Y' || !sBoardActions?.onPersistPanelState || !sChartRef.current?.chart) {
            return;
        }

        persistPanelState(sIsRaw, createPanelTimeKeeperPayload(aPanelRange, sNavigatorRange));
    };

    const notifyOverlapRangeChange = (aPanelRange: TagAnalyzerTimeRange) => {
        if (pIsEdit) return;

        sBoardActions?.onOverlapSelectionChange?.(
            aPanelRange.startTime,
            aPanelRange.endTime,
            pPanelInfo,
            sIsRaw,
            'changed',
        );
    };

    const handlePanelRangeChange = async (aEvent: any) => {
        if (!aEvent.min) return;

        const sNextPanelRange = createTagAnalyzerTimeRange(aEvent.min, aEvent.max);
        applyNavigatorRangeChange(aEvent);
        await syncPanelRangeData(sNextPanelRange);
        persistPanelTimeKeeper(sNextPanelRange);
        notifyOverlapRangeChange(sNextPanelRange);
    };
    const handleSelectionRange = (aEvent: any) => {
        if (aEvent.xAxis && sChartData) {
            const x = aEvent.xAxis[0];
            x.axis.removePlotBand('selection-plot-band');
            x.axis.addPlotBand({
                from: x.min,
                to: x.max,
                color: 'rgba(68, 170, 213, 0.2)',
                id: 'selection-plot-band',
            });
            const calcList = computeSeriesCalcList(x.axis.series, sPanelData.tag_set, x.min, x.max);
            if (!isEmpty(calcList)) {
                const sChartRect = sChartRef.current?.container?.current?.getBoundingClientRect();
                setSelectionState({
                    isSelectionActive: true,
                    axis: x.axis,
                    minMaxList: calcList,
                    fftMinTime: Math.floor(x.min),
                    fftMaxTime: Math.ceil(x.max),
                    isMenuOpen: true,
                    menuPosition: getSelectionMenuPosition(sChartRect),
                });
            } else {
                Toast.error('There is no data in the selected area.');
                x.axis.removePlotBand('selection-plot-band');
            }
        }

        return false;
    };
    const handleNavigatorRangeChange = (aEvent: any) => {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        setNavigatorRange(sNextNavigatorRange);
        if (shouldReloadNavigatorData(sNextNavigatorRange, sNavigatorRange)) {
            loadNavigatorData({ timeRange: sNextNavigatorRange, raw: undefined });
        }
    };
    const handleFooterZoomRange = (aType?: string, aZoom?: number) => {
        if (aType === 'I') {
            const sNextPanelRange = getZoomInPanelRange(sPanelRange, aZoom);
            sChartRef.current.chart.xAxis[0].setExtremes(sNextPanelRange.startTime, sNextPanelRange.endTime);
        } else if (aType === 'O') {
            const sRangeUpdate = getZoomOutRange(sPanelRange, sNavigatorRange, aZoom);
            if (sRangeUpdate.navigatorRange) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(
                    sRangeUpdate.navigatorRange.startTime,
                    sRangeUpdate.navigatorRange.endTime,
                );
            }
            sChartRef.current.chart.xAxis[0].setExtremes(
                sRangeUpdate.panelRange.startTime,
                sRangeUpdate.panelRange.endTime,
            );
        } else {
            const sFocusedRange = getFocusedPanelRange(sPanelRange);
            if (!sFocusedRange) return;
            sChartRef.current.chart.xAxis[0].setExtremes(
                sFocusedRange.panelRange.startTime,
                sFocusedRange.panelRange.endTime,
            );
            sChartRef.current.chart.navigator.xAxis.setExtremes(
                sFocusedRange.navigatorRange.startTime,
                sFocusedRange.navigatorRange.endTime,
            );
        }
    };
    const handlePanelShiftRange = (aItem: string) => {
        const sRangeUpdate = getMovedPanelRange(sPanelRange, sNavigatorRange, aItem);
        sChartRef.current.chart.xAxis[0].setExtremes(sRangeUpdate.panelRange.startTime, sRangeUpdate.panelRange.endTime);
        if (sRangeUpdate.navigatorRange) {
            sChartRef.current.chart.navigator.xAxis.setExtremes(
                sRangeUpdate.navigatorRange.startTime,
                sRangeUpdate.navigatorRange.endTime,
            );
        }
    };
    const handleNavigatorShiftRange = (aItem: string) => {
        const sRangeUpdate = getMovedNavigatorRange(sPanelRange, sNavigatorRange, aItem);
        sChartRef.current.chart.navigator.xAxis.setExtremes(
            sRangeUpdate.navigatorRange.startTime,
            sRangeUpdate.navigatorRange.endTime,
        );
        sChartRef.current.chart.xAxis[0].setExtremes(
            sRangeUpdate.panelRange.startTime,
            sRangeUpdate.panelRange.endTime,
        );
    };

    const loadNavigatorData = async (params: PanelFetchParams = {}) => {
        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setNavigatorData({ datasets: [] });
            return;
        }

        const sFetchResult = await fetchPanelDatasets({
            tagSet: sTagSet,
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardInfo: pBoardInfo,
            chartWidth: normalizeChartWidth(sAreaChart?.current?.clientWidth),
            isRaw: params.raw === undefined ? sIsRaw : params.raw,
            timeRange: params.timeRange,
            rollupTableList: sRollupTableList,
            useSampling: sPanelAxes.use_sampling,
            includeColor: false,
            isNavigator: true,
        });

        setNavigatorData({ datasets: sFetchResult.datasets });
    };
    const loadPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setChartData({ datasets: [] });
            return;
        }

        const sFetchResult = await fetchPanelDatasets({
            tagSet: sTagSet,
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardInfo: pBoardInfo,
            chartWidth: normalizeChartWidth(sAreaChart.current?.clientWidth),
            isRaw: aRaw === undefined ? sIsRaw : aRaw,
            timeRange: aTimeRange,
            rollupTableList: sRollupTableList,
            useSampling: false,
            includeColor: true,
        });

        setRangeOption(sFetchResult.interval);
        setChartData({ datasets: sFetchResult.datasets });
        if (sFetchResult.hasDataLimit) {
            sSkipNextFetchRef.current = true;
            setPanelRange(createTagAnalyzerTimeRange(sFetchResult.datasets[0].data[0][0], sFetchResult.limitEnd));
            setPreOverflowTimeRange(createTagAnalyzerTimeRange(sFetchResult.datasets[0].data[0][0], sFetchResult.limitEnd));
            sChartRef &&
                sChartRef.current &&
                sChartRef.current.chart.xAxis[0].setExtremes(sFetchResult.datasets[0].data[0][0], sFetchResult.limitEnd);
        } else setPreOverflowTimeRange(EMPTY_TAG_ANALYZER_TIME_RANGE);
    };

    const resetPanelRange = async () => {
        if (pBoardInfo.id !== sSelectedTab || !sChartRef.current?.chart) {
            return;
        }

        const sResetTimeRange = await resolveResetTimeRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            bgnEndTimeRange: sBgnEndTimeRange,
            isEdit: pIsEdit,
        });

        sChartRef.current.chart.xAxis[0].setExtremes(sResetTimeRange.startTime, sResetTimeRange.endTime);
        sChartRef.current.chart.navigator.xAxis.setExtremes(sResetTimeRange.startTime, sResetTimeRange.endTime);
    };
    // Set init range
    const initializePanelRange = async () => {
        if (!(sPanelFormRef && sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;
        const sResolvedPanelRange = await resolveInitialPanelRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            bgnEndTimeRange: sBgnEndTimeRange,
            isEdit: pIsEdit,
        });
        const sTimeKeeperRanges =
            sPanelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(sPanelTime.time_keeper) : undefined;

        if (sTimeKeeperRanges) {
            loadPanelData({
                startTime: sTimeKeeperRanges.panelRange.startTime,
                endTime: sTimeKeeperRanges.panelRange.endTime,
            });
            setPanelRange(sTimeKeeperRanges.panelRange);
            loadNavigatorData({
                timeRange: sTimeKeeperRanges.navigatorRange,
                raw: undefined,
            });
            setNavigatorRange(sTimeKeeperRanges.navigatorRange);
        } else {
            loadPanelData({
                startTime: sResolvedPanelRange.startTime,
                endTime: sResolvedPanelRange.endTime,
            });
            setPanelRange(sResolvedPanelRange);
            loadNavigatorData({
                timeRange: sResolvedPanelRange,
                raw: undefined,
            });
            setNavigatorRange(sResolvedPanelRange);
        }
    };
    // Handle save keep data
    const persistPanelState = (aRaw: boolean, aTimeInfo: any) => {
        sBoardActions?.onPersistPanelState?.(sPanelMeta.index_key, { ...aTimeInfo }, aRaw);
    };
    // Control helper - min/max popup in chart
    const toggleSelectionPopup = () => {
        if (sSelectionState.isSelectionActive) {
            sSelectionState.axis?.removePlotBand('selection-plot-band'); // plot band
            setSelectionState(INITIAL_SELECTION_STATE);
        } else {
            setSelectionState({
                ...INITIAL_SELECTION_STATE,
                isSelectionActive: true,
            });
        }
    };
    // Control raw value
    const toggleRawMode = () => {
        setIsRaw(() => !sIsRaw);
        // Save keep data
        if (sPanelRange.startTime && sChartRef.current?.chart && sBoardActions?.onPersistPanelState) {
            persistPanelState(
                !sIsRaw,
                createPanelTimeKeeperPayload(
                    sPanelRange,
                    createTagAnalyzerTimeRange(
                        sChartRef.current.chart.navigator.xAxis.getExtremes().min,
                        sChartRef.current.chart.navigator.xAxis.getExtremes().max,
                    ),
                ),
            );
        }
        loadPanelData(sPanelRange, !sIsRaw);

        sPanelAxes.use_sampling && loadNavigatorData({ timeRange: undefined, raw: !sIsRaw });
    };
    const applyGlobalTimeRange = () => {
        if (!sRangeOption) return;
        sBoardActions?.onSetGlobalTimeRange?.(
            resolveGlobalTimeTargetRange(sPreOverflowTimeRange, sPanelRange),
            sNavigatorRange,
            sRangeOption,
        );
    };

    const handleToggleOverlap = () => {
        if (sPanelData.tag_set.length !== 1) return;
        sBoardActions?.onOverlapSelectionChange?.(sPanelRange.startTime, sPanelRange.endTime, pPanelInfo, sIsRaw);
    };

    const handleDeletePanel = () => {
        sBoardActions?.onOverlapSelectionChange?.(sPanelRange.startTime, sPanelRange.endTime, pPanelInfo, sIsRaw, 'delete');
        sBoardActions?.onDeletePanel?.(sPanelMeta.index_key);
    };

    const handleOpenEdit = () => {
        sBoardActions?.onOpenEditRequest?.({
            pPanelInfo,
            pBoardInfo,
            pNavigatorRange: sNavigatorRange,
            pSetSaveEditedInfo: setSaveEditedInfo,
        });
    };

    const sHeaderState = buildPanelHeaderState({
        title: sPanelMeta.chart_title,
        panelRange: sPanelRange,
        rangeOption: sRangeOption,
        isEdit: pIsEdit,
        isRaw: sIsRaw,
        isSelectedForOverlap: sIsSelectedForOverlap,
        canToggleOverlap: sPanelData.tag_set.length === 1,
        isSelectionActive: sSelectionState.isSelectionActive,
        isSelectionMenuOpen: sSelectionState.isMenuOpen,
        canSaveLocal: Boolean(sChartData?.datasets),
        overlapPanels: sBoardState?.overlapPanels,
        panelInfo: pPanelInfo,
        changeUtcToText,
    });

    const sHeaderActions = {
        onToggleOverlap: handleToggleOverlap,
        onToggleRaw: toggleRawMode,
        onToggleSelection: toggleSelectionPopup,
        onOpenFft: () => setIsFFTModal(true),
        onSetGlobalTime: applyGlobalTimeRange,
        onRefreshData: () => loadPanelData(sPanelRange),
        onRefreshTime: resetPanelRange,
        onOpenEdit: handleOpenEdit,
        onDelete: handleDeletePanel,
    };

    // set global time range
    useEffect(() => {
        if (sChartRef.current && !pIsEdit && sBoardState?.globalTimeRange) {
            setRangeOption(sBoardState.globalTimeRange.interval);
            sChartRef.current.chart.xAxis[0].setExtremes(
                sBoardState.globalTimeRange.data.startTime,
                sBoardState.globalTimeRange.data.endTime,
            );
            sChartRef.current.chart.navigator.xAxis.setExtremes(
                sBoardState.globalTimeRange.navigator.startTime,
                sBoardState.globalTimeRange.navigator.endTime,
            );
        }
    }, [sBoardState?.globalTimeRange]);
    // refresh
    useEffect(() => {
        if (sChartRef.current) loadPanelData(sPanelRange);
    }, [sBoardState?.refreshCount]);
    // save edit info
    useEffect(() => {
        if (pBoardInfo.id === sSelectedTab && sSaveEditedInfo) {
            initializePanelRange();
            setSaveEditedInfo(false);
        }
    }, [pPanelInfo]);
    // update time range & preview & init
    useEffect(() => {
        if (sChartRef.current) {
            // apply for tagList
            if (pIsEdit) initializePanelRange();
            else resetPanelRange();
        }
    }, [sBgnEndTimeRange]);
    useEffect(() => {
        if (
            sSelectedTab === pBoardInfo.id &&
            sAreaChart &&
            sAreaChart.current &&
            !sAreaChart.current?.dataset?.processed
        )
            initializePanelRange();
    }, [sSelectedTab]);

    return (
        <div
            ref={sPanelFormRef}
            className="panel-form"
            style={sIsSelectedForOverlap ? { border: '0.5px solid #FDB532' } : { border: '0.5px solid #454545' }}
        >
            <PanelHeader
                pHeaderState={sHeaderState}
                pHeaderActions={sHeaderActions}
                pSavedToLocalInfo={{ chartData: sChartData?.datasets, chartRef: sChartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: sAreaChart, chartWrap: sChartRef }}
                pChartModel={{
                    axes: sPanelAxes,
                    display: sPanelDisplay,
                    useNormalize: (pPanelInfo as any).use_normalize,
                    isRaw: sIsRaw,
                    navigatorData: sNavigatorData,
                    chartData: sChartData?.datasets,
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                    isUpdate: sSelectionState.isSelectionActive,
                }}
                pChartActions={{
                    onSetExtremes: handlePanelRangeChange,
                    onSetNavigatorExtremes: handleNavigatorRangeChange,
                    onSelection: handleSelectionRange,
                }}
                pBodyActions={{
                    onMoveTimeRange: handlePanelShiftRange,
                    onCloseMinMaxPopup: toggleSelectionPopup,
                    getDuration,
                }}
                pPopupState={{
                    tagSet: sPanelData.tag_set,
                    minMaxList: sSelectionState.minMaxList,
                    isFFTModal: sIsFFTModal,
                    setIsFFTModal,
                    fftMinTime: sSelectionState.fftMinTime,
                    fftMaxTime: sSelectionState.fftMaxTime,
                    isMinMaxMenu: sSelectionState.isMenuOpen,
                    menuPosition: sSelectionState.menuPosition,
                }}
            />
            <PanelFooter
                pNavigatorRange={sFooterRange ?? sNavigatorRange}
                pFooterDisplay={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pSetButtonRange={handleFooterZoomRange}
                pMoveNavigatorTimRange={handleNavigatorShiftRange}
            />
        </div>
    );
};
export default TagAnalyzerPanel;
