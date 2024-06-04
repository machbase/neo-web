import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';

import './Panel.scss';
import Chart from './Chart';
import { useEffect, useRef, useState } from 'react';
import { getDateRange } from '@/utils/helpers/date';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { ArrowLeft, ArrowRight, Close } from '@/assets/icons/Icon';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { isEmpty, isRollup } from '@/utils';
import useDebounce from '@/hooks/useDebounce';
import { FFTModal } from '@/components/modal/FFTModal';
import { Error } from '@/components/toast/Toast';
import Menu from '@/components/contextMenu/Menu';
import moment from 'moment';
import { getBgnEndTimeRange, subtractTime } from '@/utils/bgnEndTimeRange';
import { IconButton } from '@/components/buttons/IconButton';

const Panel = ({
    pPanelInfo,
    pPanelsInfo,
    pGetChartInfo,
    pBoardInfo,
    pIsEdit,
    pSaveKeepData,
    pRefreshCount,
    pFooterRange,
    pBgnEndTimeRange,
}: // pGetBgnEndTime
any) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<any>();
    const sMenuRef = useRef<any>();
    const [sChartData, setChartData] = useState<any>();
    const [sNavigatorData, setNavigatorData] = useState<any>();
    const [sPanelRange, setPanelRange] = useState<any>({});
    const [sNavigatorRange, setNavigatorRange] = useState<any>({});
    const [sIsRaw, setIsRaw] = useState<boolean>(pPanelInfo.raw_keeper === undefined ? false : pPanelInfo.raw_keeper);
    const [sRangeOption, setRangeOption] = useState<any>({});
    const [sIsUpdate, setIsUpdate] = useState<boolean>(false);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sSelectedChart, setSelectedChart] = useState<boolean>(false);
    const [sIsFFTModal, setIsFFTModal] = useState<boolean>(false);
    const [sAxis, setAxis] = useState<any>(null);
    const [sMinMaxList, setMinMaxList] = useState<any>([]);
    const [sFFTMinTime, setFFTMinTime] = useState<number>(0);
    const [sFFTMaxTime, setFFTMaxTime] = useState<number>(0);
    const [sIsMinMaxMenu, setIsMinMaxMenu] = useState<boolean>(false);
    const [sSaveEditedInfo, setSaveEditedInfo] = useState<boolean>(false);
    const sDataFetchHandler = useRef<boolean>(false);

    const setExtremes = async (aEvent: any) => {
        if (aEvent.min) {
            const sRatio = 1 - ((aEvent.max - aEvent.min) * 100) / (sNavigatorRange.endTime - sNavigatorRange.startTime);
            if (
                (sNavigatorRange.endTime - sNavigatorRange.startTime) / 100 > aEvent.max - aEvent.min &&
                aEvent?.trigger &&
                (aEvent.trigger === 'zoom' || aEvent.trigger === 'navigator')
            ) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(
                    sNavigatorRange.startTime + (aEvent.min - sNavigatorRange.startTime) * sRatio,
                    sNavigatorRange.endTime + (aEvent.max - sNavigatorRange.endTime) * sRatio
                );
            }
            if (!sDataFetchHandler.current) await fetchPanelData({ startTime: aEvent.min, endTime: aEvent.max });
            else sDataFetchHandler.current = false;
            if (pPanelInfo.use_time_keeper === 'Y' && pSaveKeepData && sChartRef.current?.chart) {
                saveKeepData(sIsRaw, {
                    startPanelTime: aEvent.min,
                    endPanelTime: aEvent.max,
                    startNaviTime: sNavigatorRange.startTime,
                    endNaviTime: sNavigatorRange.endTime,
                });
            }
            !pIsEdit && pGetChartInfo(aEvent.min, aEvent.max, pPanelInfo, sIsRaw, 'changed');
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
            setAxis(x.axis);

            const calcList: any[] = [];
            x.axis.series.forEach((aSeries: any, aIndex: number) => {
                const seriesData = !isEmpty(aSeries.data)
                    ? aSeries.data
                    : aSeries.xData.map((x: number, index: number) => {
                          return {
                              x: x,
                              y: aSeries.yData[index],
                          };
                      });
                const filterData: number[] = [];
                let totalValue = 0;
                if (seriesData) {
                    seriesData
                        .filter((aData: any) => x.min <= aData.x && x.max >= aData.x)
                        .forEach((aItem: any) => {
                            totalValue += aItem.y;
                            filterData.push(aItem.y);
                        });
                }
                if (!isEmpty(filterData)) {
                    const calc = {
                        table: pPanelInfo.tag_set[aIndex].table,
                        name: pPanelInfo.tag_set[aIndex].tagName,
                        alias: pPanelInfo.tag_set[aIndex].alias,
                        min: Math.min(...filterData).toFixed(5),
                        max: Math.max(...filterData).toFixed(5),
                        avg: (totalValue / filterData.length).toFixed(5),
                    };
                    calcList.push(calc);
                }
            });
            if (!isEmpty(calcList)) {
                setIsUpdate(true);
                setIsMinMaxMenu(true);
                setMinMaxList(calcList);
                setFFTMinTime(Math.floor(x.min));
                setFFTMaxTime(Math.ceil(x.max));
            } else {
                Error('There is no data in the selected area.');
                x.axis.removePlotBand('selection-plot-band');
            }
        }

        return false;
    };
    const setNavigatorExtremes = (aEvent: any) => {
        const sStart = aEvent.min;
        let sEnd = aEvent.max;

        if (sStart === sEnd) sEnd += 10;
        setNavigatorRange({ startTime: sStart, endTime: sEnd });
        fetchNavigatorData({ startTime: sStart, endTime: sEnd });
    };
    const setButtonRange = (aType: string, aZoom: number) => {
        const sCalcTime = (sPanelRange.endTime - sPanelRange.startTime) * aZoom;
        if (aType === 'I') {
            sChartRef.current.chart.xAxis[0].setExtremes(sPanelRange.startTime + sCalcTime, sPanelRange.endTime - sCalcTime);
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
            const sStartTime = sPanelRange.startTime;
            const sEndTime = sPanelRange.endTime;

            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime + (sEndTime - sStartTime) * 0.4, sStartTime + (sEndTime - sStartTime) * 0.6);
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
    const fetchNavigatorData = async (aTimeRange: any, aRaw?: any) => {
        const sChartWidth = sAreaChart?.current?.clientWidth === 0 ? 1 : sAreaChart?.current?.clientWidth;
        const sRaw = aRaw === undefined ? sIsRaw : aRaw;
        const sLimit = pPanelInfo.count;
        let sCount = -1;

        if (sLimit < 0) {
            if (sRaw) {
                if (pPanelInfo.pixels_per_tick_raw > 0) {
                    sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick_raw);
                } else {
                    sCount = Math.ceil(sChartWidth);
                }
            } else {
                if (pPanelInfo.pixels_per_tick > 0) {
                    sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick);
                } else {
                    sCount = Math.ceil(sChartWidth);
                }
            }
        }
        const sDatasets: any = [];
        const sTagSet = pPanelInfo.tag_set || [];
        if (sTagSet.length === 0) {
            setNavigatorData({ datasets: sDatasets });
            return;
        }

        const sTimeRange: any = getDateRange(pPanelInfo, pBoardInfo, aTimeRange);
        const sIntervalTime =
            pPanelInfo.interval_type.toLowerCase() === ''
                ? calcInterval(sTimeRange.startTime, sTimeRange.endTime, sChartWidth, sRaw)
                : { IntervalType: convertInterType(pPanelInfo.interval_type?.toLowerCase()), IntervalValue: 0 };
        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (sRaw) {
                sFetchResult = await fetchRawData({
                    Table: sTagSetElement.table,
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: sTagSetElement.onRollup,
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                    UseSampling: pPanelInfo.use_sampling,
                    sampleValue: pPanelInfo.sampling_value,
                });
            } else {
                sFetchResult = await fetchCalculationData({
                    Table: sTagSetElement.table,
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: isRollup(sRollupTableList, sTagSetElement.table, getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue)),
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                });
            }

            sDatasets.push({
                name: sTagSetElement.alias || `${sTagSetElement.tagName}(${sTagSetElement.calculationMode.toLowerCase()})`,
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
        const sLimit = pPanelInfo.count;
        let sCount = -1;

        if (sLimit < 0) {
            if (sRaw) {
                if (pPanelInfo.pixels_per_tick_raw > 0) {
                    sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick_raw);
                } else {
                    sCount = Math.ceil(sChartWidth);
                }
            } else {
                if (pPanelInfo.pixels_per_tick > 0) {
                    sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick);
                } else {
                    sCount = Math.ceil(sChartWidth);
                }
            }
        }
        const sDatasets: any = [];

        const sTagSet = pPanelInfo.tag_set || [];
        if (sTagSet.length === 0) {
            setChartData({ datasets: sDatasets });
            return;
        }
        const sTimeRange: any = getDateRange(pPanelInfo, pBoardInfo, aTimeRange);
        const sIntervalTime =
            pPanelInfo.interval_type.toLowerCase() === ''
                ? calcInterval(sTimeRange.startTime, sTimeRange.endTime, sChartWidth, sRaw)
                : { IntervalType: convertInterType(pPanelInfo.interval_type?.toLowerCase()), IntervalValue: 0 };
        setRangeOption(sIntervalTime);
        let sCheckDataLimit: boolean = false;
        let sChangeLimitEnd: number = 0;
        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (sRaw) {
                sFetchResult = await fetchRawData({
                    Table: sTagSetElement.table,
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
                    if (sChangeLimitEnd) sChangeLimitEnd = Math.sign(sChangeLimitEnd - sFetchResult.data.rows.at(-1)[0]) ? sFetchResult.data.rows.at(-1)[0] : sChangeLimitEnd;
                    else sChangeLimitEnd = sFetchResult.data.rows.at(-2)[0];
                }
            } else {
                sFetchResult = await fetchCalculationData({
                    Table: sTagSetElement.table,
                    TagNames: sTagSetElement.tagName,
                    Start: sTimeRange.startTime,
                    End: sTimeRange.endTime,
                    Rollup: isRollup(sRollupTableList, sTagSetElement.table, getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue)),
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                });
            }

            sDatasets.push({
                name: sTagSetElement.alias || `${sTagSetElement.tagName}(${sRaw ? 'raw' : sTagSetElement.calculationMode.toLowerCase()})`,
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
        setChartData({ datasets: sDatasets });
        if (sCheckDataLimit) {
            sDataFetchHandler.current = true;
            setPanelRange({ startTime: sDatasets[0].data[0][0], endTime: sChangeLimitEnd });
            sChartRef && sChartRef.current && sChartRef.current.chart.xAxis[0].setExtremes(sDatasets[0].data[0][0], sChangeLimitEnd);
        }
    };
    const calcInterval = (aBgn: number, aEnd: number, aWidth: number, aIsRaw: boolean): { IntervalType: string; IntervalValue: number } => {
        const sDiff = aEnd - aBgn;
        const sSecond = Math.floor(sDiff / 1000);
        const sCalc = sSecond / (aWidth / (aIsRaw ? pPanelInfo.pixels_per_tick_raw : pPanelInfo.pixels_per_tick));
        const sRet = { type: 'sec', value: 1 };
        if (sCalc > 60 * 60 * 12) {
            // interval > 12H
            sRet.type = 'day';
            sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
        } else if (sCalc > 60 * 60 * 6) {
            // interval > 6H
            sRet.type = 'hour';
            sRet.value = 12;
        } else if (sCalc > 60 * 60 * 3) {
            // interval > 3H
            sRet.type = 'hour';
            sRet.value = 6;
        } else if (sCalc > 60 * 60) {
            // interval > 1H
            sRet.type = 'hour';
            sRet.value = Math.ceil(sCalc / (60 * 60));
        } else if (sCalc > 60 * 30) {
            // interval > 30M
            sRet.type = 'hour';
            sRet.value = 1;
        } else if (sCalc > 60 * 20) {
            // interval > 20M
            sRet.type = 'min';
            sRet.value = 30;
        } else if (sCalc > 60 * 15) {
            // interval > 15M
            sRet.type = 'min';
            sRet.value = 20;
        } else if (sCalc > 60 * 10) {
            // interval > 10M
            sRet.type = 'min';
            sRet.value = 15;
        } else if (sCalc > 60 * 5) {
            // interval > 5M
            sRet.type = 'min';
            sRet.value = 10;
        } else if (sCalc > 60 * 3) {
            // interval > 3M
            sRet.type = 'min';
            sRet.value = 5;
        } else if (sCalc > 60) {
            // interval > 1M
            sRet.type = 'min';
            sRet.value = Math.ceil(sCalc / 60);
        } else if (sCalc > 30) {
            // interval > 30S
            sRet.type = 'min';
            sRet.value = 1;
        } else if (sCalc > 20) {
            // interval > 20S
            sRet.type = 'sec';
            sRet.value = 30;
        } else if (sCalc > 15) {
            // interval > 15S
            sRet.type = 'sec';
            sRet.value = 20;
        } else if (sCalc > 10) {
            // interval > 10S
            sRet.type = 'sec';
            sRet.value = 15;
        } else if (sCalc > 5) {
            // interval > 5S
            sRet.type = 'sec';
            sRet.value = 10;
        } else if (sCalc > 3) {
            // interval > 3S
            sRet.type = 'sec';
            sRet.value = 5;
        } else {
            sRet.type = 'sec';
            sRet.value = Math.ceil(sCalc);
        }
        if (sRet.value < 1) {
            sRet.value = 1;
        }
        return {
            IntervalType: sRet.type,
            IntervalValue: sRet.value,
        };
    };
    const convertInterType = (gUnit: string) => {
        switch (gUnit) {
            case 's':
                return 'sec';
            case 'm':
                return 'min';
            case 'h':
                return 'hour';
            case 'd':
                return 'day';
            default:
                return gUnit;
        }
    };
    const getInterval = (aType: string, aValue: number) => {
        switch (aType) {
            case 'sec':
                return aValue * 1000;
            case 'min':
                return aValue * 60 * 1000;
            case 'hour':
                return aValue * 60 * 60 * 1000;
            case 'day':
                return aValue * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    };
    const resetData = async () => {
        if (pBoardInfo.id === sSelectedTab) {
            if (sChartRef.current && sChartRef.current.chart) {
                let sData: any = { startTime: 0, endTime: 0 };
                let sStartTime = null;
                let sLastTime = null;
                // Set top-level last
                if (!pIsEdit && pBgnEndTimeRange && pBgnEndTimeRange.end_max && typeof pBoardInfo?.range_bgn === 'string' && pBoardInfo.range_bgn?.includes('last')) {
                    sStartTime = subtractTime(pBgnEndTimeRange.end_max, pBoardInfo.range_bgn);
                    sLastTime = pBgnEndTimeRange.end_max / 1000000; // Set milli sec
                }
                // Set panel-level last & now
                if (!pIsEdit && typeof pPanelInfo.range_end === 'string') {
                    if (pPanelInfo.range_end.includes('last')) {
                        const sTimeRange = await getBgnEndTimeRange(
                            pPanelInfo.tag_set,
                            { bgn: pBoardInfo.range_bgn, end: pBoardInfo.range_end },
                            { bgn: pPanelInfo.range_bgn, end: pPanelInfo.range_end }
                        );
                        sStartTime = subtractTime(sTimeRange.end_max as number, pPanelInfo.range_bgn);
                        sLastTime = (sTimeRange.end_max as number) / 1000000; // Set milli sec
                    }
                    if (pPanelInfo.range_end.includes('now')) {
                        const sTimeRange = getDateRange(pPanelInfo, pBoardInfo);
                        sStartTime = sTimeRange.startTime;
                        sLastTime = sTimeRange.endTime;
                    }
                }
                // Set panel-level range
                if (!pIsEdit && typeof pPanelInfo.range_end === 'number') {
                    sStartTime = pPanelInfo.range_bgn;
                    sLastTime = pPanelInfo.range_end;
                }

                if (!pIsEdit && sStartTime && sLastTime) {
                    sData.startTime = sStartTime;
                    sData.endTime = sLastTime;
                } else {
                    // Set top-level now
                    sData = !pIsEdit && getDateRange({}, pBoardInfo?.range_end ? pBoardInfo : { range_bgn: pPanelInfo.default_range.min, range_end: pPanelInfo.default_range.max });
                }
                // Set edit mode
                if (pIsEdit) {
                    sData = { startTime: pBgnEndTimeRange.bgn_min, endTime: pBgnEndTimeRange.end_max };
                }
                sChartRef.current.chart.xAxis[0].setExtremes(sData.startTime, sData.endTime);
                sChartRef.current.chart.navigator.xAxis.setExtremes(sData.startTime, sData.endTime);
            }
        }
    };
    // Set init range
    const setRange = async () => {
        let sData: any = { startTime: 0, endTime: 0 };
        let sStartTime = null;
        let sLastTime = null;
        // Set top-level last
        if (pBgnEndTimeRange && pBgnEndTimeRange.end_max && typeof pBoardInfo.range_bgn === 'string' && pBoardInfo.range_bgn?.includes('last')) {
            if (pIsEdit) {
                sStartTime = pBgnEndTimeRange.bgn_max;
                sLastTime = pBgnEndTimeRange.end_max; // Set milli sec
            } else {
                sStartTime = subtractTime(pBgnEndTimeRange.end_max, pBoardInfo.range_bgn);
                sLastTime = pBgnEndTimeRange.end_max / 1000000; // Set milli sec
            }
        }
        // Set panel-level last & now
        if (typeof pPanelInfo.range_end === 'string') {
            if (pPanelInfo.range_end.includes('last')) {
                const sTimeRange = await getBgnEndTimeRange(
                    pPanelInfo.tag_set,
                    { bgn: pBoardInfo.range_bgn, end: pBoardInfo.range_end },
                    { bgn: pPanelInfo.range_bgn, end: pPanelInfo.range_end }
                );
                sStartTime = subtractTime(sTimeRange.end_max as number, pPanelInfo.range_bgn);
                sLastTime = (sTimeRange.end_max as number) / 1000000; // Set milli sec
            }
            if (pPanelInfo.range_end.includes('now')) {
                const sTimeRange = getDateRange(pPanelInfo, pBoardInfo);
                sStartTime = sTimeRange.startTime;
                sLastTime = sTimeRange.endTime;
            }
        }

        if (sStartTime && sLastTime) {
            sData.startTime = sStartTime;
            sData.endTime = sLastTime;
        } else {
            // now & time range
            sData = getDateRange(pPanelInfo, pBoardInfo);
        }
        if (pPanelInfo.use_time_keeper === 'Y' && pPanelInfo.time_keeper.startPanelTime) {
            fetchPanelData({
                startTime: pPanelInfo.time_keeper.startPanelTime,
                endTime: pPanelInfo.time_keeper.endPanelTime,
            });
            setPanelRange({
                startTime: pPanelInfo.time_keeper.startPanelTime,
                endTime: pPanelInfo.time_keeper.endPanelTime,
            });
            fetchNavigatorData({
                startTime: pPanelInfo.time_keeper.startNaviTime,
                endTime: pPanelInfo.time_keeper.endNaviTime,
            });
            setNavigatorRange({
                startTime: pPanelInfo.time_keeper.startNaviTime,
                endTime: pPanelInfo.time_keeper.endNaviTime,
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
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
            setNavigatorRange({
                startTime: sData.startTime,
                endTime: sData.endTime,
            });
        }
    };
    // Handle save keep data
    const saveKeepData = (aRaw: boolean, aTimeInfo: any) => {
        pSaveKeepData(pPanelInfo.index_key, { ...aTimeInfo }, aRaw);
    };
    // Control helper - min/max popup in chart
    const ctrMinMaxPopupModal = () => {
        if (sIsUpdate) {
            setIsUpdate(false); // btn
            setIsMinMaxMenu(false); // modal
            sAxis.removePlotBand('selection-plot-band'); // plot band
            setAxis(null);
        } else setIsUpdate(true);
    };
    // Control raw value
    const ctrRaw = () => {
        setIsRaw(() => !sIsRaw);
        // Save keep data
        if (sPanelRange.startTime && sChartRef.current?.chart && pSaveKeepData) {
            saveKeepData(!sIsRaw, {
                startPanelTime: sPanelRange.startTime,
                endPanelTime: sPanelRange.endTime,
                startNaviTime: sChartRef.current.chart.navigator.xAxis.getExtremes().min,
                endNaviTime: sChartRef.current.chart.navigator.xAxis.getExtremes().max,
            });
        }
        fetchPanelData(sPanelRange, !sIsRaw);
        fetchNavigatorData(sNavigatorRange, !sIsRaw);
    };
    const getDuration = (aStartTime: number, aEndTime: number): string => {
        const sDuration = moment.duration(aEndTime - aStartTime);
        const sDays = Math.floor(sDuration.asDays());
        return `${sDays === 0 ? '' : sDays + 'd '}${sDuration.hours() === 0 ? '' : sDuration.hours() + 'h '}${sDuration.minutes() === 0 ? '' : sDuration.minutes() + 'm '}${
            sDuration.seconds() === 0 ? '' : sDuration.seconds() + 's '
        }${sDuration.milliseconds() === 0 ? '' : ' ' + sDuration.milliseconds() + 'ms'}`;
    };

    // refresh
    useEffect(() => {
        sChartRef.current && fetchPanelData(sPanelRange);
    }, [pRefreshCount]);
    // save edit info
    useEffect(() => {
        if (pBoardInfo.id === sSelectedTab && sSaveEditedInfo) {
            sSaveEditedInfo && setRange();
            sSaveEditedInfo && setSaveEditedInfo(false);
        }
    }, [pPanelInfo]);
    // update time range & preview
    useEffect(() => {
        sChartRef.current && resetData();
    }, [pBgnEndTimeRange]);

    // init
    useDebounce([], setRange, 100);

    return (
        <div className="panel-form" style={sSelectedChart ? { border: '1px solid #FDB532' } : { border: '1px solid transparent' }}>
            <PanelHeader
                pSetSelectedChart={setSelectedChart}
                pGetChartInfo={pGetChartInfo}
                pIsEdit={pIsEdit}
                pPanelRange={sPanelRange}
                pFetchPanelData={fetchPanelData}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
                pSetIsRaw={ctrRaw}
                pIsRaw={sIsRaw}
                pResetData={resetData}
                pPanelsInfo={pPanelsInfo}
                pSelectedChart={sSelectedChart}
                pRangeOption={sRangeOption}
                pSetIsFFTModal={setIsFFTModal}
                pIsUpdate={sIsUpdate}
                pSetSaveEditedInfo={setSaveEditedInfo}
                pNavigatorRange={sNavigatorRange}
                // pGetBgnEndTime={pGetBgnEndTime}
                // pGetBgnEndTime={resetData}
                pCtrMinMaxPopupModal={ctrMinMaxPopupModal}
            />
            <div className="chart">
                <div style={{ height: '100px', display: 'flex' }}>
                    <div className="left">
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={'Move range'}
                            pToolTipId={'move-time-panel-left' + pPanelInfo.index_key + JSON.stringify(pIsEdit)}
                            pIcon={
                                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                </div>
                            }
                            onClick={() => moveTimRange('l')}
                        />
                    </div>
                </div>
                <div className="chart-body" ref={sAreaChart}>
                    <Chart
                        pAreaChart={sAreaChart}
                        pChartWrap={sChartRef}
                        pPanelInfo={pPanelInfo}
                        pIsRaw={sIsRaw}
                        pSetExtremes={setExtremes}
                        pSetNavigatorExtremes={setNavigatorExtremes}
                        pNavigatorData={sNavigatorData}
                        pChartData={sChartData?.datasets}
                        pPanelRange={sPanelRange}
                        pNavigatorRange={sNavigatorRange}
                        pViewMinMaxPopup={viewMinMaxAvg}
                        pIsUpdate={sIsUpdate}
                        pMinMaxList={sMinMaxList}
                    />
                </div>
                <div style={{ height: '100px', display: 'flex' }}>
                    <div className="right">
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={'Move range'}
                            pToolTipId={'move-time-panel-right' + pPanelInfo.index_key + JSON.stringify(pIsEdit)}
                            pIcon={
                                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowRight style={{ width: '16px', height: '16px' }} />
                                </div>
                            }
                            onClick={() => moveTimRange('r')}
                        />
                    </div>
                </div>
            </div>
            <PanelFooter
                pNavigatorRange={pFooterRange ?? sNavigatorRange}
                pPanelInfo={pPanelInfo}
                pSetButtonRange={setButtonRange}
                pMoveNavigatorTimRange={moveNavigatorTimRange}
            />
            {sIsFFTModal ? <FFTModal pInfo={sMinMaxList} setIsOpen={setIsFFTModal} pStartTime={sFFTMinTime} pEndTime={sFFTMaxTime} pTagColInfo={pPanelInfo.tag_set} /> : null}
            <div ref={sMenuRef} className="menu-position">
                <Menu isOpen={sIsMinMaxMenu}>
                    <div className="time">
                        <div className="time-start-end">
                            {moment(sFFTMinTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~ {moment(sFFTMaxTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                        </div>
                        <div className="menu-position-duration">{'( ' + getDuration(sFFTMinTime, sFFTMaxTime) + ' )'}</div>
                    </div>
                    <table className="table-style">
                        <thead>
                            <tr>
                                <th>name</th>
                                <th>min</th>
                                <th>max</th>
                                <th>avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sMinMaxList.map((aItem: any, aIndex: number) => {
                                return (
                                    <tr key={aItem.name + aIndex}>
                                        <td>{aItem.name}</td>
                                        <td>{aItem.min}</td>
                                        <td>{aItem.max}</td>
                                        <td>{aItem.avg}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <Menu.Item onClick={ctrMinMaxPopupModal}>
                        <div className="close">
                            <Close />
                        </div>
                    </Menu.Item>
                </Menu>
            </div>
        </div>
    );
};
export default Panel;
