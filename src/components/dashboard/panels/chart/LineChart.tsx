import { getTqlChart } from '@/api/repository/machiot';
import { drawChart } from '@/plugin/eCharts';
import { createQuery, setUnitTime } from '@/utils/dashboardUtil';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pPanelInfo, pBoardInfo }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sChart, setChart] = useState<any>({});
    const [sChartData, setChartData] = useState<any>({});

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

    const calcInterval = (aBgn: number, aEnd: number, aWidth: number): { IntervalType: string; IntervalValue: number } => {
        const sDiff = aEnd - aBgn;
        const sSecond = Math.floor(sDiff / 1000);
        const sCalc = sSecond / (aWidth / 3);
        const sRet = { type: 'sec', value: 1 };
        if (sCalc > 60 * 60 * 12) {
            // interval > 12H
            sRet.type = 'day';
            sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
        } else if (sCalc > 60 * 60 * 6) {
            // interval > 6H
            sRet.type = 'hour';
            sRet.value = 12;
        } else if (sCalc > 60 * 60 * 3) {
            // interval > 3H
            sRet.type = 'hour';
            sRet.value = 6;
        } else if (sCalc > 60 * 60) {
            // interval > 1H
            sRet.type = 'hour';
            sRet.value = Math.ceil(sCalc / (60 * 60));
        } else if (sCalc > 60 * 30) {
            // interval > 30M
            sRet.type = 'hour';
            sRet.value = 1;
        } else if (sCalc > 60 * 20) {
            // interval > 20M
            sRet.type = 'min';
            sRet.value = 30;
        } else if (sCalc > 60 * 15) {
            // interval > 15M
            sRet.type = 'min';
            sRet.value = 20;
        } else if (sCalc > 60 * 10) {
            // interval > 10M
            sRet.type = 'min';
            sRet.value = 15;
        } else if (sCalc > 60 * 5) {
            // interval > 5M
            sRet.type = 'min';
            sRet.value = 10;
        } else if (sCalc > 60 * 3) {
            // interval > 3M
            sRet.type = 'min';
            sRet.value = 5;
        } else if (sCalc > 60) {
            // interval > 1M
            sRet.type = 'min';
            sRet.value = Math.ceil(sCalc / 60);
        } else if (sCalc > 30) {
            // interval > 30S
            sRet.type = 'min';
            sRet.value = 1;
        } else if (sCalc > 20) {
            // interval > 20S
            sRet.type = 'sec';
            sRet.value = 30;
        } else if (sCalc > 15) {
            // interval > 15S
            sRet.type = 'sec';
            sRet.value = 20;
        } else if (sCalc > 10) {
            // interval > 10S
            sRet.type = 'sec';
            sRet.value = 15;
        } else if (sCalc > 5) {
            // interval > 5S
            sRet.type = 'sec';
            sRet.value = 10;
        } else if (sCalc > 3) {
            // interval > 3S
            sRet.type = 'sec';
            sRet.value = 5;
        } else {
            sRet.type = 'sec';
            sRet.value = Math.ceil(sCalc);
        }
        if (sRet.value < 1) {
            sRet.value = 1;
        }
        return {
            IntervalType: sRet.type,
            IntervalValue: sRet.value,
        };
    };

    useLayoutEffect(() => {
        setTimeout(() => {
            setForm();
        }, 100);
    }, [pPanelInfo.x, pPanelInfo.y, pPanelInfo.w, pPanelInfo.h, pPanelInfo, pBoardInfo.dashboard.timeRange.start, pBoardInfo.dashboard.timeRange.end]);

    return (
        <div ref={ChartRef} className="chart-form">
            <div className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
