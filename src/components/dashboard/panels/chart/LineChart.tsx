import { getTqlChart } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import {
    calcInterval,
    calcRefreshTime,
    decodeFormatterFunction,
    // createQuery,
    // removeColumnQuotes,
    // createMapValueForTag,
    // createGaugeQuery,
    // createPieQuery,
    // createMapValueForPie,
    // createSeriesOption, createQuery, removeColumnQuotes,
    // createMapValueForTag,
    setUnitTime,
} from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import './LineChart.scss';
import { ShowChart } from '@/components/tql/ShowChart';
import { DashboardQueryParser } from '@/utils/DashboardQueryParser';
import { DashboardChartCodeParser } from '@/utils/DashboardChartCodeParser';
import { DashboardChartOptionParser } from '@/utils/DashboardChartOptionParser';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { chartTypeConverter } from '@/utils/eChartHelper';

const LineChart = ({
    pLoopMode,
    pChartVariableId,
    pRefresh,
    pSetRefresh,
    pPanelInfo,
    pBoardInfo,
    pType,
    pInsetDraging,
    pDragStat,
    pModifyState,
    pSetModifyState,
    pParentWidth,
    pIsHeader,
}: // pIsView,
any) => {
    const ChartRef = useRef<HTMLDivElement>(null);
    const [sChartData, setChartData] = useState<any>({});
    const [sIsMessage, setIsMessage] = useState<any>('Please set up a Query.');
    const [sIsError, setIsError] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sIsMounted, setIsMounted] = useState<boolean>(false);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sIsChartData, setIsChartData] = useState<boolean>(false);
    let sRefClientWidth = 0;
    let sRefClientHeight = 0;

    const executeTqlChart = async (aWidth?: number) => {
        setIsLoading(true);
        !pLoopMode && setChartData({});
        if (ChartRef.current && ChartRef.current.clientWidth !== 0 && !aWidth) {
            sRefClientWidth = ChartRef.current.clientWidth;
        }
        if (ChartRef.current && ChartRef.current.clientHeight !== 0 && !aWidth) {
            sRefClientHeight = ChartRef.current.clientHeight;
        }
        // width, height when display none
        if (sRefClientWidth === 0) sRefClientWidth = Math.floor(pParentWidth / GRID_LAYOUT_COLS) * pPanelInfo.w - 10;
        if (sRefClientHeight === 0) sRefClientHeight = (GRID_LAYOUT_ROW_HEIGHT + 10) * (pPanelInfo.h - 1) - (pIsHeader ? 5 : -25);

        const sPanelTimeRange = pPanelInfo.timeRange;
        const sBoardTimeRange = pBoardInfo.dashboard.timeRange;
        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start ?? '') : setUnitTime(sBoardTimeRange.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end ?? '') : setUnitTime(sBoardTimeRange.end);
        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, sRefClientWidth);
        // const sTake = Number((sRefClientWidth / 3).toFixed());
        // The variable below is used to adjust its value to a multiple of the number of tags.
        // const sTakeCount = sTake % sTagList.length === 0 ? sTake : sTake + (sTagList.length - (sTake % sTagList.length));

        const [sParsedQuery, sAliasList] = await DashboardQueryParser(chartTypeConverter(pPanelInfo.type), pPanelInfo.blockList, sRollupTableList, {
            interval: sIntervalInfo,
            start: sStartTime,
            end: sEndTime,
        });
        const sParsedChartOption = await DashboardChartOptionParser(pPanelInfo, sAliasList);
        const sParsedChartCode = await DashboardChartCodeParser(pPanelInfo.chartOptions, chartTypeConverter(pPanelInfo.type), sParsedQuery);

        const sResult: any = await getTqlChart(
            `FAKE(linspace(0, 1, 1))
             CHART(
                ${`chartID('${pChartVariableId + '-' + pPanelInfo.id}'),`}
                ${pPanelInfo.plg ? `plugins('${pPanelInfo.plg}'),` : ''}
                theme('${pPanelInfo.theme}'),
                size('${sRefClientWidth}px','${sRefClientHeight}px'),
                chartOption(${decodeFormatterFunction(JSON.stringify(sParsedChartOption))}),
                chartJSCode(${sParsedChartCode})
            )`
        );
        if (!sResult.data.reason) {
            setChartData(sResult.data);
            setIsError(false);
            setIsChartData(true);
        } else {
            setIsMessage(sResult.data.reason);
            setIsError(true);
            setIsChartData(false);
        }
        setIsLoading(false);
        pSetModifyState({ id: '', state: false });
    };

    const sSetIntervalTime = () => {
        if (pType === 'create' || pType === 'edit') return null;
        if (pPanelInfo.timeRange.refresh !== 'Off') return calcRefreshTime(pPanelInfo.timeRange.refresh);
        if (pBoardInfo.dashboard.timeRange.refresh !== 'Off') return calcRefreshTime(pBoardInfo.dashboard.timeRange.refresh);
        return null;
    };

    useEffect(() => {
        if (pRefresh) {
            executeTqlChart();
            pSetRefresh(0);
        }
    }, [pRefresh]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if ((pModifyState.state, pModifyState.id === pPanelInfo.id)) {
            executeTqlChart();
        }
    }, [pModifyState]);

    useEffect(() => {
        if (pType !== 'create' && !pModifyState.state) {
            executeTqlChart();
        } else {
            if (sIsMounted) {
                executeTqlChart();
            }
        }
    }, [pPanelInfo.w, pPanelInfo.h, pIsHeader]);

    useEffect(() => {
        if (sIsMounted && !pPanelInfo.useCustomTime) {
            executeTqlChart();
        }
    }, [pBoardInfo.dashboard.timeRange.start, pBoardInfo.dashboard.timeRange.end]);

    useEffect(() => {
        if (sIsMounted && !pInsetDraging) {
            executeTqlChart();
        }
    }, [pInsetDraging]);

    useEffect(() => {
        if (sIsMounted && !pDragStat) {
            executeTqlChart();
        }
    }, [pDragStat]);

    useEffect(() => {
        if (sIsMounted && !pDragStat && !pInsetDraging) executeTqlChart(pParentWidth);
    }, [pParentWidth]);

    useOverlapTimeout(() => {
        !sIsLoading && executeTqlChart();
    }, sSetIntervalTime());

    return (
        <div ref={ChartRef} className={`chart-form ${sIsError ? 'chart-message-error' : 'chart-message-success'} ${!pIsHeader ? 'chart-non-header' : ''}`}>
            {sIsLoading && !sIsChartData ? <div className="loading">Loading...</div> : null}
            {!sIsLoading && sIsError && sIsMessage ? <div>{sIsMessage}</div> : null}
            {!sIsLoading && !sIsError && !sIsChartData ? <div>{sIsMessage}</div> : null}
            {sIsChartData ? <ShowChart pLoopMode={pLoopMode} pData={sChartData} /> : null}
        </div>
    );
};

export default LineChart;
