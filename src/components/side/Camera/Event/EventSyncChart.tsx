import {
    useEffect,
    useRef,
    useState,
    useMemo,
    // useCallback
} from 'react';
import { getTqlChart } from '@/api/repository/machiot';
import { DetermineTqlResultType, E_TQL_SCR, TqlResType } from '@/utils/TQL/TqlResParser';
import { ShowVisualization } from '@/components/tql/ShowVisualization';
import type { CameraInfo } from '@/api/repository/mediaSvr';
import { VideoEvent } from '@/components/dashboard/panels/video/hooks/useCameraEvents';

declare const echarts: any;

export interface EventSyncChartProps {
    cameraId: string;
    eventTimestamp: Date;
    currentTime: Date | null;
    isPlaying: boolean;
    onSeek: (time: Date) => void;
    cameraDetail: CameraInfo | null;
    event: VideoEvent | null;
    rangeStart: Date;
    rangeEnd: Date;
}

const SERIES_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

export const EventSyncChart = ({
    cameraId,
    eventTimestamp,
    currentTime,
    isPlaying,
    // onSeek,
    cameraDetail,
    event,
    rangeStart,
    rangeEnd,
}: EventSyncChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const chartIdRef = useRef<string>(`event-sync-${cameraId}-${Date.now()}`);
    const [isLoading, setIsLoading] = useState(true);
    const [hasData, setHasData] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visualData, setVisualData] = useState<any>(null);

    const chartStart = useMemo(() => rangeStart, [rangeStart.getTime()]);
    const chartEnd = useMemo(() => rangeEnd, [rangeEnd.getTime()]);

    // Resize echarts instance when container size changes
    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const chart = chartInstanceRef.current;
            if (chart) {
                try {
                    chart.resize();
                } catch {
                    /* not ready */
                }
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasData]);

    // Build TQL CHART using cameraDetail table and detect_objects as series
    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            setVisualData(null);
            chartInstanceRef.current = null;

            try {
                if (!cameraDetail?.table || !event?.usedCountsSnapshot) {
                    setIsLoading(false);
                    setHasData(false);
                    return;
                }
                console.log('cameraDetail.table', cameraDetail.table);

                const table = cameraDetail.table + '_LOG';
                const detectObjects = Object.keys(event.usedCountsSnapshot);
                const startNs = (BigInt(chartStart.getTime()) * 1000000n).toString();
                const endNs = (BigInt(chartEnd.getTime()) * 1000000n).toString();

                // Build series per detect_object (data populated by chartJSCode fetch)
                const series = detectObjects.map((obj, idx) => ({
                    name: obj,
                    type: 'line',
                    showSymbol: false,
                    lineStyle: { width: 1.5 },
                    itemStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length] },
                    data: [],
                    ...(idx === 0
                        ? {
                              markLine: {
                                  silent: true,
                                  symbol: 'none',
                                  lineStyle: { color: '#ef4444', width: 2, type: 'solid' },
                                  data: [{ xAxis: eventTimestamp.getTime() }],
                                  label: { formatter: 'Event', fontSize: 10, color: '#ef4444' },
                              },
                          }
                        : {}),
                }));

                const chartOption = {
                    animation: false,
                    backgroundColor: '#252525',
                    grid: { left: 50, right: 20, top: 20, bottom: 50 },
                    xAxis: {
                        type: 'time',
                        min: chartStart.getTime(),
                        max: chartEnd.getTime(),
                        axisTick: { alignWithLabel: true },
                        axisLabel: { hideOverlap: true },
                        useMinMax: false,
                        axisLine: { onZero: false },
                    },
                    yAxis: {
                        type: 'value',
                        alignTicks: true,
                        scale: true,
                        axisLine: { onZero: false },
                    },
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: 'rgba(30,30,30,0.9)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        textStyle: { color: '#fff', fontSize: 11 },
                    },
                    legend: { show: true, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 }, bottom: 0 },
                    series,
                };

                // Build SQL query per detect_object (reference: DashboardChartCodeParser)
                const queryList = detectObjects.map((obj, idx) => ({
                    query: `SQL("SELECT TO_TIMESTAMP(time)/1000000 as TIME, value FROM ${table} WHERE IDENT = '${obj.replace(
                        /'/g,
                        "''",
                    )}' AND time BETWEEN ${startNs} AND ${endNs}")\nJSON()`,
                    idx,
                    alias: obj,
                }));

                const accessToken = localStorage.getItem('accessToken') || '';
                const consoleId = localStorage.getItem('consoleId') || '';

                // JS code executed inside CHART after render (fetches data per series)
                const chartJsCode = `{
    let sQuery = ${JSON.stringify(queryList)};
    let sCount = 0;
    function getData(aTql, aIdx) {
        fetch("${window.location.origin}/web/api/tql", {
            method: "POST",
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "text/plain",
                "Authorization": "Bearer ${accessToken}",
                "X-Console-Id": "${consoleId}, console-log-level=NONE"
            },
            body: aTql
        })
        .then(function(rsp) { return rsp.json(); })
        .then(function(obj) {
            if (!obj.success) return;
            _chartOption.series[aIdx].data = obj?.data?.rows ?? [];
            sCount++;
            if (sCount >= sQuery.length) _chart.setOption(_chartOption);
        })
        .catch(function(err) { console.warn("EventSyncChart fetch error", err); });
    }
    sQuery.forEach(function(aData, idx) {
        getData(aData.query, idx);
    });
}`;

                const width = containerRef.current?.clientWidth || 600;
                const height = containerRef.current?.clientHeight || 360;
                const chartId = chartIdRef.current;

                const tql = `FAKE(linspace(0,0,0))
CHART(
    chartID('${chartId}'),
    theme('dark'),
    size('${width}px','${height}px'),
    chartOption(${JSON.stringify(chartOption)}),
    chartJSCode(${chartJsCode})
)`;

                const result: any = await getTqlChart(tql, 'dsh');
                if (cancelled) return;

                if (result && !result?.data?.reason) {
                    const { parsedType, parsedData } = DetermineTqlResultType(E_TQL_SCR.DSH, {
                        status: result?.status,
                        headers: result?.headers,
                        data: result?.data,
                    });

                    if (parsedType === TqlResType.VISUAL) {
                        setVisualData(parsedData);
                        setHasData(true);
                    } else {
                        setHasData(false);
                    }
                } else {
                    setHasData(false);
                }
                setIsLoading(false);
            } catch {
                if (!cancelled) {
                    setError('Failed to load detection data');
                    setIsLoading(false);
                }
            }
        };

        loadData();
        return () => {
            cancelled = true;
        };
    }, [cameraId, eventTimestamp, chartStart, chartEnd, cameraDetail]);

    // Find echarts instance after ShowVisualization renders
    useEffect(() => {
        if (!hasData || !visualData) return;

        const findInstance = () => {
            if (typeof echarts === 'undefined') return false;
            const dom = document.getElementById(chartIdRef.current);
            if (!dom) return false;
            const instance = echarts.getInstanceByDom(dom);
            if (!instance) return false;
            chartInstanceRef.current = instance;
            markerInitializedRef.current = false;
            return true;
        };

        if (findInstance()) return;

        // Poll until echarts instance is ready (scripts load async)
        const intervalId = setInterval(() => {
            if (findInstance()) {
                clearInterval(intervalId);
            }
        }, 200);

        return () => clearInterval(intervalId);
    }, [hasData, visualData]);

    // Update orange marker on currentTime change (throttled during playback)
    const markerInitializedRef = useRef(false);
    const MARKER_THROTTLE_MS = 200;

    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart || !currentTime || !hasData) return;

        const updateMarker = () => {
            try {
                const gridComponent = chart.getModel().getComponent('grid');
                if (!gridComponent?.coordinateSystem) return;

                const gridRect = gridComponent.coordinateSystem.getRect();
                const xPixel = chart.convertToPixel({ gridIndex: 0 }, [currentTime.getTime(), 0])[0];
                if (isNaN(xPixel)) return;

                const shape = { x1: xPixel, y1: gridRect.y, x2: xPixel, y2: gridRect.y + gridRect.height };

                if (!markerInitializedRef.current) {
                    chart.setOption({
                        graphic: [
                            {
                                id: 'current-time-marker',
                                type: 'line',
                                z: 100,
                                shape,
                                style: { stroke: '#f97316', lineWidth: 1, lineDash: [5] },
                            },
                        ],
                    });
                    markerInitializedRef.current = true;
                } else {
                    chart.setOption(
                        {
                            graphic: [{ id: 'current-time-marker', shape }],
                        },
                        { replaceMerge: [] },
                    );
                }
            } catch {
                // Chart may not be ready
            }
        };

        if (!isPlaying) {
            updateMarker();
            return;
        }

        const timeoutId = setTimeout(updateMarker, MARKER_THROTTLE_MS);
        return () => clearTimeout(timeoutId);
    }, [currentTime, hasData, isPlaying]);

    // Click handler for seeking video
    // const handleZrClick = useCallback(
    //     (params: any) => {
    //         const chart = chartInstanceRef.current;
    //         if (!chart) return;

    //         const pointInPixel = [params.offsetX, params.offsetY];
    //         if (chart.containPixel({ gridIndex: 0 }, pointInPixel)) {
    //             const pointInGrid = chart.convertFromPixel({ gridIndex: 0 }, pointInPixel);
    //             if (pointInGrid?.[0]) {
    //                 onSeek(new Date(pointInGrid[0]));
    //             }
    //         }
    //     },
    //     [onSeek]
    // );

    // Attach click handler after instance is ready
    // useEffect(() => {
    //     const chart = chartInstanceRef.current;
    //     if (!chart || !hasData) return;

    //     chart.getZr().on('click', handleZrClick);
    //     return () => {
    //         chart.getZr()?.off('click', handleZrClick);
    //     };
    // }, [hasData, handleZrClick, chartInstanceRef.current]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {isLoading && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Loading detection data...</span>
                </div>
            )}
            {!isLoading && !hasData && !error && (
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>No detection data available</span>
                </div>
            )}
            {error && (
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#ef4444' }}>{error}</span>
                </div>
            )}
            {hasData && visualData && <ShowVisualization pData={visualData} pLoopMode={false} pPanelRef={containerRef} />}
        </div>
    );
};
