import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';

import './Panel.scss';
import Chart from './Chart';
import { useEffect, useRef, useState } from 'react';
import { getDateRange } from '@/utils/helpers/date';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { ArrowLeft, ArrowRight } from '@/assets/icons/Icon';
import { useRecoilValue } from 'recoil';
import { gSelectedTab } from '@/recoil/recoil';

const Panel = ({ pPanelInfo, pBoardInfo, pIsEdit }: any) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<any>();
    const [sChartData, setChartData] = useState<any>();
    const [sNavigatorData, setNavigatorData] = useState<any>();
    const [sPanelRange, setPanelRange] = useState<any>({});
    const [sNavigatorRange, setNavigatorRange] = useState<any>({});
    const [sIsRaw, setIsRaw] = useState<boolean>(false);
    const sSelectedTab = useRecoilValue(gSelectedTab);

    const fetchNavigatorData = async (aTimeRange: any) => {
        const sChartWidth = sAreaChart.current.clientWidth;

        const sLimit = pPanelInfo.count;
        let sCount = -1;

        if (sLimit < 0) {
            if (pPanelInfo.pixels_per_tick > 0) {
                sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick);
            } else {
                sCount = Math.ceil(sChartWidth);
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
                ? calcInterval(sTimeRange.startTime, sTimeRange.endTime, sChartWidth)
                : { IntervalType: convertInterType(pPanelInfo.interval_type?.toLowerCase()), IntervalValue: 0 };

        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];

            sFetchResult = await fetchCalculationData({
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

    const setExtremes = (aEvent: any) => {
        if (aEvent.min) {
            const sRatio = 1 - ((aEvent.max - aEvent.min) * 100) / (sNavigatorRange.endTime - sNavigatorRange.startTime);

            if ((sNavigatorRange.endTime - sNavigatorRange.startTime) / 100 > aEvent.max - aEvent.min) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(
                    Math.round(sNavigatorRange.startTime + (aEvent.min - sNavigatorRange.startTime) * sRatio),
                    Math.round(sNavigatorRange.endTime + (aEvent.max - sNavigatorRange.endTime) * sRatio)
                );
            }
            fetchPanelData({ startTime: Math.round(aEvent.min), endTime: Math.round(aEvent.max) });

            setPanelRange({ startTime: Math.round(aEvent.min), endTime: Math.round(aEvent.max) });
        }
    };
    const setNavigatorExtremes = (aEvent: any) => {
        setNavigatorRange({ startTime: Math.round(aEvent.min), endTime: Math.round(aEvent.max) });
        fetchNavigatorData({ startTime: Math.round(aEvent.min), endTime: Math.round(aEvent.max) });
    };

    const setButtonRange = (aType: string, aZoom: number) => {
        const sCalcTime = (sPanelRange.endTime - sPanelRange.startTime) * aZoom;
        if (aType === 'I') {
            sChartRef.current.chart.xAxis[0].setExtremes(Math.round(sPanelRange.startTime + sCalcTime), Math.round(sPanelRange.endTime - sCalcTime));
        } else if (aType === 'O') {
            const sStartTime = Math.round(sPanelRange.startTime - sCalcTime);
            const sEndTime = Math.round(sPanelRange.endTime + sCalcTime);

            if (sEndTime > sNavigatorRange.endTime || sStartTime < sNavigatorRange.startTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);
            }

            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
        } else {
            const sStartTime = sPanelRange.startTime;
            const sEndTime = sPanelRange.endTime;

            sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sEndTime);

            sChartRef.current.chart.xAxis[0].setExtremes(Math.round(sStartTime + (sEndTime - sStartTime) * 0.4), Math.round(sStartTime + (sEndTime - sStartTime) * 0.6));
        }
    };

    const moveTimRange = (aItem: string) => {
        const sCalcTime = (sPanelRange.endTime - sPanelRange.startTime) / 2;
        if (aItem === 'l') {
            const sStartTime = Math.round(sPanelRange.startTime - sCalcTime);
            const sEndTime = Math.round(sPanelRange.endTime - sCalcTime);

            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
            if (sNavigatorRange.startTime > sStartTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sStartTime, sNavigatorRange.endTime - sCalcTime);
            }
        } else {
            const sStartTime = Math.round(sPanelRange.startTime + sCalcTime);
            const sEndTime = Math.round(sPanelRange.endTime + sCalcTime);
            sChartRef.current.chart.xAxis[0].setExtremes(sStartTime, sEndTime);
            if (sNavigatorRange.endTime < sEndTime) {
                sChartRef.current.chart.navigator.xAxis.setExtremes(sNavigatorRange.startTime + sCalcTime, sEndTime);
            }
        }
    };

    const fetchPanelData = async (aTimeRange?: any) => {
        const sChartWidth = sAreaChart.current.clientWidth;

        const sLimit = pPanelInfo.count;
        let sCount = -1;

        if (sLimit < 0) {
            if (pPanelInfo.pixels_per_tick > 0) {
                sCount = Math.ceil(sChartWidth / pPanelInfo.pixels_per_tick);
            } else {
                sCount = Math.ceil(sChartWidth);
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
                ? calcInterval(sTimeRange.startTime, sTimeRange.endTime, sChartWidth)
                : { IntervalType: convertInterType(pPanelInfo.interval_type?.toLowerCase()), IntervalValue: 0 };

        for (let index = 0; index < sTagSet.length; index++) {
            const sTagSetElement = sTagSet[index];
            let sFetchResult: any = [];
            if (sIsRaw) {
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

                if (sFetchResult.data.rows.length === sCount) {
                    sChartRef.current.chart.xAxis[0].setExtremes(sFetchResult.data.rows[0][0], sFetchResult.data.rows[sFetchResult.data.rows.length - 2][0]);
                }
            } else {
                sFetchResult = await fetchCalculationData({
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
            }

            sDatasets.push({
                name: sTagSetElement.alias || `${sTagSetElement.tagName}(${sIsRaw ? 'raw' : sTagSetElement.calculationMode.toLowerCase()})`,
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
    };

    const calcInterval = (aBgn: number, aEnd: number, aWidth: number): { IntervalType: string; IntervalValue: number } => {
        const sDiff = aEnd - aBgn;
        const sSecond = Math.floor(sDiff / 1000);
        const sCalc = sSecond / (aWidth / pPanelInfo.pixels_per_tick);
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

    useEffect(() => {
        if (sPanelRange.startTime) fetchPanelData(sPanelRange);
    }, [sIsRaw]);

    useEffect(() => {
        if (pBoardInfo.id === sSelectedTab) {
            if (sPanelRange.startTime) fetchPanelData(sPanelRange);
            if (sPanelRange.startTime) fetchNavigatorData(sNavigatorRange);
        }
    }, [pPanelInfo]);

    useEffect(() => {
        if (pBoardInfo.id === sSelectedTab) {
            if (sChartRef.current && sChartRef.current.chart) {
                const sData: any = getDateRange(pPanelInfo, pBoardInfo);
                sChartRef.current.chart.xAxis[0].setExtremes(sData.startTime + (sData.endTime - sData.startTime) * 0.4, sData.startTime + (sData.endTime - sData.startTime) * 0.6);
                sChartRef.current.chart.navigator.xAxis.setExtremes(sData.startTime, sData.endTime);
            }
        }
    }, [pBoardInfo.range_bgn, pBoardInfo.range_end, pPanelInfo.range_bgn, pPanelInfo.range_end]);

    useEffect(() => {
        const sData: any = getDateRange(pPanelInfo, pBoardInfo);
        fetchPanelData({
            startTime: Math.round(sData.startTime + (sData.endTime - sData.startTime) * 0.4),
            endTime: Math.round(sData.startTime + (sData.endTime - sData.startTime) * 0.6),
        });
        fetchNavigatorData({
            startTime: Math.round(sData.startTime),
            endTime: Math.round(pPanelInfo.default_range.max),
        });
        setPanelRange({
            startTime: Math.round(sData.startTime + (sData.endTime - sData.startTime) * 0.4),
            endTime: Math.round(sData.startTime + (sData.endTime - sData.startTime) * 0.6),
        });
        setNavigatorRange({
            startTime: Math.round(sData.startTime),
            endTime: Math.round(sData.endTime),
        });
    }, []);

    return (
        <div className="panel-form">
            <PanelHeader
                pIsEdit={pIsEdit}
                pPanelRange={sPanelRange}
                pFetchPanelData={fetchPanelData}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
                pSetIsRaw={setIsRaw}
                pIsRaw={sIsRaw}
            ></PanelHeader>
            <div className="chart">
                <div className="left" onClick={() => moveTimRange('l')}>
                    <ArrowLeft />
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
                    ></Chart>
                </div>
                <div className="right" onClick={() => moveTimRange('r')}>
                    <ArrowRight />
                </div>
            </div>
            <PanelFooter pPanelInfo={pPanelInfo} pSetButtonRange={setButtonRange}></PanelFooter>
        </div>
    );
};
export default Panel;