import { getTqlChart } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { calcInterval, calcRefreshTime, createSeriesOption, createQuery, removeColumnQuotes, setUnitTime, createMapValueForTag } from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import './LineChart.scss';
import { ShowChart } from '@/components/tql/ShowChart';
import { isObjectEmpty } from '@/utils';
import { DashboardQueryParser } from '@/utils/DashboardQueryParser';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';

const LineChart = ({ pPanelInfo, pBoardInfo, pType, pInsetDraging, pDragStat }: any) => {
    const ChartRef = useRef<any>();
    const [sChartData, setChartData] = useState<any>({});
    const [sIsMessage, setIsMessage] = useState<any>('Please set up a Query.');
    const [sIsError, setIsError] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const sChangedValue = useRef<boolean>(false);
    const sTimerRef = useRef<boolean>(false);
    const didMount = useRef(false);
    const sRefClientWidth = useRef<number>(0);
    const sRefClientHeight = useRef<number>(0);

    const setForm = async () => {
        setIsLoading(true);
        setChartData({});
        if (ChartRef.current.clientWidth !== 0) {
            sRefClientWidth.current = ChartRef.current.clientWidth;
        }
        if (ChartRef.current.clientHeight !== 0) {
            sRefClientHeight.current = ChartRef.current.clientHeight;
        }
        sTimerRef.current = true;

        const sPanelTimeRange = pPanelInfo.timeRange;
        const sBoardTimeRange = pBoardInfo.dashboard.timeRange;
        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end);
        const sIntervalInfo = calcInterval(sStartTime, sEndTime, sRefClientWidth.current);

        const sParsedQuery = await DashboardQueryParser(pPanelInfo.tagTableInfo, sRollupTableList, { interval: sIntervalInfo, start: sStartTime, end: sEndTime });
        console.log('sParsedQueryList', sParsedQuery);

        // const sResult: any = await getTqlChart(
        //     'SQL(`' +
        //         sParsedQuery +
        //         '`)\n' +
        //         `TAKE(${(sRefClientWidth.current / 3).toFixed()})\n` +
        //         // createMapValueForTag(sTagList, sTagList.length) +
        //         'CHART(' +
        //         `theme('${pPanelInfo.theme}'),` +
        //         `size('${sRefClientWidth.current}px','${sRefClientHeight.current}px'), ` +
        //         `chartOption(
        //             )` +
        //         ')'
        //     // ${removeColumnQuotes(JSON.stringify(createSeriesOption(pPanelInfo, sTagList)))}
        // );

        const sResult: any = await getTqlChart(
            `FAKE(linspace(0, 1, 1))
            CHART(
                chartOption({
                    "legend": { "show":true, "bottom": 10 },
                    "xAxis": { "type": "time" },
                    "yAxis": {},
                    "animation": false,
                    "tooltip": {
                    "show": true,
                    "trigger": "item",
                    "formatter": null
                },
                    "series": [
                        {
                            "type": "line",
                            "connectNulls": false,
                            "name": "test",
                            "data": []
                        },
                        {
                            "type": "line",
                            "connectNulls": false,
                            "name": "tag01",
                            "data": []
                        }
                    ]
                }),
                chartJSCode({
                    let sDatas = [
                        {"q":"SELECT TIME, VALUE FROM EXAMPLE WHERE TIME > TO_DATE('2023-12-19')  AND NAME IN ('tag00') ORDER BY TIME", "i":0},
                        {"q":"SELECT TIME, VALUE FROM EXAMPLE WHERE TIME > TO_DATE('2023-12-19')  AND NAME IN ('tag01') ORDER BY TIME", "i":1}
                        ]
            
                    function getData(aTql, aIdx) {
                        fetch("http://127.0.0.1:5654/db/tql", {
                            method: "POST",
                            body: aTql
                        }).then(function(rsp){
                            return rsp.json()
                        }).then(function(obj){
                            _chartOption.series[aIdx].data = obj.data.rows
                            _chart.setOption(_chartOption)
                        }).catch(function(err){
                            console.warn("data fetch error", err)
                        });
                    };
            
                    sDatas.forEach((aData)=>{
                        getData(\`SQL("\${aData.q}")
                        JSON()
                        \`, aData.i);
                    })
                })
            )`
        );

        if (!sResult.data.reason) {
            setChartData(sResult.data);
            setIsError(false);
        } else {
            setIsMessage(sResult.data.reason);
            setIsError(true);
        }
        sTimerRef.current = false;
        setIsLoading(false);
    };

    const sSetIntervalTime = () => {
        if (pType === 'create' || pType === 'edit') return null;
        if (pPanelInfo.timeRange.refresh === 'Off') {
            if (pBoardInfo.dashboard.timeRange.refresh === 'Off') {
                return null;
            } else {
                return calcRefreshTime(pBoardInfo.dashboard.timeRange.refresh);
            }
        } else {
            return calcRefreshTime(pPanelInfo.timeRange.refresh);
        }
    };

    useEffect(() => {
        if (pType !== 'create' && pType !== 'edit') {
            sChangedValue.current = true;
        }
        if (pType === 'create') {
            if (didMount.current) setForm();
        } else {
            setForm();
        }
    }, [pPanelInfo.h, pPanelInfo.w, pPanelInfo.theme, pPanelInfo.type, pPanelInfo.chartInfo, pPanelInfo.tagTableInfo]);

    useEffect(() => {
        if (pType === 'create') {
            if (didMount.current) {
                setForm();
            }
        } else {
            if (!pPanelInfo.useCustomTime) {
                setForm();
            }
        }
    }, [pBoardInfo.dashboard.timeRange.start, pBoardInfo.dashboard.timeRange.end]);

    useOverlapTimeout(() => {
        !sTimerRef.current && setForm();
    }, sSetIntervalTime());

    useEffect(() => {
        if (didMount.current) {
            if (!pInsetDraging) {
                setForm();
            }
        }
    }, [pInsetDraging]);

    useEffect(() => {
        if (didMount.current) {
            if (!pDragStat) {
                setForm();
            }
        } else didMount.current = true;
    }, [pDragStat]);

    return (
        <div ref={ChartRef} style={{ color: sIsError ? 'rgb(231, 65, 131)' : 'rgb(65, 153, 255)' }} className="chart-form">
            {sIsLoading ? <div>Loading...</div> : null}
            {!sIsLoading && sIsError && sIsMessage ? <div>{sIsMessage}</div> : null}
            {!sIsLoading && !sIsError && isObjectEmpty(sChartData) ? <div>{sIsMessage}</div> : null}
            {!isObjectEmpty(sChartData) ? <ShowChart pData={sChartData} /> : null}
        </div>
    );
};

export default LineChart;
