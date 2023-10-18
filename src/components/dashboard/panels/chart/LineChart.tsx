import { getTqlChart } from '@/api/repository/machiot';
import useInterval from '@/hooks/useInterval';
import { drawChart } from '@/plugin/eCharts';
import { calcInterval, calcRefreshTime, createQuery, setUnitTime } from '@/utils/dashboardUtil';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pPanelInfo, pBoardInfo, pType }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sChart, setChart] = useState<any>({});
    const [sChartData, setChartData] = useState<any>({});
    const timerRef = useRef<any>();

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
            // const sMarkArea = pPanelInfo.useMarkArea ? `, markArea(${}, coord1 [, label [, color [, opacity]]])`
            const sChartType =
                pPanelInfo.chartType === 'line' ? 'CHART_LINE' : pPanelInfo.chartType === 'bar' ? 'CHART_BAR' : pPanelInfo.chartType === 'scatter' ? 'CHART_SCATTER' : '';
            const sResult: any = await getTqlChart(
                'SQL(`' +
                    sQuery +
                    '`)\n' +
                    `TAKE(${(ChartRef.current.clientWidth / 3).toFixed()})\n` +
                    `${sChartType}(size('${ChartRef.current.clientWidth}px','${ChartRef.current.clientHeight}px')${sTheme}${sSlider}${sMarkArea})`
            );

            if (sData.chartID) {
                sData.chartOption.series.push(sResult.data.chartOption.series[0]);
            } else {
                sData = sResult.data;
            }
        }
        setChartData(sData);
    };

    useEffect(() => {
        // let timerRef: any = null;
        setTimeout(() => {
            if (pType !== 'create' && pType !== 'edit' && pBoardInfo.dashboard.timeRange.refresh !== 'Off') {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    timerRef.current = setInterval(() => {
                        setForm();
                    }, calcRefreshTime(pBoardInfo.dashboard.timeRange.refresh));
                } else {
                    timerRef.current = setInterval(() => {
                        setForm();
                    }, calcRefreshTime(pBoardInfo.dashboard.timeRange.refresh));
                }
            }
        }, 100);

        return () => {
            clearInterval(timerRef.current);
        };
    }, [pBoardInfo.dashboard.timeRange.refresh]);

    useEffect(() => {
        setForm();
    }, [pPanelInfo.x, pPanelInfo.y, pPanelInfo.w, pPanelInfo.h, pPanelInfo, pBoardInfo.dashboard.timeRange.start, pBoardInfo.dashboard.timeRange.end]);
    return (
        <div ref={ChartRef} className="chart-form">
            <div className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
