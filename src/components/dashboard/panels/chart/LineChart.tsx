import './LineChart.scss';
import { fetchMountTimeMinMax, fetchTimeMinMax, getTqlChart, getTqlScripts } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { calcInterval, calcRefreshTime, decodeFormatterFunction, PanelIdParser, setUnitTime } from '@/utils/dashboardUtil';
import { subscribeTimeRangeChange, unsubscribeTimeRangeChange, TimeRangeEvent, getVideoPanelStateForChart } from '@/hooks/useVideoSync';
import { useEffect, useRef, useState } from 'react';
import {
    DashboardQueryParser,
    // DashboardHasValueQueryParser,
    SqlResDataType,
} from '@/utils/DashboardQueryParser';
import { DashboardChartCodeParser } from '@/utils/DashboardChartCodeParser';
import { DashboardChartOptionParser } from '@/utils/DashboardChartOptionParser';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { ChartThemeTextColor, GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { timeMinMaxConverter } from '@/utils/bgnEndTimeRange';
import { TqlChartParser } from '@/utils/DashboardTqlChartParser';
import moment from 'moment';
import { ShowVisualization } from '@/components/tql/ShowVisualization';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '@/utils/TQL/TqlResParser';
import { Markdown } from '@/components/worksheet/Markdown';
import { isValidJSON } from '@/utils';
import TABLE from '@/components/table';
import { TqlCsvParser } from '@/utils/tqlCsvParser';
import { FakeTextBlock } from '@/utils/helpers/Dashboard/BlockHelper';
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';
// import TQL from '@/utils/TqlGenerator';
// import { Toast } from '@/design-system/components';

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
    const [sChartData, setChartData] = useState<any>(undefined);
    const [sIsMessage, setIsMessage] = useState<any>('Please set up a Query.');
    const [sIsError, setIsError] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sIsMounted, setIsMounted] = useState<boolean>(false);
    const [sIsChartData, setIsChartData] = useState<boolean>(false);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sTqlResultType, setTqlResultType] = useState<'html' | TqlResType>(TqlResType.VISUAL);
    const [sTqlData, setTqlData] = useState<any>(undefined);
    const [sGeomapTitle, setGeomapTitle] = useState<string | undefined>(undefined);
    const [sVideoTimeRange, setVideoTimeRange] = useState<{ start: Date; end: Date } | null>(null);
    const prevVideoTimeRangeRef = useRef<{ start: Date; end: Date } | null | undefined>(undefined);
    let sRefClientWidth = 0;
    let sRefClientHeight = 0;

    const calculateTimeRange = () => {
        // Check if this chart is dependent on a Live video
        const videoState = getVideoPanelStateForChart(pBoardInfo?.id, pPanelInfo.id);

        // Live video charts always use dashboard time (ignore video time range and panel custom time)
        // This is a core design principle: Live charts follow dashboard time, not video time
        if (videoState?.isLive) {
            // Always use board time for Live charts (ignore panel's useCustomTime setting)
            let sStartTimeBeforeStart = pBoardTimeMinMax.min;
            let sStartTimeBeforeEnd = pBoardTimeMinMax.max;

            // Convert if either start or end contains 'now' or 'last'
            const sStartStr = String(sStartTimeBeforeStart);
            const sEndStr = String(sStartTimeBeforeEnd);

            if (sStartStr.includes('now') || sStartStr.includes('last') || sEndStr.includes('now') || sEndStr.includes('last')) {
                sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
                sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
            }

            return { start: sStartTimeBeforeStart, end: sStartTimeBeforeEnd };
        }

        // Use video time range if available (for Normal/Sync videos only)
        if (sVideoTimeRange) {
            return { start: sVideoTimeRange.start.getTime(), end: sVideoTimeRange.end.getTime() };
        }

        let sStartTimeBeforeStart = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.start : pBoardTimeMinMax.min;
        let sStartTimeBeforeEnd = pPanelInfo.useCustomTime ? pPanelInfo.timeRange.end : pBoardTimeMinMax.max;

        // Convert if either start or end contains 'now' or 'last'
        const sStartStr = String(sStartTimeBeforeStart);
        const sEndStr = String(sStartTimeBeforeEnd);

        if (sStartStr.includes('now') || sStartStr.includes('last') || sEndStr.includes('now') || sEndStr.includes('last')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }

        return { start: sStartTimeBeforeStart, end: sStartTimeBeforeEnd };
    };

    // const timeRangeChecker = async (aTime: any) => {
    //     const { sHasState, sHasQuery } = DashboardHasValueQueryParser(
    //         chartTypeConverter(pPanelInfo.type),
    //         SqlResDataType(chartTypeConverter(pPanelInfo.type)),
    //         pPanelInfo.blockList,
    //         sRollupTableList,
    //         aTime
    //     );
    //     if (sHasState) {
    //         const sResult: any = await getTqlChart(`SQL("${sHasQuery}")\n${TQL.SINK._JSON()}`, 'dsh');
    //         if (sResult?.data?.data?.rows?.[0]?.[0] <= 0)
    //             Toast.error(`No data exists from ${moment(aTime.start).format('yyyy-MM-DD HH:mm:ss')} to ${moment(aTime.end).format('yyyy-MM-DD HH:mm:ss')}.`);
    //     }
    // };
    const executeTqlChart = async (aWidth?: number) => {
        if (!pIsActiveTab && pType !== 'create' && pType !== 'edit') return;
        setIsLoading(true);
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

        // Check if this chart is dependent on a Live video
        const videoState = getVideoPanelStateForChart(pBoardInfo?.id, pPanelInfo.id);

        // Live video charts always use dashboard time (ignore video time range and panel custom time)
        // This is a core design principle: Live charts follow dashboard time, not video time
        if (videoState?.isLive) {
            // Always use board time for Live charts (ignore panel's useCustomTime setting)
            sStartTime = setUnitTime(pBoardTimeMinMax?.min);
            sEndTime = setUnitTime(pBoardTimeMinMax?.max);
        } else if (sVideoTimeRange) {
            // Use video time range for Normal/Sync video charts
            sStartTime = sVideoTimeRange.start.getTime();
            sEndTime = sVideoTimeRange.end.getTime();
        } else if (pPanelInfo.useCustomTime) {
            const sTimeMinMax = await handlePanelTimeRange(pPanelInfo.timeRange.start, pPanelInfo.timeRange.end);
            if (!sTimeMinMax) {
                sStartTime = setUnitTime(pPanelInfo.timeRange.start);
                sEndTime = setUnitTime(pPanelInfo.timeRange.end);
            } else {
                sStartTime = sTimeMinMax.min;
                sEndTime = sTimeMinMax.max;
            }
        } else {
            sStartTime = setUnitTime(pBoardTimeMinMax?.min);
            sEndTime = setUnitTime(pBoardTimeMinMax?.max);
        }

        let sIntervalInfo = pPanelInfo.isAxisInterval ? pPanelInfo.axisInterval : calcInterval(sStartTime, sEndTime, sRefClientWidth);

        if (pPanelInfo.type === 'Geomap')
            sIntervalInfo = {
                IntervalType: pPanelInfo.chartOptions.intervalType,
                IntervalValue: pPanelInfo.chartOptions.intervalValue,
            };
        if (pPanelInfo.type === 'Tql chart') {
            !pLoopMode && setChartData(undefined);
            setIsLoading(false);

            const sResult: any = await getTqlScripts(TqlChartParser(pPanelInfo.tqlInfo, calculateTimeRange(), sIntervalInfo, pBoardInfo.dashboard.variables));
            const { parsedStatus, parsedType, parsedData } = DetermineTqlResultType(E_TQL_SCR.DSH, { status: sResult?.status, headers: sResult?.headers, data: sResult?.data });

            setTqlResultType(parsedType);
            setIsError(!parsedStatus);

            if (!parsedStatus) {
                setTqlData(undefined);
                setIsMessage(parsedData);
                return;
            }
            if (parsedType === TqlResType.VISUAL) {
                setChartData(parsedData);
                setIsChartData(parsedStatus);
            } else if (parsedType === TqlResType.CSV) {
                const [sParsedCsvBody] = TqlCsvParser(parsedData);
                setTqlData(sParsedCsvBody);
            } else setTqlData(parsedData);
        } else {
            setTqlResultType(TqlResType.VISUAL);
            if (!sStartTime || !sEndTime) return;
            // timeRangeChecker({
            //     interval: sIntervalInfo,
            //     start: sStartTime,
            //     end: sEndTime,
            // });

            let [sParsedQuery, sAliasList, sInjectionSrc] = DashboardQueryParser(
                chartTypeConverter(pPanelInfo.type),
                SqlResDataType(chartTypeConverter(pPanelInfo.type)),
                pPanelInfo.blockList,
                pPanelInfo.transformBlockList,
                sRollupTableList,
                pPanelInfo.xAxisOptions,
                {
                    interval: sIntervalInfo,
                    start: sStartTime,
                    end: sEndTime,
                },
                PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)
            );
            if (pPanelInfo.type === 'Text') {
                const [sTxtParsedQuery, sTxtAliasList] = DashboardQueryParser(
                    chartTypeConverter(pPanelInfo.type),
                    'NAME_VALUE',
                    pPanelInfo.blockList,
                    pPanelInfo.transformBlockList,
                    sRollupTableList,
                    pPanelInfo.xAxisOptions,
                    {
                        interval: sIntervalInfo,
                        start: sStartTime,
                        end: sEndTime,
                    },
                    PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)
                );
                const sTmpParsedQuery = [];
                const sTmpAliasList = [];

                // TEXT
                const sTxtIdx = pPanelInfo.chartOptions.textSeries;
                const sTxtTrx = sTxtParsedQuery.filter((item: any) => item.trx);
                const sTxtQuery = sTxtParsedQuery.filter((item: any) => !item.trx);

                if (sTxtIdx < 100) {
                    sTmpParsedQuery[0] = sTxtQuery?.[sTxtIdx]?.useQuery ? sTxtQuery[sTxtIdx] : FakeTextBlock.block;
                    sTmpAliasList[0] = sTxtQuery?.[sTxtIdx]?.useQuery ? sTxtAliasList[sTxtQuery[sTxtIdx].idx] : FakeTextBlock.alias;
                } else {
                    sTmpParsedQuery[0] = sTxtTrx[sTxtIdx - 100]?.useQuery ? sTxtTrx[sTxtIdx - 100] : FakeTextBlock.block;
                    sTmpAliasList[0] = sTxtTrx[sTxtIdx - 100]?.useQuery ? sTxtAliasList[sTxtTrx[sTxtIdx - 100].idx] : FakeTextBlock.alias;
                }

                // CHART
                const sChartIdx = pPanelInfo.chartOptions.chartSeries;
                const sChartTrx = sParsedQuery.filter((item: any) => item.trx);
                const sChartQuery = sParsedQuery.filter((item: any) => !item.trx);

                if (sChartIdx < 100) {
                    sTmpParsedQuery[1] = sChartQuery[sChartIdx]?.useQuery ? sChartQuery[sChartIdx] : FakeTextBlock.block;
                    sTmpAliasList[1] = sChartQuery[sChartIdx]?.useQuery ? sAliasList[sChartQuery[sChartIdx].idx] : FakeTextBlock.alias;
                } else {
                    sTmpParsedQuery[1] = sChartTrx[sChartIdx - 100]?.useQuery ? sChartTrx[sChartIdx - 100] : FakeTextBlock.block;
                    sTmpAliasList[1] = sChartTrx[sChartIdx - 100]?.useQuery ? sAliasList[sChartTrx[sChartIdx - 100].idx] : FakeTextBlock.alias;
                }
                sParsedQuery = sTmpParsedQuery;
                sAliasList = sTmpAliasList;
            }

            sAliasList = sAliasList.filter((alias: any) => alias?.useQuery);
            sParsedQuery = sParsedQuery.filter((item: any) => item?.useQuery);

            const sParsedChartOption = DashboardChartOptionParser(pPanelInfo, sAliasList, { startTime: sStartTime, endTime: sEndTime });
            const sParsedChartCode = DashboardChartCodeParser(
                pPanelInfo.chartOptions,
                chartTypeConverter(pPanelInfo.type),
                sParsedQuery,
                pPanelInfo.version,
                false,
                PanelIdParser(pChartVariableId + '-' + pPanelInfo.id),
                pPanelInfo.yAxisOptions
            );

            let sResult: any = undefined;

            if (pPanelInfo.type === 'Geomap') {
                // Replace variables in Geomap title with current time context
                try {
                    const sTimeContext = {
                        interval: sIntervalInfo,
                        start: sStartTime,
                        end: sEndTime,
                    };
                    setGeomapTitle(replaceVariablesInTql(pPanelInfo?.title ?? '', pBoardInfo.dashboard.variables, sTimeContext));
                } catch (e) {
                    setGeomapTitle(pPanelInfo?.title ?? '');
                }
                const sColumnIdxList = pPanelInfo.blockList.map((_block: any, idx: number) => {
                    if (pPanelInfo.chartOptions.coorLat[idx] === pPanelInfo.chartOptions.coorLon[idx]) return [0, 1];
                    else return [pPanelInfo.chartOptions.coorLat[idx], pPanelInfo.chartOptions.coorLon[idx]];
                });
                const sSqlList = sParsedQuery.map((query: any) => {
                    return { sql: query.sql };
                });
                const sRadiusList = pPanelInfo.chartOptions.marker.map((mkr: { shape: string; radius: number }) => {
                    return mkr.radius;
                });
                const sShapeList = pPanelInfo.chartOptions.marker.map((mkr: { shape: string; radius: number }) => {
                    return mkr.shape;
                });

                // var markerList = ${JSON.stringify(pPanelInfo.chartOptions.marker)};
                const sGeomapTql = `SCRIPT("js", {
                        var shapeList = ${JSON.stringify(sShapeList)};
                        var radiusList = ${JSON.stringify(sRadiusList)};
                        var colorList = ${JSON.stringify(sAliasList.map((alias: any) => alias.color))};
                        var columnIdxList = ${JSON.stringify(sColumnIdxList)};
                        var queryList = ${JSON.stringify(sSqlList)};
                        ${sParsedChartCode}
                    })
                    GEOMAP(
                        geomapID('${PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)}'),
                        size('${sRefClientWidth}px','${sRefClientHeight}px')
                    )`;

                const sTimeContext = {
                    interval: sIntervalInfo,
                    start: sStartTime,
                    end: sEndTime,
                };
                const sFinalGeomapTql = replaceVariablesInTql(sGeomapTql, pBoardInfo.dashboard.variables, sTimeContext);

                sResult = await getTqlChart(sFinalGeomapTql, 'dsh');
            } else {
                const tql = `${sInjectionSrc}
                     CHART(
                        ${`chartID('${PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)}'),`}
                        ${pPanelInfo.plg ? `plugins('${pPanelInfo.plg}'),` : ''}
                        theme('${pPanelInfo.theme}'),
                        size('${sRefClientWidth}px','${sRefClientHeight}px'),
                        chartOption(${decodeFormatterFunction(JSON.stringify(sParsedChartOption))}),
                        chartJSCode(${sParsedChartCode})
                    )`;

                const sTimeContext = {
                    interval: sIntervalInfo,
                    start: sStartTime,
                    end: sEndTime,
                };

                const sFinalTql = replaceVariablesInTql(tql, pBoardInfo.dashboard.variables, sTimeContext);

                sResult = await getTqlChart(sFinalTql, 'dsh');
            }

            if (sResult && !sResult?.data?.reason) {
                setChartData(sResult.data);
                setIsError(false);
                setIsChartData(true);
            } else {
                setIsMessage(sResult?.data?.reason);
                setIsError(true);
                setIsChartData(false);
            }
        }
        setIsLoading(false);
        pSetModifyState({ id: '', state: false });
    };
    const sSetIntervalTime = () => {
        if (pPanelInfo.type === 'Geomap' && !pPanelInfo.chartOptions?.useAutoRefresh) return null;
        if (pType === 'create' || pType === 'edit') return null;
        if (pPanelInfo.timeRange.refresh !== 'Off') return calcRefreshTime(pPanelInfo.timeRange.refresh);
        return null;
    };
    const defaultMinMax = () => {
        const sNowTime = moment().unix() * 1000;
        const sNowTimeMinMax = { min: moment(sNowTime).subtract(1, 'h').unix() * 1000, max: sNowTime };
        return sNowTimeMinMax;
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
            if (sTargetTag.customTable) return defaultMinMax();
            if (sTargetTag.table.split('.').length > 2) {
                sSvrResult = await fetchMountTimeMinMax(sTargetTag);
            } else {
                sSvrResult = sTargetTag.useCustom ? await fetchTimeMinMax({ ...sTargetTag, tag: sCustomTag }) : await fetchTimeMinMax(sTargetTag);
            }
            const sResult: { min: number; max: number } = { min: Math.floor(sSvrResult[0][0] / 1000000), max: Math.floor(sSvrResult[0][1] / 1000000) };
            return sResult;
        } else return defaultMinMax();
    };
    const handlePanelTimeRange = async (sStart: any, sEnd: any) => {
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        return timeMinMaxConverter(sStart, sEnd, sSvrRes);
    };

    // Track previous chartVariableId to detect loopMode vs user time change
    const prevChartVariableIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        // Skip first render (initial load handled by other useEffect)
        if (prevChartVariableIdRef.current === undefined) {
            prevChartVariableIdRef.current = pChartVariableId;
            return;
        }

        const chartVariableIdChanged = prevChartVariableIdRef.current !== pChartVariableId;
        prevChartVariableIdRef.current = pChartVariableId;

        // Case 1: Refresh 버튼 클릭 또는 사용자의 명시적 시간 변경 (chartVariableId 변경됨)
        // → 모든 차트 재조회
        if (chartVariableIdChanged) {
            // console.log('[CHART] Refresh or user time change detected - reloading all charts');
            executeTqlChart();
            return;
        }

        // Case 2: loopMode 자동 갱신 (chartVariableId 동일)
        // → Live 비디오에 종속된 차트만 재조회
        const videoState = getVideoPanelStateForChart(pBoardInfo?.id, pPanelInfo.id);

        if (videoState) {
            // 이 차트는 비디오에 종속됨
            if (!videoState.isLive) {
                // 종속 비디오가 Live가 아니면 재조회 안 함 (비디오의 시간 범위를 따름)
                // console.log('[CHART] LoopMode auto-refresh - Non-live video chart keeps current range');
                return;
            } else {
                // 종속 비디오가 Live면 재조회 (실시간 데이터 갱신)
                // console.log('[CHART] LoopMode auto-refresh - Live video chart reloads');
                executeTqlChart();
            }
        } else {
            // 비디오에 종속되지 않은 독립 차트는 항상 대시보드 시간을 따름
            // console.log('[CHART] LoopMode auto-refresh - Independent chart reloads');
            executeTqlChart();
        }
    }, [pBoardTimeMinMax, pChartVariableId]);
    useEffect(() => {
        if (pModifyState.state && pModifyState.id === PanelIdParser(pChartVariableId + '-' + pPanelInfo.id)) {
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
        if (sIsMounted && !pDragStat && !pInsetDraging) {
            executeTqlChart(pParentWidth);
        }
    }, [pParentWidth]);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Subscribe to video panel time range changes
    useEffect(() => {
        const panelId = pPanelInfo.id;
        const boardId = pBoardInfo?.id;
        if (!boardId || !panelId) return;

        subscribeTimeRangeChange(boardId, panelId, (event: TimeRangeEvent) => {
            // Clear event: revert to dashboard time range
            if (event.clear || !event.start || !event.end) {
                setVideoTimeRange(null);
            } else {
                // Check if time range actually changed (avoid unnecessary re-renders)
                const newStart = event.start;
                const newEnd = event.end;
                setVideoTimeRange((prev) => {
                    if (prev && prev.start.getTime() === newStart.getTime() && prev.end.getTime() === newEnd.getTime()) {
                        // Same time range - don't update state
                        return prev;
                    }
                    // Different time range - update state
                    return { start: newStart, end: newEnd };
                });
            }
        });

        return () => {
            unsubscribeTimeRangeChange(boardId, panelId);
        };
    }, [pBoardInfo?.id, pPanelInfo.id]);

    // Reload chart when video time range changes
    useEffect(() => {
        // Skip initial mount
        if (prevVideoTimeRangeRef.current === undefined) {
            prevVideoTimeRangeRef.current = sVideoTimeRange;
            return;
        }

        const prevRange = prevVideoTimeRangeRef.current;
        prevVideoTimeRangeRef.current = sVideoTimeRange;

        if (!sIsMounted) return;

        if (sVideoTimeRange) {
            // New video range set - reload with video range
            executeTqlChart();
        } else if (prevRange) {
            // Video range cleared (was set, now null)
            // Check if video panel is in live mode
            const videoState = getVideoPanelStateForChart(pBoardInfo?.id, pPanelInfo.id);
            if (videoState?.isLive) {
                // Live mode - reload with dashboard time range
                executeTqlChart();
            }
        }
    }, [sVideoTimeRange]);

    useEffect(() => {
        if (!(ChartRef && ChartRef?.current)) return;
        if (pIsActiveTab && sIsMounted && ChartRef.current.dataset && !ChartRef.current.dataset.processed) {
            executeTqlChart();
        }
    }, [pIsActiveTab]);

    useOverlapTimeout(() => {
        !sIsLoading && executeTqlChart();
    }, sSetIntervalTime());

    return (
        <div ref={ChartRef} className={`chart-form ${sIsError ? 'chart-message-error' : 'chart-message-success'} ${!pIsHeader ? 'chart-non-header' : ''}`}>
            {sIsLoading && !sIsChartData ? <div className="loading">Loading...</div> : null}
            {!sIsLoading && sIsError && sIsMessage ? <div>{sIsMessage}</div> : null}
            {!sIsLoading && !sIsError && !sIsChartData && !sTqlData ? <div>{sIsMessage}</div> : null}
            {!sIsError && sChartData && sIsChartData && sTqlResultType === TqlResType.VISUAL ? (
                <ShowVisualization
                    pLoopMode={pLoopMode}
                    pData={sChartData}
                    pPanelType={pPanelInfo.type}
                    pPanelId={pChartVariableId + '-' + pPanelInfo.id}
                    pPanelRef={ChartRef}
                    pTheme={pPanelInfo.theme}
                    pChartOpt={pPanelInfo.chartOptions}
                    pTitle={{ title: pPanelInfo.type === 'Geomap' ? sGeomapTitle ?? pPanelInfo?.title : pPanelInfo?.title, color: pPanelInfo?.titleColor }}
                />
            ) : null}
            {sTqlResultType !== TqlResType.VISUAL && sTqlData ? (
                <div className="dashboard-tql-panel-sink-wrap" style={{ color: ChartThemeTextColor[pPanelInfo.theme as keyof typeof ChartThemeTextColor] }}>
                    {sTqlResultType === TqlResType.CSV ? <TABLE pTableData={{ columns: undefined, rows: sTqlData, types: [] }} pMaxShowLen={false} clickEvent={() => {}} /> : null}
                    {sTqlResultType === TqlResType.MRK ? <Markdown pIdx={1} pContents={sTqlData} pType="mrk" /> : null}
                    {sTqlResultType === TqlResType.XHTML ? <Markdown pIdx={1} pContents={sTqlData} /> : null}
                    {sTqlResultType === TqlResType.NDJSON ? <pre>{sTqlData}</pre> : null}
                    {sTqlResultType === TqlResType.TEXT && sTqlData ? (
                        isValidJSON(sTqlData) ? (
                            <pre>{JSON.stringify(JSON.parse(sTqlData), null, 4)}</pre>
                        ) : (
                            <div className="dashboard-tql-panel-sink-pre">
                                <pre>{sTqlData}</pre>
                            </div>
                        )
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default LineChart;
