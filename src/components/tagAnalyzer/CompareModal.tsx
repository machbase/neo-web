import { Close } from '@/assets/icons/Icon';
import { MdOutlineStackedLineChart } from 'react-icons/md';
import './CompareModal.scss';
import { useEffect, useState, useRef } from 'react';
import CompareChart from './CompareChart';
import { isRollup } from '@/utils';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
const CompareModal = ({ pSetIsModal, pPanelsInfo }: any) => {
    const [sChartData, setChartData] = useState<any>([]);
    const sAreaChart = useRef<any>();
    const [sStartTimeList, setStartTimeList] = useState<any>([]);

    const sRollupTableList = useRecoilValue(gRollupTableList);

    const fetchPanelData = async (aPanelInfo: any) => {
        const sChartWidth = sAreaChart.current.clientWidth === 0 ? 1 : sAreaChart.current.clientWidth;

        const sLimit = aPanelInfo.board.count;
        let sCount = -1;

        if (sLimit < 0) {
            if (aPanelInfo.board.pixels_per_tick > 0) {
                sCount = Math.ceil(sChartWidth / aPanelInfo.board.pixels_per_tick);
            } else {
                sCount = Math.ceil(sChartWidth);
            }
        }
        const sDatasets: any = [];

        const sTagSet = aPanelInfo.board.tag_set || [];
        if (sTagSet.length === 0) {
            setChartData({ datasets: sDatasets });
            return;
        }
        const sTimeRange: any = {
            startTime: aPanelInfo.start as string,
            endTime: (aPanelInfo.start + pPanelsInfo[0].duration) as string,
        };

        const sIntervalTime = calcInterval(sTimeRange.startTime, sTimeRange.endTime, sChartWidth, pPanelsInfo[0].board);

        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (aPanelInfo.isRaw) {
                sFetchResult = await fetchRawData({
                    Table: sTagSetElement.table,
                    TagNames: sTagSetElement.tagName,
                    Start: Math.round(sTimeRange.startTime),
                    End: Math.round(sTimeRange.endTime),
                    Rollup: sTagSetElement.onRollup,
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                });
            } else {
                sFetchResult = await fetchCalculationData({
                    Table: sTagSetElement.table,
                    TagNames: sTagSetElement.tagName,
                    Start: calcTime(Math.round(sTimeRange.startTime), sIntervalTime),
                    End: calcTime(Math.round(sTimeRange.endTime), sIntervalTime),
                    Rollup: isRollup(sRollupTableList, sTagSetElement.table, getInterval(sIntervalTime.IntervalType, sIntervalTime.IntervalValue)),
                    CalculationMode: sTagSetElement.calculationMode.toLowerCase(),
                    ...sIntervalTime,
                    colName: sTagSetElement.colName,
                    Count: sCount,
                });
            }

            setStartTimeList((aPrev: any) => [...aPrev, aPanelInfo.isRaw ? aPanelInfo.start : calcTime(Math.round(sTimeRange.startTime), sIntervalTime)]);
            setChartData((aPrev: any) => [
                ...aPrev,
                {
                    name: sTagSetElement.alias || `${sTagSetElement.tagName}(${aPanelInfo.IsRaw ? 'raw' : sTagSetElement.calculationMode.toLowerCase()})`,
                    data:
                        sFetchResult?.data?.rows?.length > 0
                            ? sFetchResult.data.rows.map((aItem: any) => {
                                  return [aPanelInfo.isRaw ? aItem[0] - aPanelInfo.start : aItem[0] - calcTime(Math.round(sTimeRange.startTime), sIntervalTime), aItem[1]];
                              })
                            : [],
                    yAxis: sTagSetElement.use_y2 === 'Y' ? 1 : 0,
                    marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                },
            ]);
        }
    };

    useEffect(() => {
        for (let i = 0; i < pPanelsInfo.length; i++) {
            fetchPanelData(pPanelsInfo[i]);
        }
    }, []);

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

    const calcTime = (aTime: any, aInterval: any) => {
        let sTime = 1000;
        if (aInterval.IntervalType === 'sec') {
            sTime = 1000 * aInterval.IntervalValue;
        } else if (aInterval.IntervalType === 'min') {
            sTime = 1000 * 60 * aInterval.IntervalValue;
        } else if (aInterval.IntervalType === 'hour') {
            sTime = 1000 * 60 * 60 * aInterval.IntervalValue;
        } else if (aInterval.IntervalType === 'day') {
            sTime = 1000 * 3600 * 24 * aInterval.IntervalValue;
        }

        return Math.floor(aTime / sTime) * sTime;
    };

    const calcInterval = (aBgn: number, aEnd: number, aWidth: number, aPanelInfo: any): { IntervalType: string; IntervalValue: number } => {
        const sDiff = aEnd - aBgn;
        const sSecond = Math.floor(sDiff / 1000);
        const sCalc = sSecond / (aWidth / aPanelInfo.pixels_per_tick);
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

    return (
        <>
            <div onClick={() => pSetIsModal(false)} className="compare-cover"></div>

            <div className="compare-modal">
                <div className="compare-header">
                    <div className="compare-title">
                        <MdOutlineStackedLineChart />
                        Compare Chart
                    </div>
                    <Close onClick={() => pSetIsModal(false)} color="#f8f8f8"></Close>
                </div>
                <div className="compare-body" ref={sAreaChart}>
                    {sChartData[pPanelsInfo.length - 1] && (
                        <CompareChart pStartTimeList={sStartTimeList} pAreaChart={sAreaChart} pChartData={sChartData} pPanelInfo={pPanelsInfo[0].board}></CompareChart>
                    )}
                </div>
            </div>
        </>
    );
};
export default CompareModal;
