import './LineChart.scss';
import { fetchBlockTimeMinMax, getTqlChart, getTqlScripts } from '../../../api/repository/machiot';
import { useOverlapTimeout } from '../../../hooks/useOverlapTimeout';
import { calcInterval, calcRefreshTime, decodeFormatterFunction, PanelIdParser, setUnitTime } from '../../../utils/dashboardUtil';
import { isNumericBaseTimeBlock } from '../../../../utils/timeFieldColumns';
import { fetchBlockBaseMinMax } from '../../../utils/dashboardBaseMinMax';
import { isDistanceAnchorEdge, isDistanceEdgeSet, resolveDistanceEdge } from '../../../../utils/distanceRange';
import { useEffect, useRef, useState } from 'react';
import { DashboardQueryParser, SqlResDataType } from '../../../utils/DashboardQueryParser';
import { DashboardChartCodeParser } from '../../../utils/DashboardChartCodeParser';
import { DashboardChartOptionParser } from '../../../utils/DashboardChartOptionParser';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '../../../recoil/recoil';
import { ChartThemeTextColor, GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '../../../utils/constants';
import { chartTypeConverter } from '../../../utils/eChartHelper';
import { timeMinMaxConverter } from '../../../utils/bgnEndTimeRange';
import { hasResolvedTimeRange, shouldFetchBlockTimeMinMax } from '@/utils/dashboardTimeMinMax';
import { convertDashboardMinMaxRows } from '@/utils/dashboardBlockColumns';
import { TqlChartParser } from '../../../utils/DashboardTqlChartParser';
import moment from 'moment';
import { ShowVisualization } from '../../../components/tql/ShowVisualization';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '../../../utils/TQL/TqlResParser';
import { Markdown } from '../../../components/worksheet/Markdown';
import { isValidJSON } from '../../../utils';
import { CommonTable } from '@/design-system/components';
import { TqlCsvParser } from '../../../utils/tqlCsvParser';
import { FakeTextBlock } from '../../../utils/helpers/Dashboard/BlockHelper';
import { replaceVariablesInTql } from '../../../utils/TqlVariableReplacer';

// Parent-width changes arrive from a ResizeObserver, i.e. once per frame while dragging. Wait for
// them to settle for this long before re-running the query.
const PARENT_WIDTH_DEBOUNCE_MS = 150;

const LineChart = ({ pIsActiveTab, pLoopMode, pChartVariableId, pPanelInfo, pParentWidth, pIsHeader, pBoardTimeMinMax, pBoardInfo, pOnResolveTheme, pOnRefreshTick }: any) => {
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
    // markdown/text/csv/ndjson sink results are strings, so an unchanged response makes React bail out
    // of the state update and nothing re-renders. Bump a render key per response to force a remount.
    const [sSinkRenderKey, setSinkRenderKey] = useState<number>(0);
    // Lift the server-resolved theme so the public panel chrome matches the rendered chart (issue #1435).
    useEffect(() => {
        if (sChartData?.theme) pOnResolveTheme?.(sChartData.theme);
    }, [sChartData?.theme, pOnResolveTheme]);
    // Sink kind, decided from the response content-type. Anything that is not VISUAL is a
    // markdown/text/csv/ndjson sink.
    const sIsNonVisualSink = pPanelInfo.type === 'Tql chart' && sTqlResultType !== TqlResType.VISUAL;
    let sRefClientWidth = 0;
    let sRefClientHeight = 0;

    const calculateTimeRange = () => {
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

    // Is this a range the board re-resolves on every tick, rather than a fixed pair of timestamps?
    const isRelativeRangeEdge = (aValue: unknown) => typeof aValue === 'string' && (aValue.includes('now') || aValue.includes('last'));

    /**
     * `aSelfRefresh` marks a run driven by *this panel's* own refresh timer rather than by the board:
     * between board ticks `pBoardTimeMinMax` is a frozen snapshot, so a relative board range would be
     * re-queried as the same seconds every time.
     */
    const executeTqlChart = async (aWidth?: number, aSelfRefresh?: boolean) => {
        if (!pIsActiveTab) return;
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
        if (isNumericBaseTimeBlock(pPanelInfo.blockList?.[0])) {
            // Distance (numeric base) panel — resolve from the kind-separated distanceRange: the
            // panel's own window when it has one, otherwise the board's. Numeric start/end are used
            // as-is; '' means the full [first, last] data extent.
            const sBoardDistanceRange = pBoardInfo?.dashboard?.distanceRange ?? {};
            const sPanelDistanceRange = pPanelInfo.useCustomDistance ? pPanelInfo.distanceRange ?? {} : {};
            const sPick = (aPanelEdge: any, aBoardEdge: any) => (isDistanceEdgeSet(aPanelEdge) ? aPanelEdge : aBoardEdge);
            const sDistanceRange = { start: sPick(sPanelDistanceRange.start, sBoardDistanceRange.start), end: sPick(sPanelDistanceRange.end, sBoardDistanceRange.end) };
            const sHasStart = isDistanceEdgeSet(sDistanceRange.start);
            const sHasEnd = isDistanceEdgeSet(sDistanceRange.end);
            // An unset edge is the data's own end, and so is an anchored one ('last-5000', 'first') —
            // both are measured off the extent, which is why the extent is read whenever either edge
            // is not a plain coordinate. Two coordinates need no round trip at all.
            const sNeedsExtent = !sHasStart || !sHasEnd || isDistanceAnchorEdge(sDistanceRange.start) || isDistanceAnchorEdge(sDistanceRange.end);
            const sBounds = sNeedsExtent ? await fetchBlockBaseMinMax(pPanelInfo.blockList?.[0]) : undefined;
            sStartTime = (sHasStart ? resolveDistanceEdge(sDistanceRange.start, sBounds) : null) ?? sBounds?.min ?? 0;
            sEndTime = (sHasEnd ? resolveDistanceEdge(sDistanceRange.end, sBounds) : null) ?? sBounds?.max ?? 0;
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
            const sBoardRange = pBoardInfo?.dashboard?.timeRange;
            const sBoardRangeIsRelative = isRelativeRangeEdge(sBoardRange?.start) || isRelativeRangeEdge(sBoardRange?.end);
            if (aSelfRefresh && sBoardRangeIsRelative) {
                // Resolve the board's own expression again for this query: 'now-3h ~ now' has to mean
                // now at the moment of the fetch, 'last-1h ~ last' the data's current latest.
                const sTimeMinMax = await handlePanelTimeRange(sBoardRange.start, sBoardRange.end);
                sStartTime = sTimeMinMax?.min ?? setUnitTime(sBoardRange.start);
                sEndTime = sTimeMinMax?.max ?? setUnitTime(sBoardRange.end);
            } else {
                sStartTime = setUnitTime(pBoardTimeMinMax?.min);
                sEndTime = setUnitTime(pBoardTimeMinMax?.max);
            }
        }

        // A distance axis buckets in the base column's own unit, so a *time* unit left over from
        // before the panel's base column was switched ('min' on an odometer) would bucket metres by
        // milliseconds. Only those are rejected — any other interval kind is passed through.
        const sIsNumericBaseInterval = isNumericBaseTimeBlock(pPanelInfo.blockList?.[0]);
        const sIsTimeUnitInterval = ['sec', 'min', 'hour', 'day'].includes(String(pPanelInfo.axisInterval?.IntervalType).toLowerCase());
        const sUseManualInterval = pPanelInfo.isAxisInterval && !(sIsNumericBaseInterval && sIsTimeUnitInterval);
        // No interval on a distance axis means no bucketing — the rows as they are stored. (A time
        // axis still picks one automatically: 'now-3h ~ now' at raw resolution is a different order
        // of magnitude of rows, and that auto interval has always been what kept it drawable.)
        const sEmptyInterval = { IntervalType: '', IntervalValue: '' };
        let sIntervalInfo = sUseManualInterval
            ? pPanelInfo.axisInterval
            : sIsNumericBaseInterval
              ? sEmptyInterval
              : calcInterval(sStartTime, sEndTime, sRefClientWidth, false);
        if (pPanelInfo.type === 'Geomap')
            sIntervalInfo = {
                IntervalType: pPanelInfo.chartOptions.intervalType,
                IntervalValue: pPanelInfo.chartOptions.intervalValue,
            };
        if (pPanelInfo.type === 'Tql chart') {
            !pLoopMode && setChartData(undefined);
            setIsLoading(false);

            // On a self refresh the window above was resolved for *this* query; calculateTimeRange()
            // would read the board's frozen snapshot again and hand the TQL file stale $from_/$to_.
            const sTqlTimeRange = aSelfRefresh ? { start: sStartTime, end: sEndTime } : calculateTimeRange();
            const sResult: any = await getTqlScripts(TqlChartParser(pPanelInfo.tqlInfo, sTqlTimeRange, sIntervalInfo, pBoardInfo.dashboard.variables));
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
            } else {
                if (parsedType === TqlResType.CSV) {
                    const [sParsedCsvBody] = TqlCsvParser(parsedData);
                    setTqlData(sParsedCsvBody);
                } else setTqlData(parsedData);
                // Remount so an unchanged response still redraws (batched with setTqlData above).
                setSinkRenderKey((aPrev) => aPrev + 1);
            }
        } else {
            setTqlResultType(TqlResType.VISUAL);
            if (!hasResolvedTimeRange(sStartTime, sEndTime)) {
                setIsLoading(false);
                return;
            }
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
    };
    const sSetIntervalTime = () => {
        if (pPanelInfo.type === 'Geomap' && !pPanelInfo.chartOptions?.useAutoRefresh) return null;
        // markdown/text/csv sink TQL panels opt out of auto refresh (the sink kind is only known from
        // the first response).
        if (sIsNonVisualSink) return null;
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
        // TQL/Video panels can carry an empty blockList (same guard as the main LineChart).
        if (!sTargetPanel.blockList?.length) return defaultMinMax();
        const sTargetTag = sTargetPanel.blockList[0];
        const sCustomTag = sTargetTag.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;
        if (shouldFetchBlockTimeMinMax(sTargetTag, sCustomTag)) {
            if (sTargetTag.customTable) return defaultMinMax();
            const sSvrResult = await fetchBlockTimeMinMax(sTargetTag, sCustomTag);
            const sResult = convertDashboardMinMaxRows(sSvrResult, sTargetTag);
            if (!sResult) return defaultMinMax();
            return sResult;
        } else return defaultMinMax();
    };
    const handlePanelTimeRange = async (sStart: any, sEnd: any) => {
        const sSvrRes: { min: number; max: number } = await fetchTableTimeMinMax();
        return timeMinMaxConverter(sStart, sEnd, sSvrRes);
    };

    // The board window object itself, to tell which dependency moved: `autoRefresh` is a property of
    // that object and stays set until the board publishes a new one, so a run caused by a distance
    // range change would otherwise read as an auto-refresh tick.
    const prevBoardTimeMinMaxRef = useRef<any>(undefined);
    useEffect(() => {
        const sBoardWindowChanged = prevBoardTimeMinMaxRef.current !== pBoardTimeMinMax;
        prevBoardTimeMinMaxRef.current = pBoardTimeMinMax;
        // Dashboard auto-refresh ticks are not applied to markdown/text/csv sink TQL panels. The
        // Refresh button arrives as refresh=true without the autoRefresh flag, so it still re-queries.
        if (sBoardWindowChanged && pBoardTimeMinMax?.autoRefresh) {
            if (sIsNonVisualSink) return;
            // A panel with its own refresh interval is already re-queried by its own timer
            // (`useOverlapTimeout` below); letting the board tick through too queried it twice per
            // board cycle. `sSetIntervalTime()` rather than the stored value, so a panel whose timer
            // does not actually run still follows the board.
            if (sSetIntervalTime() !== null) return;
        }
        if ((sIsMounted || sIsError) && (!pPanelInfo.useCustomTime || pBoardTimeMinMax?.refresh || pBoardInfo.dashboard?.variables?.length > 0)) {
            executeTqlChart();
        }
        // distanceRange is board-level (not carried by pBoardTimeMinMax), so re-query when it changes.
    }, [pBoardTimeMinMax, pBoardInfo?.dashboard?.distanceRange?.start, pBoardInfo?.dashboard?.distanceRange?.end]);
    useEffect(() => {
        if (sIsMounted) {
            executeTqlChart();
        }
    }, [pPanelInfo.w, pPanelInfo.h, pIsHeader]);
    // Parent width arrives from a ResizeObserver, once per frame. Re-querying every frame floods the
    // server and makes sink panels rebuild their shadow DOM repeatedly, so redraw once after the width
    // settles (same as the main dashboard).
    useEffect(() => {
        if (!sIsMounted) return;
        const sResizeTimer = setTimeout(() => executeTqlChart(pParentWidth), PARENT_WIDTH_DEBOUNCE_MS);
        return () => clearTimeout(sResizeTimer);
    }, [pParentWidth]);
    useEffect(() => {
        setIsMounted(true);
        executeTqlChart();
    }, []);

    useEffect(() => {
        if (!(ChartRef && ChartRef?.current)) return;
        if (pIsActiveTab && sIsMounted && ChartRef.current.dataset && !ChartRef.current.dataset.processed) {
            executeTqlChart();
        }
    }, [pIsActiveTab]);

    useOverlapTimeout(() => {
        // Announced before the (possibly skipped) query: the next tick is scheduled from this moment
        // either way, so this is what the header's countdown ring has to be anchored to.
        pOnRefreshTick?.();
        !sIsLoading && executeTqlChart(undefined, true);
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
                    pTitle={{ title: pPanelInfo?.title, color: pPanelInfo?.titleColor }}
                    // Refresh button is the only path that flags refresh=true on the board
                    // time min/max object — that's an explicit user reset of the chart, so we
                    // discard the captured legend selection. Time-arrows and TimeRangeModal
                    // Save go through the same useEffect but without this flag, which means
                    // the user-toggled tag visibility survives those re-renders.
                    pResetLegendSelection={pBoardTimeMinMax?.refresh === true}
                />
            ) : null}
            {sTqlResultType !== TqlResType.VISUAL && sTqlData ? (
                <div key={sSinkRenderKey} className="dashboard-tql-panel-sink-wrap" style={{ color: ChartThemeTextColor[pPanelInfo.theme as keyof typeof ChartThemeTextColor] }}>
                    {sTqlResultType === TqlResType.CSV ? <CommonTable data={{ columns: [], rows: sTqlData, types: [] }} showRowNumber showCopyButton /> : null}
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
