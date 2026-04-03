import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
//import Chart from './Chart';
import { useEffect, useRef, useState } from 'react';
import { changeUtcToText, getDateRange } from '@/utils/helpers/date';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { isEmpty, isRollup } from '@/utils';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { ADMIN_ID } from '@/utils/constants';
import { Toast } from '@/design-system/components';
import {
    convertInterType,
    getInterval,
    calcInterval,
    calculateSCount,
    checkTableUser,
    getDuration,
    computeSeriesCalcList,
} from './PanelUtil';
import type { CordinateType } from './PanelUtilTypes';
import type { TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState, TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import { flattenTagAnalyzerPanelInfo } from './TagAnalyzerPanelTypes';
import type { TagAnalyzerBgnEndTimeRange, TagAnalyzerPanelInfo, TagAnalyzerTimeRange } from './TagAnalyzerPanelTypes';

type PanelSelectionState = {
    isSelectionActive: boolean;
    axis: any;
    minMaxList: any[];
    fftMinTime: number;
    fftMaxTime: number;
    isMenuOpen: boolean;
    menuPosition: CordinateType;
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
    const [sChartData, setChartData] = useState<any>();
    const [sNavigatorData, setNavigatorData] = useState<any>();
    const [sPanelRange, setPanelRange] = useState<any>({});
    const [sNavigatorRange, setNavigatorRange] = useState<any>({});
    const [sIsRaw, setIsRaw] = useState<boolean>(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper);
    const [sRangeOption, setRangeOption] = useState<any>({});
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sIsFFTModal, setIsFFTModal] = useState<boolean>(false);
    const [sSelectionState, setSelectionState] = useState<PanelSelectionState>(INITIAL_SELECTION_STATE);
    const [sSaveEditedInfo, setSaveEditedInfo] = useState<boolean>(false);
    const sDataFetchHandler = useRef<boolean>(false);
    const tazPanelFormRef = useRef<any>(null);
    const [sPreOverflowTimeRange, setPreOverflowTimeRange] = useState<any>(undefined);
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
            if (!sDataFetchHandler.current) await fetchPanelData({ startTime: aEvent.min, endTime: aEvent.max });
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
            setPanelRange({ startTime: aEvent.min, endTime: aEvent.max });
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
                // Position popover at top-left of chart area
                if (sChartRef.current && sChartRef.current.container && sChartRef.current.container.current) {
                    const chartRect = sChartRef.current.container.current.getBoundingClientRect();
                    setSelectionState({
                        isSelectionActive: true,
                        axis: x.axis,
                        minMaxList: calcList,
                        fftMinTime: Math.floor(x.min),
                        fftMaxTime: Math.ceil(x.max),
                        isMenuOpen: true,
                        menuPosition: {
                            x: chartRect.left - 90,
                            y: chartRect.top - 35,
                        },
                    });
                } else {
                    // Fallback position
                    setSelectionState({
                        isSelectionActive: true,
                        axis: x.axis,
                        minMaxList: calcList,
                        fftMinTime: Math.floor(x.min),
                        fftMaxTime: Math.ceil(x.max),
                        isMenuOpen: true,
                        menuPosition: { x: 10, y: 10 },
                    });
                }
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
        setNavigatorRange({ startTime: sStart, endTime: sEnd });
        if (
            sStart?.toString().slice(0, 10) !== sNavigatorRange.startTime?.toString().slice(0, 10) ||
            sEnd?.toString().slice(0, 10) !== sNavigatorRange.endTime?.toString().slice(0, 10)
        )
            fetchNavigatorData({ timeRange: { startTime: sStart, endTime: sEnd }, raw: undefined });
    };
    const setButtonRange = (aType?: string, aZoom?: number) => {
        const sCalcTime = (sPanelRange.endTime - sPanelRange.startTime) * (aZoom ?? 0);
        if (aType === 'I') {
            const startCal = sPanelRange.startTime + sCalcTime;
            let endCal = sPanelRange.endTime - sCalcTime;
            if (endCal - startCal < 10) endCal = startCal + 10;
            sChartRef.current.chart.xAxis[0].setExtremes(startCal, endCal);
        } else if (aType === 'O') {
            let sStartTime = sPanelRange.startTime - sCalcTime;
            let sEndTime = sPanelRange.endTime + sCalcTime;
            const sLastTime = 9999999999999;
            if (sStartTime <= 0) {
                sStartTime = sNavigatorRange.startTime;
            }
            if (sEndTime > sLastTime) {
                sEndTime = sLastTime;
            }

            if (sEndTime > sNavigatorRange.endTime || sStartTime < sNavigatorRange.startTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);
            }

            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
        } else {
            if (sPanelRange.endTime - sPanelRange.startTime < 1000) return;
            const sStartTime = sPanelRange.startTime;
            const sEndTime = sPanelRange.endTime;

            sChartRef.current.chart.xAxis[0].setExtremes(
                sStartTime + (sEndTime - sStartTime) * 0.4,
                sStartTime + (sEndTime - sStartTime) * 0.6,
            );
            sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);
        }
    };
    const moveTimRange = (aItem: string) => {
        const sCalcTime = (sPanelRange.endTime - sPanelRange.startTime) / 2;
        if (aItem === 'l') {
            const sStartTime = sPanelRange.startTime - sCalcTime;
            const sEndTime = sPanelRange.endTime - sCalcTime;
            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
            if (sNavigatorRange.startTime > sStartTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sNavigatorRange.endTime - sCalcTime);
            }
        } else {
            const sStartTime = sPanelRange.startTime + sCalcTime;
            const sEndTime = sPanelRange.endTime + sCalcTime;
            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
            if (sNavigatorRange.endTime < sEndTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sNavigatorRange.startTime + sCalcTime, sEndTime);
            }
        }
    };
    const moveNavigatorTimRange = (aItem: string) => {
        const sCalcTime = (sNavigatorRange.endTime - sNavigatorRange.startTime) / 2;
        const sMainChartCount = sPanelRange.endTime - sPanelRange.startTime;

        if (aItem === 'l') {
            const sStartTime = sNavigatorRange.startTime - sCalcTime;
            const sEndTime = sNavigatorRange.endTime - sCalcTime;
            sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);
            if (sPanelRange.endTime > sEndTime) {
                sChartRef.current.chart.xAxis[0].setExtremes(sEndTime - sMainChartCount, sEndTime);
            }
        } else {
            const sStartTime = sNavigatorRange.startTime + sCalcTime;
            const sEndTime = sNavigatorRange.endTime + sCalcTime;
            sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);
            if (sPanelRange.startTime < sStartTime) {
                sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sStartTime + sMainChartCount);
            }
        }
    };
    const fetchNavigatorData = async (params: { timeRange?: any; raw?: any }) => {
        const sChartWidth: number = sAreaChart?.current?.clientWidth === 0 ? 1 : sAreaChart?.current?.clientWidth;
        const sRaw = params?.raw === undefined ? sIsRaw : params?.raw;
        const sLimit: number = sPanelData.count;
        const sCount = calculateSCount(
            sLimit,
            sPanelAxes.use_sampling,
            sRaw,
            sPanelAxes.pixels_per_tick,
            sPanelAxes.pixels_per_tick_raw,
            sChartWidth,
        );
        const sDatasets: any = [];
        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setNavigatorData({ datasets: sDatasets });
            return;
        }

        const sTimeRange: any = getDateRange(sFlatPanelInfo, pBoardInfo, params?.timeRange ?? undefined);

        const sIntervalTime =
            (sPanelData.interval_type ?? '').toLowerCase() === ''
                ? calcInterval(
                      sTimeRange.startTime,
                      sTimeRange.endTime,
                      sChartWidth,
                      sRaw,
                      sPanelAxes.pixels_per_tick,
                      sPanelAxes.pixels_per_tick_raw,
                      true,
                  )
                : { IntervalType: convertInterType(sPanelData.interval_type?.toLowerCase()), IntervalValue: 0 };
        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (sPanelAxes.use_sampling && sRaw) {
                sFetchResult = await fetchRawData({
                    Table: checkTableUser(sTagSetElement.table, ADMIN_ID),
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: sTagSetElement.onRollup,
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                    UseSampling: sPanelAxes.use_sampling,
                    sampleValue: sPanelAxes.sampling_value,
                });
            } else {
                sFetchResult = await fetchCalculationData({
                    Table: checkTableUser(sTagSetElement.table, ADMIN_ID),
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: isRollup(
                        sRollupTableList,
                        sTagSetElement.table,
                        getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue),
                        sTagSetElement.colName.value,
                    ),
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                    RollupList: sRollupTableList,
                });
            }

            sDatasets.push({
                name:
                    sTagSetElement.alias ||
                    `${sTagSetElement.tagName}(${sTagSetElement.calculationMode.toLowerCase()})`,
                data:
                    sFetchResult?.data?.rows?.length > 0
                        ? sFetchResult.data.rows.map((aItem: any) => {
                              return [aItem[0], aItem[1]];
                          })
                        : [],
                yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
            });
        }
        setNavigatorData({ datasets: sDatasets });
    };
    const fetchPanelData = async (aTimeRange?: any, aRaw?: any) => {
        const sChartWidth = sAreaChart.current?.clientWidth === 0 ? 1 : sAreaChart.current?.clientWidth;
        const sRaw = aRaw === undefined ? sIsRaw : aRaw;
        const sLimit = sPanelData.count;
        const sCount = calculateSCount(
            sLimit,
            false,
            sRaw,
            sPanelAxes.pixels_per_tick,
            sPanelAxes.pixels_per_tick_raw,
            sChartWidth,
        );
        const sDatasets: any = [];

        const sTagSet = sPanelData.tag_set || [];
        if (sTagSet.length === 0) {
            setChartData({ datasets: sDatasets });
            return;
        }
        const sTimeRange: any = getDateRange(sFlatPanelInfo, pBoardInfo, aTimeRange);
        const sIntervalTime =
            (sPanelData.interval_type ?? '').toLowerCase() === ''
                ? calcInterval(
                      sTimeRange.startTime,
                      sTimeRange.endTime,
                      sChartWidth,
                      sRaw,
                      sPanelAxes.pixels_per_tick,
                      sPanelAxes.pixels_per_tick_raw,
                  )
                : { IntervalType: convertInterType(sPanelData.interval_type?.toLowerCase()), IntervalValue: 0 };
        setRangeOption(sIntervalTime);
        let sCheckDataLimit: boolean = false;
        let sChangeLimitEnd: number = 0;
        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (sRaw) {
                sFetchResult = await fetchRawData({
                    Table: checkTableUser(sTagSetElement.table, ADMIN_ID),
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: sTagSetElement.onRollup,
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                });

                if (sFetchResult && sFetchResult.data.rows.length === sCount) {
                    sCheckDataLimit = true;
                    if (sChangeLimitEnd)
                        sChangeLimitEnd = Math.sign(sChangeLimitEnd - sFetchResult.data.rows.at(-1)[0])
                            ? sFetchResult.data.rows.at(-1)[0]
                            : sChangeLimitEnd;
                    else sChangeLimitEnd = sFetchResult.data.rows.at(-2)[0];
                }
            } else {
                sFetchResult = await fetchCalculationData({
                    Table: checkTableUser(sTagSetElement.table, ADMIN_ID),
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: isRollup(
                        sRollupTableList,
                        sTagSetElement.table,
                        getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue),
                        sTagSetElement.colName.value,
                    ),
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                    RollupList: sRollupTableList,
                });
            }

            sDatasets.push({
                name:
                    sTagSetElement.alias ||
                    `${sTagSetElement.tagName}(${sRaw ? 'raw' : sTagSetElement.calculationMode.toLowerCase()})`,
                data:
                    sFetchResult?.data?.rows?.length > 0
                        ? sFetchResult.data.rows.map((aItem: any) => {
                              return [aItem[0], aItem[1]];
                          })
                        : [],
                yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                color: sTagSetElement?.color ?? '',
            });
        }
        setChartData({ datasets: sDatasets });
        if (sCheckDataLimit) {
            sDataFetchHandler.current = true;
            setPanelRange({ startTime: sDatasets[0].data[0][0], endTime: sChangeLimitEnd });
            setPreOverflowTimeRange({ startTime: sDatasets[0].data[0][0], endTime: sChangeLimitEnd });
            sChartRef &&
                sChartRef.current &&
                sChartRef.current.chart.xAxis[0].setExtremes(sDatasets[0].data[0][0], sChangeLimitEnd);
        } else setPreOverflowTimeRange({ startTime: undefined, endTime: undefined });
    };

    const resetData = async () => {
        if (pBoardInfo.id === sSelectedTab) {
            if (sChartRef.current && sChartRef.current.chart) {
                let sData: any = { startTime: 0, endTime: 0 };
                let sStartTime = null;
                let sLastTime = null;
                // Set top-level last
                if (
                    !pIsEdit &&
                sBgnEndTimeRange &&
                    sBgnEndTimeRange.end_max &&
                    typeof pBoardInfo?.range_bgn === 'string' &&
                    pBoardInfo.range_bgn?.includes('last')
                ) {
                    sStartTime = subtractTime(sBgnEndTimeRange.end_max, pBoardInfo.range_bgn);
                    sLastTime = subtractTime(sBgnEndTimeRange.end_max, pBoardInfo.range_end);
                }
                // Set panel-level last & now
                if (!pIsEdit && typeof sPanelTime.range_end === 'string') {
                    if (sPanelTime.range_end.includes('last')) {
                        const sTimeRange = await getBgnEndTimeRange(
                            sPanelData.tag_set,
                            { bgn: pBoardInfo.range_bgn, end: pBoardInfo.range_end },
                            { bgn: sPanelTime.range_bgn, end: sPanelTime.range_end },
                        );
                        sStartTime = subtractTime(sTimeRange.end_max as number, sPanelTime.range_bgn);
                        sLastTime = subtractTime(sTimeRange.end_max as number, sPanelTime.range_end);
                    }
                    if (sPanelTime.range_end.includes('now')) {
                        const sTimeRange = getDateRange(sFlatPanelInfo, pBoardInfo);
                        sStartTime = sTimeRange.startTime;
                        sLastTime = sTimeRange.endTime;
                    }
                }
                // Set panel-level range
                if (!pIsEdit && typeof sPanelTime.range_end === 'number') {
                    sStartTime = sPanelTime.range_bgn;
                    sLastTime = sPanelTime.range_end;
                }

                if (!pIsEdit && sStartTime && sLastTime) {
                    sData.startTime = sStartTime;
                    sData.endTime = sLastTime;
                } else {
                    // Set top-level now
                    sData =
                        !pIsEdit &&
                        getDateRange(
                            {},
                            pBoardInfo?.range_end
                                ? pBoardInfo
                                : {
                                      range_bgn: sPanelTime.default_range?.min ?? 0,
                                      range_end: sPanelTime.default_range?.max ?? 0,
                                  },
                        );
                }
                // Set edit mode
                if (pIsEdit && sBgnEndTimeRange?.bgn_min !== undefined && sBgnEndTimeRange?.end_max !== undefined) {
                    sData = { startTime: sBgnEndTimeRange.bgn_min, endTime: sBgnEndTimeRange.end_max };
                }
                sChartRef.current.chart.xAxis[0].setExtremes(sData.startTime, sData.endTime);
                sChartRef.current.chart.navigator.xAxis.setExtremes(sData.startTime, sData.endTime);
            }
        }
    };
    // Set init range
    const setRange = async () => {
        if (!(tazPanelFormRef && tazPanelFormRef.current && tazPanelFormRef.current.clientWidth !== 0)) return;
        let sData: any = { startTime: 0, endTime: 0 };
        let sStartTime = null;
        let sLastTime = null;
        // Set top-level last
        if (
            sBgnEndTimeRange &&
            sBgnEndTimeRange.end_max &&
            typeof pBoardInfo.range_bgn === 'string' &&
            pBoardInfo.range_bgn?.includes('last')
        ) {
            if (pIsEdit) {
                sStartTime = sBgnEndTimeRange.bgn_max;
                sLastTime = sBgnEndTimeRange.end_max; // Set milli sec
            } else {
                sStartTime = subtractTime(sBgnEndTimeRange.end_max, pBoardInfo.range_bgn);
                sLastTime = subtractTime(sBgnEndTimeRange.end_max, pBoardInfo.range_end);
            }
        }
        // Set panel-level last & now
        if (typeof sPanelTime.range_end === 'string') {
            if (sPanelTime.range_end.includes('last')) {
                const sTimeRange = await getBgnEndTimeRange(
                    sPanelData.tag_set,
                    { bgn: pBoardInfo.range_bgn, end: pBoardInfo.range_end },
                    { bgn: sPanelTime.range_bgn, end: sPanelTime.range_end },
                );
                sStartTime = subtractTime(sTimeRange.end_max as number, sPanelTime.range_bgn);
                sLastTime = subtractTime(sTimeRange.end_max as number, sPanelTime.range_end);
            }
            if (sPanelTime.range_end.includes('now')) {
                const sTimeRange = getDateRange(sFlatPanelInfo, pBoardInfo);
                sStartTime = sTimeRange.startTime;
                sLastTime = sTimeRange.endTime;
            }
        }

        if (sStartTime && sLastTime) {
            sData.startTime = sStartTime;
            sData.endTime = sLastTime;
        } else {
            // now & time range
            sData = getDateRange(sFlatPanelInfo, pBoardInfo);
        }
        if (sPanelTime.use_time_keeper === 'Y' && sPanelTime.time_keeper?.startPanelTime) {
            fetchPanelData({
                startTime: sPanelTime.time_keeper.startPanelTime,
                endTime: sPanelTime.time_keeper.endPanelTime,
            });
            setPanelRange({
                startTime: sPanelTime.time_keeper.startPanelTime,
                endTime: sPanelTime.time_keeper.endPanelTime,
            });
            fetchNavigatorData({
                timeRange: {
                    startTime: sPanelTime.time_keeper.startNaviTime,
                    endTime: sPanelTime.time_keeper.endNaviTime,
                },
                raw: undefined,
            });
            setNavigatorRange({
                startTime: sPanelTime.time_keeper.startNaviTime,
                endTime: sPanelTime.time_keeper.endNaviTime,
            });
        } else {
            fetchPanelData({
                // startTime: sData.startTime + (sData.endTime - sData.startTime) * 0.4,
                // endTime: sData.startTime + (sData.endTime - sData.startTime) * 0.6,
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
            setPanelRange({
                // startTime: sData.startTime + (sData.endTime - sData.startTime) * 0.4,
                // endTime: sData.startTime + (sData.endTime - sData.startTime) * 0.6,
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
            fetchNavigatorData({
                timeRange: { startTime: sData.startTime, endTime: sData.endTime },
                raw: undefined,
            });
            setNavigatorRange({
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
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
        if (sPreOverflowTimeRange.startTime && sPreOverflowTimeRange.endTime)
            sBoardActions?.onSetGlobalTimeRange?.(sPreOverflowTimeRange, sNavigatorRange, sRangeOption);
        else sBoardActions?.onSetGlobalTimeRange?.(sPanelRange, sNavigatorRange, sRangeOption);
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

    const sHeaderState = {
        title: sPanelMeta.chart_title,
        timeText: sPanelRange.startTime ? `${changeUtcToText(sPanelRange.startTime)} ~ ${changeUtcToText(sPanelRange.endTime)}` : '',
        intervalText: !sIsRaw && sRangeOption.IntervalValue !== undefined && sRangeOption.IntervalType ? `${sRangeOption.IntervalValue}${sRangeOption.IntervalType}` : '',
        isEdit: pIsEdit,
        isRaw: sIsRaw,
        isSelectedForOverlap: sIsSelectedForOverlap,
        isOverlapAnchor: sBoardState?.overlapPanels?.[0]?.board.meta.index_key === sPanelMeta.index_key,
        canToggleOverlap: sPanelData.tag_set.length === 1,
        isSelectionActive: sSelectionState.isSelectionActive,
        canOpenFft: sSelectionState.isMenuOpen && sSelectionState.isSelectionActive,
        canSaveLocal: Boolean(sChartData?.datasets),
    };

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
                    onMoveTimeRange: moveTimRange,
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
