import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
//import Chart from './Chart';
import { useEffect, useRef, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { isEmpty } from '@/utils';
import { Toast } from '@/design-system/components';
import {
    buildPanelHeaderState,
    buildChartSeriesItem,
    buildCalculationFetchParams,
    buildRawFetchParams,
    getFocusedPanelRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getPanelChartWidth,
    getPanelDataLimitState,
    getPanelFetchCount,
    getPanelFetchTimeRange,
    getPanelGlobalTimeTarget,
    getPanelIntervalOption,
    getSelectionMenuPosition,
    getTimeKeeperRanges,
    getZoomInPanelRange,
    getZoomOutRange,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './helpers/PanelHelper';
import { getDuration, computeSeriesCalcList } from './PanelUtil';
import type { CordinateType } from './PanelUtilTypes';
import type { TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState, TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import {
    EMPTY_TAG_ANALYZER_INTERVAL_OPTION,
    EMPTY_TAG_ANALYZER_TIME_RANGE,
    createTagAnalyzerTimeRange,
    flattenTagAnalyzerPanelInfo,
} from './TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartData,
    TagAnalyzerIntervalOption,
    TagAnalyzerMinMaxItem,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelTypes';

type PanelSelectionState = {
    isSelectionActive: boolean;
    axis: any;
    minMaxList: TagAnalyzerMinMaxItem[];
    fftMinTime: number;
    fftMaxTime: number;
    isMenuOpen: boolean;
    menuPosition: CordinateType;
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
const Panel = ({
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
    const sFlatPanelInfo = flattenTagAnalyzerPanelInfo(pPanelInfo);
    const [sChartData, setChartData] = useState<TagAnalyzerChartData | undefined>();
    const [sNavigatorData, setNavigatorData] = useState<TagAnalyzerChartData | undefined>();
    const [sPanelRange, setPanelRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const [sNavigatorRange, setNavigatorRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const [sIsRaw, setIsRaw] = useState<boolean>(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper);
    const [sRangeOption, setRangeOption] = useState<TagAnalyzerIntervalOption>(EMPTY_TAG_ANALYZER_INTERVAL_OPTION);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sIsFFTModal, setIsFFTModal] = useState<boolean>(false);
    const [sSelectionState, setSelectionState] = useState<PanelSelectionState>(INITIAL_SELECTION_STATE);
    const [sSaveEditedInfo, setSaveEditedInfo] = useState<boolean>(false);
    const sDataFetchHandler = useRef<boolean>(false);
    const tazPanelFormRef = useRef<any>(null);
    const [sPreOverflowTimeRange, setPreOverflowTimeRange] = useState<TagAnalyzerTimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);
    const sFooterRange = pFooterRange ?? pNavigatorRange;
    const sBoardState = pPanelBoardState;
    const sBoardActions = pPanelBoardActions;
    const sBgnEndTimeRange = sBoardState?.bgnEndTimeRange ?? pBgnEndTimeRange;
    const sIsSelectedForOverlap = Boolean(
        sBoardState?.overlapPanels?.find((aItem) => aItem.board.meta.index_key === sPanelMeta.index_key),
    );

    const setExtremes = async (aEvent: any) => {
        if (aEvent.min) {
            const sRatio =
                1 - ((aEvent.max - aEvent.min) * 100) / (sNavigatorRange.endTime - sNavigatorRange.startTime);
            if (
                (sNavigatorRange.endTime - sNavigatorRange.startTime) / 100 > aEvent.max - aEvent.min &&
                aEvent?.trigger &&
                (aEvent.trigger === 'zoom' || aEvent.trigger === 'navigator')
            ) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(
                    sNavigatorRange.startTime + (aEvent.min - sNavigatorRange.startTime) * sRatio,
                    sNavigatorRange.endTime + (aEvent.max - sNavigatorRange.endTime) * sRatio,
                );
            }
            if (!sDataFetchHandler.current)
                await fetchPanelData(createTagAnalyzerTimeRange(aEvent.min, aEvent.max));
            else sDataFetchHandler.current = false;
            if (sPanelTime.use_time_keeper === 'Y' && sBoardActions?.onPersistPanelState && sChartRef.current?.chart) {
                saveKeepData(sIsRaw, {
                    startPanelTime: aEvent.min,
                    endPanelTime: aEvent.max,
                    startNaviTime: sNavigatorRange.startTime,
                    endNaviTime: sNavigatorRange.endTime,
                });
            }
            !pIsEdit && sBoardActions?.onOverlapSelectionChange?.(aEvent.min, aEvent.max, pPanelInfo, sIsRaw, 'changed');
            setPanelRange(createTagAnalyzerTimeRange(aEvent.min, aEvent.max));
        }
    };
    const viewMinMaxAvg = (aEvent: any) => {
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
    const setNavigatorExtremes = (aEvent: any) => {
        const sStart = aEvent.min;
        let sEnd = aEvent.max;
        if (sEnd - sStart < 1000) sEnd = sStart + 1000;
        setNavigatorRange(createTagAnalyzerTimeRange(sStart, sEnd));
        if (
            sStart?.toString().slice(0, 10) !== sNavigatorRange.startTime?.toString().slice(0, 10) ||
            sEnd?.toString().slice(0, 10) !== sNavigatorRange.endTime?.toString().slice(0, 10)
        )
            fetchNavigatorData({ timeRange: createTagAnalyzerTimeRange(sStart, sEnd), raw: undefined });
    };
    const setButtonRange = (aType?: string, aZoom?: number) => {
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
    const moveTimeRange = (aItem: string) => {
        const sRangeUpdate = getMovedPanelRange(sPanelRange, sNavigatorRange, aItem);
        sChartRef.current.chart.xAxis[0].setExtremes(sRangeUpdate.panelRange.startTime, sRangeUpdate.panelRange.endTime);
        if (sRangeUpdate.navigatorRange) {
            sChartRef.current.chart.navigator.xAxis.setExtremes(
                sRangeUpdate.navigatorRange.startTime,
                sRangeUpdate.navigatorRange.endTime,
            );
        }
    };
    const moveNavigatorTimRange = (aItem: string) => {
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

    const getFetchRows = async (
        aTagItem: TagAnalyzerPanelInfo['data']['tag_set'][number],
        aTimeRange: TagAnalyzerTimeRange,
        aInterval: TagAnalyzerIntervalOption,
        aCount: number,
        aIsRaw: boolean,
        aUseSampling = false,
    ) => {
        if (aUseSampling && aIsRaw) {
            return fetchRawData(
                buildRawFetchParams(
                    aTagItem,
                    aTimeRange,
                    aInterval,
                    aCount,
                    sPanelAxes.use_sampling,
                    sPanelAxes.sampling_value,
                ),
            );
        }

        if (aIsRaw) {
            return fetchRawData(buildRawFetchParams(aTagItem, aTimeRange, aInterval, aCount));
        }

        return fetchCalculationData(
            buildCalculationFetchParams(aTagItem, aTimeRange, aInterval, aCount, sRollupTableList),
        );
    };

    const fetchNavigatorData = async (params: PanelFetchParams = {}) => {
        const sChartWidth = getPanelChartWidth(sAreaChart?.current?.clientWidth);
        const sRaw = params.raw === undefined ? sIsRaw : params.raw;
        const sCount = getPanelFetchCount(sPanelData.count, sPanelAxes.use_sampling, sRaw, sPanelAxes, sChartWidth);
        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setNavigatorData({ datasets: [] });
            return;
        }

        const sTimeRange = getPanelFetchTimeRange(sFlatPanelInfo, pBoardInfo, params.timeRange);
        const sIntervalTime = getPanelIntervalOption(sPanelData, sPanelAxes, sTimeRange, sChartWidth, sRaw, true);
        const sDatasets = [];

        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            const sFetchResult: any = await getFetchRows(
                sTagSetElement,
                sTimeRange,
                sIntervalTime,
                sCount,
                sRaw,
                sPanelAxes.use_sampling,
            );

            sDatasets.push(buildChartSeriesItem(sTagSetElement, sFetchResult?.data?.rows, false, false));
        }
        setNavigatorData({ datasets: sDatasets });
    };
    const fetchPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sChartWidth = getPanelChartWidth(sAreaChart.current?.clientWidth);
        const sRaw = aRaw === undefined ? sIsRaw : aRaw;
        const sCount = getPanelFetchCount(sPanelData.count, false, sRaw, sPanelAxes, sChartWidth);
        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setChartData({ datasets: [] });
            return;
        }
        const sTimeRange = getPanelFetchTimeRange(sFlatPanelInfo, pBoardInfo, aTimeRange);
        const sIntervalTime = getPanelIntervalOption(sPanelData, sPanelAxes, sTimeRange, sChartWidth, sRaw);
        setRangeOption(sIntervalTime);
        const sDatasets = [];
        let sCheckDataLimit: boolean = false;
        let sChangeLimitEnd: number = 0;
        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            const sFetchResult: any = await getFetchRows(
                sTagSetElement,
                sTimeRange,
                sIntervalTime,
                sCount,
                sRaw,
            );

            const sDataLimitState = getPanelDataLimitState(sRaw, sFetchResult?.data?.rows, sCount, sChangeLimitEnd);
            if (sDataLimitState.hasDataLimit) {
                sCheckDataLimit = true;
                sChangeLimitEnd = sDataLimitState.limitEnd;
            }

            sDatasets.push(buildChartSeriesItem(sTagSetElement, sFetchResult?.data?.rows, sRaw));
        }
        setChartData({ datasets: sDatasets });
        if (sCheckDataLimit) {
            sDataFetchHandler.current = true;
            setPanelRange(createTagAnalyzerTimeRange(sDatasets[0].data[0][0], sChangeLimitEnd));
            setPreOverflowTimeRange(createTagAnalyzerTimeRange(sDatasets[0].data[0][0], sChangeLimitEnd));
            sChartRef &&
                sChartRef.current &&
                sChartRef.current.chart.xAxis[0].setExtremes(sDatasets[0].data[0][0], sChangeLimitEnd);
        } else setPreOverflowTimeRange(EMPTY_TAG_ANALYZER_TIME_RANGE);
    };

    const resetData = async () => {
        if (pBoardInfo.id !== sSelectedTab || !sChartRef.current?.chart) {
            return;
        }

        const sResetTimeRange = await resolveResetTimeRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            flatPanelInfo: sFlatPanelInfo,
            bgnEndTimeRange: sBgnEndTimeRange,
            isEdit: pIsEdit,
        });

        sChartRef.current.chart.xAxis[0].setExtremes(sResetTimeRange.startTime, sResetTimeRange.endTime);
        sChartRef.current.chart.navigator.xAxis.setExtremes(sResetTimeRange.startTime, sResetTimeRange.endTime);
    };
    // Set init range
    const setRange = async () => {
        if (!(tazPanelFormRef && tazPanelFormRef.current && tazPanelFormRef.current.clientWidth !== 0)) return;
        const sData = await resolveInitialPanelRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            flatPanelInfo: sFlatPanelInfo,
            bgnEndTimeRange: sBgnEndTimeRange,
            isEdit: pIsEdit,
        });
        const sTimeKeeperRanges =
            sPanelTime.use_time_keeper === 'Y' ? getTimeKeeperRanges(sPanelTime.time_keeper) : undefined;

        if (sTimeKeeperRanges) {
            fetchPanelData({
                startTime: sTimeKeeperRanges.panelRange.startTime,
                endTime: sTimeKeeperRanges.panelRange.endTime,
            });
            setPanelRange(sTimeKeeperRanges.panelRange);
            fetchNavigatorData({
                timeRange: sTimeKeeperRanges.navigatorRange,
                raw: undefined,
            });
            setNavigatorRange(sTimeKeeperRanges.navigatorRange);
        } else {
            fetchPanelData({
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
            setPanelRange(sData);
            fetchNavigatorData({
                timeRange: sData,
                raw: undefined,
            });
            setNavigatorRange(sData);
        }
    };
    // Handle save keep data
    const saveKeepData = (aRaw: boolean, aTimeInfo: any) => {
        sBoardActions?.onPersistPanelState?.(sPanelMeta.index_key, { ...aTimeInfo }, aRaw);
    };
    // Control helper - min/max popup in chart
    const ctrMinMaxPopupModal = () => {
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
    const ctrRaw = () => {
        setIsRaw(() => !sIsRaw);
        // Save keep data
        if (sPanelRange.startTime && sChartRef.current?.chart && sBoardActions?.onPersistPanelState) {
            saveKeepData(!sIsRaw, {
                startPanelTime: sPanelRange.startTime,
                endPanelTime: sPanelRange.endTime,
                startNaviTime: sChartRef.current.chart.navigator.xAxis.getExtremes().min,
                endNaviTime: sChartRef.current.chart.navigator.xAxis.getExtremes().max,
            });
        }
        fetchPanelData(sPanelRange, !sIsRaw);

        sPanelAxes.use_sampling && fetchNavigatorData({ timeRange: undefined, raw: !sIsRaw });
    };
    const wrapSetGlobalTimeRange = () => {
        sBoardActions?.onSetGlobalTimeRange?.(
            getPanelGlobalTimeTarget(sPreOverflowTimeRange, sPanelRange),
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
        onToggleRaw: ctrRaw,
        onToggleSelection: ctrMinMaxPopupModal,
        onOpenFft: () => setIsFFTModal(true),
        onSetGlobalTime: wrapSetGlobalTimeRange,
        onRefreshData: () => fetchPanelData(sPanelRange),
        onRefreshTime: resetData,
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
        if (sChartRef.current) fetchPanelData(sPanelRange);
    }, [sBoardState?.refreshCount]);
    // save edit info
    useEffect(() => {
        if (pBoardInfo.id === sSelectedTab && sSaveEditedInfo) {
            setRange();
            setSaveEditedInfo(false);
        }
    }, [pPanelInfo]);
    // update time range & preview & init
    useEffect(() => {
        if (sChartRef.current) {
            // apply for tagList
            if (pIsEdit) setRange();
            else resetData();
        }
    }, [sBgnEndTimeRange]);
    useEffect(() => {
        if (
            sSelectedTab === pBoardInfo.id &&
            sAreaChart &&
            sAreaChart.current &&
            !sAreaChart.current?.dataset?.processed
        )
            setRange();
    }, [sSelectedTab]);

    return (
        <div
            ref={tazPanelFormRef}
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
                    panelInfo: pPanelInfo,
                    isRaw: sIsRaw,
                    navigatorData: sNavigatorData,
                    chartData: sChartData?.datasets,
                    panelRange: sPanelRange,
                    navigatorRange: sNavigatorRange,
                    isUpdate: sSelectionState.isSelectionActive,
                }}
                pChartActions={{
                    onSetExtremes: setExtremes,
                    onSetNavigatorExtremes: setNavigatorExtremes,
                    onSelection: viewMinMaxAvg,
                }}
                pBodyActions={{
                    onMoveTimeRange: moveTimeRange,
                    onCloseMinMaxPopup: ctrMinMaxPopupModal,
                    getDuration,
                }}
                pPopupState={{
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
                pSetButtonRange={setButtonRange}
                pMoveNavigatorTimRange={moveNavigatorTimRange}
            />
        </div>
    );
};
export default Panel;

