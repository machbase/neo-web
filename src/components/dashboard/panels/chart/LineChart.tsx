import { fetchMountTimeMinMax, fetchTimeMinMax, getTqlChart, getTqlScripts } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { calcInterval, calcRefreshTime, decodeFormatterFunction, setUnitTime } from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import { ShowChart } from '@/components/tql/ShowChart';
import { DashboardQueryParser } from '@/utils/DashboardQueryParser';
import { DashboardChartCodeParser } from '@/utils/DashboardChartCodeParser';
import { DashboardChartOptionParser } from '@/utils/DashboardChartOptionParser';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import './LineChart.scss';
import { TqlChartParser } from '@/utils/DashboardTqlChartParser';
import moment from 'moment';

const LineChart = ({
    pIsActiveTab,
    pLoopMode,
    pChartVariableId,
    pPanelInfo,
    pType,
    pInsetDraging,
    pDragStat,
    pModifyState,
    pSetModifyState,
    pParentWidth,
    pIsHeader,
    pBoardTimeMinMax,
    pBoardInfo,
}: any) => {
    const ChartRef = useRef<HTMLDivElement>(null);
    const [sChartData, setChartData] = useState<any>({});
    const [sIsMessage, setIsMessage] = useState<any>('Please set up a Query.');
    const [sIsError, setIsError] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sIsMounted, setIsMounted] = useState<boolean>(false);
    const [sIsChartData, setIsChartData] = useState<boolean>(false);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    let sRefClientWidth = 0;
    let sRefClientHeight = 0;

    const calculateTimeRange = () => {
        let sStartTimeBeforeStart = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.start : pBoardTimeMinMax.min;
        let sStartTimeBeforeEnd = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.end : pBoardTimeMinMax.max;
        if (String(sStartTimeBeforeStart).includes('now') && String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }
        return { start: sStartTimeBeforeStart, end: sStartTimeBeforeEnd };
    };

    const executeTqlChart = async (aWidth?: number) => {
        if (!pIsActiveTab && pType !== 'create' && pType !== 'edit') {
            return;
        }
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

        let sStartTime = undefined;
        let sEndTime = undefined;
        if (pPanelInfo.useCustomTime) {
            const sTimeMinMax = await handlePanelTimeRange(pPanelInfo.timeRange.start, pPanelInfo.timeRange.end);
            sStartTime = sTimeMinMax.min;
            sEndTime = sTimeMinMax.max;
        } else {
            sStartTime = pBoardTimeMinMax?.min;
            sEndTime = pBoardTimeMinMax?.max;
        }

        const sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, sRefClientWidth);
        if (pPanelInfo.type === 'Tql chart') {
            const sResult: any = await getTqlScripts(TqlChartParser(pPanelInfo.tqlInfo, calculateTimeRange(), sIntervalInfo));
            if (!sResult?.data?.reason) {
                setChartData(sResult);
                setIsError(false);
                setIsChartData(true);
            } else {
                setIsMessage(sResult?.data?.reason ?? '');
                setIsError(true);
                setIsChartData(false);
            }
        } else {
            if (!sStartTime || !sEndTime) return;
            const [sParsedQuery, sAliasList] = DashboardQueryParser(
                chartTypeConverter(pPanelInfo.type),
                pPanelInfo.blockList,
                sRollupTableList,
                pPanelInfo.xAxisOptions,
                {
                    interval: sIntervalInfo,
                    start: sStartTime,
                    end: sEndTime,
                },
                pBoardInfo.dashboard.variables
            );
            const sParsedChartOption = DashboardChartOptionParser(pPanelInfo, sAliasList, { startTime: sStartTime, endTime: sEndTime });
            const sParsedChartCode = DashboardChartCodeParser(pPanelInfo.chartOptions, chartTypeConverter(pPanelInfo.type), sParsedQuery);

            const sResult: any = await getTqlChart(
                `FAKE(linspace(0, 1, 1))
                 CHART(
                    ${`chartID('${pChartVariableId + '-' + pPanelInfo.id}'),`}
                    ${pPanelInfo.plg ? `plugins('${pPanelInfo.plg}'),` : ''}
                    theme('${pPanelInfo.theme}'),
                    size('${sRefClientWidth}px','${sRefClientHeight}px'),
                    chartOption(${decodeFormatterFunction(JSON.stringify(sParsedChartOption))}),
                    chartJSCode(${sParsedChartCode})
                )`,
                'dsh'
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
        }
        setIsLoading(false);
        pSetModifyState({ id: '', state: false });
    };
    const sSetIntervalTime = () => {
        if (pType === 'create' || pType === 'edit') return null;
        if (pPanelInfo.timeRange.refresh !== 'Off') return calcRefreshTime(pPanelInfo.timeRange.refresh);
        return null;
    };
    const fetchTableTimeMinMax = async (): Promise<{ min: number; max: number }> => {
        const sTargetPanel = pPanelInfo;
        const sTargetTag = sTargetPanel.blockList[0];
        const sIsTagName = sTargetTag.tag && sTargetTag.tag !== '';
        const sCustomTag = sTargetTag.filter.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;
        if (sIsTagName || (sTargetTag.useCustom && sCustomTag)) {
            let sSvrResult: any = undefined;
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            }
            const sResult: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            return sResult;
        } else {
            const sNowTime = moment().unix() * 1000;
            const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
            return sNowTimeMinMax;
        }
    };
    const handlePanelTimeRange = async (sStart: any, sEnd: any) => {
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        return timeMinMaxConverter(sStart, sEnd, sSvrRes);
    };

    useEffect(() => {
        if (!pModifyState.state && sIsMounted && (!pPanelInfo.useCustomTime || pBoardTimeMinMax?.refresh)) {
            executeTqlChart();
        }
    }, [pBoardTimeMinMax]);
    useEffect(() => {
        if (pModifyState.state && pModifyState.id === pPanelInfo.id) {
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
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!(ChartRef && ChartRef?.current)) return;
        if (pIsActiveTab && sIsMounted && ChartRef.current.dataset && !ChartRef.current.dataset.processed) executeTqlChart();
    }, [pIsActiveTab]);

    useOverlapTimeout(() => {
        !sIsLoading && executeTqlChart();
    }, sSetIntervalTime());

    return (
        <div ref={ChartRef} className={`chart-form ${sIsError ? 'chart-message-error' : 'chart-message-success'} ${!pIsHeader ? 'chart-non-header' : ''}`}>
            {sIsLoading && !sIsChartData ? <div className="loading">Loading...</div> : null}
            {!sIsLoading && sIsError && sIsMessage ? <div>{sIsMessage}</div> : null}
            {!sIsLoading && !sIsError && !sIsChartData ? <div>{sIsMessage}</div> : null}
            {sIsChartData ? (
                <ShowChart
                    pLoopMode={pLoopMode}
                    pData={sChartData}
                    pPanelType={pPanelInfo.type === 'Tql chart'}
                    pPanelId={pChartVariableId + '-' + pPanelInfo.id}
                    pPanelSize={ChartRef}
                    pTheme={pPanelInfo.theme}
                />
            ) : null}
        </div>
    );
};

export default LineChart;
