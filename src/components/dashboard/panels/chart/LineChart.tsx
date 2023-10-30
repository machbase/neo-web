import { getTqlChart } from '@/api/repository/machiot';
import { useOverlapTimeout } from '@/hooks/useOverlapTimeout';
import { drawChart } from '@/plugin/eCharts';
import { addTimeToString, calcInterval, calcRefreshTime, createQuery, setUnitTime } from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pPanelInfo, pBoardInfo, pType, pInsetDraging, pDragStat, pRefreshCount }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sChart, setChart] = useState<any>({});
    const [sChartData, setChartData] = useState<any>({});
    const [sDataReturn, setDataReturn] = useState<any>('Please set up a Query.');
    const [sDataReturnStatus, setDataReturnStatus] = useState<boolean>(false);
    const sChangedValue = useRef<boolean>(false);
    const sTimerRef = useRef<boolean>(false);
    const didMount = useRef(false);
    const sIsReload = useRef(false);
    const sRefClientWidth = useRef<number>(0);
    const sRefClientHeight = useRef<number>(0);

    useEffect(() => {
        if (pType === 'create' || pType === 'edit' || sIsReload.current) {
            sChartData.chartID && getLineChart();
            sIsReload.current = false;
            return;
        }

        if (sChangedValue.current) {
            sChartData.chartID && getLineChart();
            sChangedValue.current = false;
            return;
        }

        if (sChart.id) {
            sChart.setOption({ series: sChartData.chartOption.series, xAxis: sChartData.chartOption.xAxis, yAxis: sChartData.chartOption.yAxis });
            // sChart.resize({
            //     width: ChartRef.current.clientWidth + 'px',
            //     height: ChartRef.current.clientHeight + 'px',
            // });
        } else {
            sChartData.chartID && getLineChart();
        }
    }, [sChartData]);

    const getLineChart = () => {
        const sValue = ` <div class="chart_container">
        <div class="chart_item" id="${sChartData.chartID}" style="width:${ChartRef.current.clientWidth}px;height:${ChartRef.current.clientHeight}px;"></div>
    </div>`;

        setText(sValue);
        setTimeout(() => {
            setChart(drawChart(sChartData, pPanelInfo.theme));
        }, 10);
    };

    const setForm = async () => {
        if (ChartRef.current.clientWidth !== 0) {
            sRefClientWidth.current = ChartRef.current.clientWidth;
        }
        if (ChartRef.current.clientHeight !== 0) {
            sRefClientHeight.current = ChartRef.current.clientHeight;
        }
        sTimerRef.current = true;
        let sData: any = {};

        let sAPIStatus = true;
        const sPanelTimeRange = pPanelInfo.timeRange;
        const sBoardTimeRange = pBoardInfo.dashboard.timeRange;

        const sStartTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start);
        const sEndTime = pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end);

        const sIntervalInfo = calcInterval(sStartTime, sEndTime, sRefClientWidth.current);

        for (let i = 0; i < pPanelInfo.series.length; i++) {
            const sQuery: string = createQuery(
                pPanelInfo.series[i],
                sIntervalInfo,
                pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start),
                pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end)
            );

            const sTheme = `, theme('${pPanelInfo.theme ? pPanelInfo.theme : 'westeros'}')`;
            const sSlider = pPanelInfo.useDataZoom ? `, dataZoom('${pPanelInfo.dataZoomType}',${pPanelInfo.dataZoomMin},${pPanelInfo.dataZoomMax})` : '';

            const sName = pPanelInfo.series[i].useCustom
                ? pPanelInfo.series[i].values[0].alias
                    ? pPanelInfo.series[i].values[0].alias
                    : `${pPanelInfo.series[i].values[0].aggregator}(${pPanelInfo.series[i].filter[0].value})`
                : `${pPanelInfo.series[i].aggregator}(${pPanelInfo.series[i].tag})`;

            let sMarkArea;
            if (pPanelInfo.useMarkArea) {
                const sMarkAreaQueryList = pPanelInfo.markArea.map((aItem: any) => {
                    return `, markArea(${isNaN(Number(aItem.coord0)) ? "time('" + aItem.coord0 + "')" : aItem.coord0}, ${
                        isNaN(Number(aItem.coord1)) ? "time('" + aItem.coord1 + "')" : aItem.coord1
                    }, '${aItem.label}', '${aItem.color}', ${aItem.opacity})`;
                });
                sMarkArea = sMarkAreaQueryList.join('');
            } else {
                sMarkArea = '';
            }
            const sChartType =
                pPanelInfo.chartType === 'line' ? 'CHART_LINE' : pPanelInfo.chartType === 'bar' ? 'CHART_BAR' : pPanelInfo.chartType === 'scatter' ? 'CHART_SCATTER' : '';
            const sResult: any = await getTqlChart(
                'SQL(`' +
                    sQuery +
                    '`)\n' +
                    `TAKE(${(sRefClientWidth.current / 3).toFixed()})\n` +
                    `${sChartType}(size('${sRefClientWidth.current}px','${sRefClientHeight.current}px')${sTheme}${sSlider}${sMarkArea}, ` +
                    'seriesOptions(`{' +
                    `"name":"${sName}",` +
                    `"label" : {"show" : false}, ` +
                    `"itemStyle" : {"color":"${pPanelInfo.series[i].color}"}, ` +
                    `"lineStyle" : {"width" : 1}` +
                    '}`), ' +
                    'globalOptions(`{' +
                    `"xAxis": [ {"splitLine" : {show: false,"lineStyle" : { width: 0.8, opacity: 0.3 }}}]` +
                    `"yAxis": [ {"splitLine" : {show: false, "lineStyle" : { width: 0.8, opacity: 0.3 }}}]` +
                    '`))'
            );

            if (!sResult.data.chartID) {
                setDataReturn(sResult.data.reason);
                sAPIStatus = false;
                break;
            }

            if (sData.chartID) {
                if (sResult.data.chartOption.series) {
                    sData.chartOption.series.push(sResult.data.chartOption.series[0]);
                } else {
                    sIsReload.current = true;
                    sData = sResult.data;
                }
            } else {
                if (!sResult.data.chartOption.series || (sChartData.chartOption && !sChartData.chartOption.series)) {
                    sIsReload.current = true;
                }
                sData = sResult.data;
            }
        }

        if (sAPIStatus) {
            setDataReturnStatus(true);
            setChartData(sData);
        } else {
            setDataReturnStatus(false);
        }
        sTimerRef.current = false;
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
    }, [
        pPanelInfo.chartType,
        pPanelInfo.dataType,
        pPanelInfo.dataZoomMax,
        pPanelInfo.dataZoomMin,
        pPanelInfo.dataZoomType,
        pPanelInfo.gridSizeDepth,
        pPanelInfo.gridSizeHeight,
        pPanelInfo.gridSizeWidth,
        pPanelInfo.markArea,
        pPanelInfo.panelName,
        pPanelInfo.opacity,
        pPanelInfo.theme,
        pPanelInfo.useAutoRotate,
        pPanelInfo.useCustomTime,
        pPanelInfo.useDataZoom,
        pPanelInfo.useGridSize,
        pPanelInfo.useMarkArea,
        pPanelInfo.useOpacity,
        pPanelInfo.useVisualMap,
        pPanelInfo.visualMapMax,
        pPanelInfo.visualMapMin,
        pPanelInfo.series,
    ]);

    useEffect(() => {
        if (pType === 'create') {
            if (didMount.current) setForm();
        } else {
            setForm();
        }
    }, [pRefreshCount]);

    useEffect(() => {
        if (sChart.id) {
            setTimeout(() => {
                sChart.resize({
                    width: ChartRef.current.clientWidth + 'px',
                    height: ChartRef.current.clientHeight + 'px',
                });
            }, 300);
            setTimeout(() => {
                setForm();
            }, 200);
        }
    }, [pPanelInfo.x, pPanelInfo.y, pPanelInfo.w, pPanelInfo.h]);

    useEffect(() => {
        if (pType === 'create') {
            if (didMount.current) setForm();
        } else {
            if (!pPanelInfo.useCustomTime) {
                setForm();
            }
        }
        return () => {
            const chartElement = document.getElementById(sChart.id);
            // @ts-ignore
            if (chartElement && echarts.getInstanceByDom(chartElement)) {
                // @ts-ignore
                echarts.dispose(chartElement);
            }
        };
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
        <div
            ref={ChartRef}
            style={!sDataReturnStatus ? (sDataReturn === 'Please set up a Query.' ? { color: 'rgb(65, 153, 255)' } : { color: 'rgb(231, 65, 131)' }) : {}}
            className="chart-form"
        >
            {!sDataReturnStatus
                ? pType === 'create'
                    ? sDataReturn === 'Please set up a Query.'
                        ? 'Please set up a Query.'
                        : sDataReturn
                    : pType === 'edit'
                    ? sDataReturn === 'Please set up a Query.'
                        ? 'Loading...'
                        : sDataReturn
                    : 'Loading...'
                : ''}
            <div style={!sDataReturnStatus ? { display: 'none' } : {}} className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
