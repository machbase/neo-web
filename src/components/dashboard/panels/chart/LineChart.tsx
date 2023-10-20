import { getTqlChart } from '@/api/repository/machiot';
import useInterval from '@/hooks/useInterval';
import { drawChart } from '@/plugin/eCharts';
import { calcInterval, calcRefreshTime, createQuery, setUnitTime } from '@/utils/dashboardUtil';
import { useEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pPanelInfo, pBoardInfo, pType }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sChart, setChart] = useState<any>({});
    const [sChartData, setChartData] = useState<any>({});
    const [sDataReturn, setDataReturn] = useState<any>('Please set up a Query.');
    const [sDataReturnStatus, setDataReturnStatus] = useState<boolean>(false);
    const didMount = useRef(false);

    useEffect(() => {
        if (sChart.id) {
            sChart.setOption(sChartData.chartOption);
            sChart.resize({
                width: ChartRef.current.clientWidth + 'px',
                height: ChartRef.current.clientHeight + 'px',
            });
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
            setChart(drawChart(sChartData, 'dark'));
        }, 10);
    };

    const setForm = async () => {
        let sData: any = {};

        let sAPIStatus = true;
        const sPanelTimeRange = pPanelInfo.timeRange;
        const sBoardTimeRange = pBoardInfo.dashboard.timeRange;

        for (const aItem of pPanelInfo.series) {
            const sQuery: string = createQuery(
                aItem,
                calcInterval(
                    pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start),
                    pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end),
                    ChartRef.current.clientWidth
                ),
                pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.start) : setUnitTime(sBoardTimeRange.start),
                pPanelInfo.useCustomTime ? setUnitTime(sPanelTimeRange.end) : setUnitTime(sBoardTimeRange.end)
            );

            const sTheme = `, theme('${pPanelInfo.theme ? pPanelInfo.theme : 'vintage'}')`;
            const sSlider = pPanelInfo.useDataZoom ? `, dataZoom('${pPanelInfo.dataZoomType}',${pPanelInfo.dataZoomMin},${pPanelInfo.dataZoomMax})` : '';

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
                    `TAKE(${(ChartRef.current.clientWidth / 3).toFixed()})\n` +
                    `${sChartType}(size('${ChartRef.current.clientWidth}px','${ChartRef.current.clientHeight}px')${sTheme}${sSlider}${sMarkArea})`
            );

            if (!sResult.data.chartID) {
                setDataReturn(sResult.data.reason);
                sAPIStatus = false;
                break;
            }

            if (sData.chartID) {
                if (sResult.data.chartOption.series) {
                    sData.chartOption.series.push(sResult.data.chartOption.series[0]);
                }
            } else {
                sData = sResult.data;
            }
        }

        if (sAPIStatus) {
            setDataReturnStatus(true);
            setChartData(sData);
        } else {
            setDataReturnStatus(false);
        }
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
        if (pType === 'create') {
            if (didMount.current) setForm();
        } else {
            setForm();
        }
    }, [pPanelInfo.x, pPanelInfo.y, pPanelInfo.w, pPanelInfo.h, pPanelInfo]);
    useEffect(() => {
        if (pType === 'create') {
            if (didMount.current) setForm();
            else didMount.current = true;
        } else {
            if (!pPanelInfo.useCustomTime) {
                setForm();
            }
        }
    }, [pBoardInfo.dashboard.timeRange.start, pBoardInfo.dashboard.timeRange.end]);

    useInterval(() => {
        setForm();
    }, sSetIntervalTime());

    return (
        <div
            ref={ChartRef}
            style={!sDataReturnStatus ? (sDataReturn === 'Please set up a Query.' ? { color: 'rgb(65, 153, 255)' } : { color: 'rgb(231, 65, 131)' }) : {}}
            className="chart-form"
        >
            {!sDataReturnStatus && sDataReturn}
            <div style={!sDataReturnStatus ? { display: 'none' } : {}} className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
