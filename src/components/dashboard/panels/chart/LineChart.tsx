import { getTqlChart } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import {
    calcInterval,
    calcRefreshTime,
    createSeriesOption,
    createQuery,
    removeColumnQuotes,
    setUnitTime,
    createMapValueForTag,
    createGaugeQuery,
    createPieQuery,
    createMapValueForPie,
} from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import './LineChart.scss';
import { ShowChart } from '@/components/tql/ShowChart';
import { isObjectEmpty } from '@/utils';
import { DashboardQueryParser } from '@/utils/DashboardQueryParser';

const LineChart = ({ pPanelInfo, pBoardInfo, pType, pInsetDraging, pDragStat }: any) => {
    const ChartRef = useRef<any>();
    const [sChartData, setChartData] = useState<any>({});
    const [sIsMessage, setIsMessage] = useState<any>('Please set up a Query.');
    const [sIsError, setIsError] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
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
        let lastQuery: string = '';
        let sMapValueQuery: string = '';

        const sPanelTimeRange = pPanelInfo.timeRange;
        const sBoardTimeRange = pBoardInfo.dashboard.timeRange;

        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end);

        const sIntervalInfo = calcInterval(sStartTime, sEndTime, sRefClientWidth.current);
        const sTagList = [] as string[];

        pPanelInfo.tagTableInfo.forEach((aInfo: any) => {
            if (aInfo.useCustom) {
                aInfo.filter.forEach((aItem: any) => {
                    aItem.value
                        .replace(/['"]/g, '')
                        .replace(/\s+/g, '')
                        .split(',')
                        .map((aTag: string) => {
                            sTagList.push(aTag);
                        });
                });
            } else {
                sTagList.push(aInfo.tag);
            }
        });

        if (pPanelInfo.type === 'gauge') {
            // only one tag
            lastQuery = createGaugeQuery(pPanelInfo.tagTableInfo[0], sIntervalInfo, sStartTime, sEndTime);
        } else if (pPanelInfo.type === 'pie') {
            lastQuery = createPieQuery(pPanelInfo.tagTableInfo[0], sIntervalInfo, sStartTime, sEndTime);
            sMapValueQuery = createMapValueForPie();
        } else {
            for (let i = 0; i < pPanelInfo.tagTableInfo.length; i++) {
                const sQuery: string = createQuery(pPanelInfo.tagTableInfo[i], sIntervalInfo, sStartTime, sEndTime);

                if (i === 0) {
                    lastQuery += sQuery;
                } else {
                    lastQuery += '\nUNION ALL\n' + sQuery;
                }
            }
            sMapValueQuery = createMapValueForTag(sTagList, sTagList.length);
        }

        const sResult: any = await getTqlChart(
            'SQL(`' +
                lastQuery +
                '`)\n' +
                `TAKE(${(sRefClientWidth.current / 3).toFixed()})\n` +
                sMapValueQuery +
                'CHART(' +
                `theme('${pPanelInfo.theme}'),` +
                `size('${sRefClientWidth.current}px','${sRefClientHeight.current}px'), ` +
                `chartOption(
                        ${removeColumnQuotes(JSON.stringify(createSeriesOption(pPanelInfo, sTagList)))}
                    )` +
                ')'
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
