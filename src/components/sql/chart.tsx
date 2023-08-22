import { getTqlChart } from '@/api/repository/machiot';
import { useRef, useState, useEffect } from 'react';
import { reSizeChart, drawChart } from '@/plugin/eCharts';
import { sqlBasicChartFormatter } from '@/utils/sqlFormatter';
import useDebounce from '@/hooks/useDebounce';

const CHART = ({ pIsVertical, pDisplay, pSqlQueryTxt, pSizes }: { pIsVertical: boolean; pDisplay: string; pSqlQueryTxt: string; pSizes: number[] | string[] }) => {
    const [sResult, setResult] = useState<any>();
    const [sStyle, setStyle] = useState({ width: '0px', height: '0px' });
    const [sChartDiv, setChartDiv] = useState<any>(null);
    const chartRef = useRef<any>(null);

    const getChartData = async (aSize: any) => {
        const sTmpResult: any = await getTqlChart(sqlBasicChartFormatter(pSqlQueryTxt, aSize.width, aSize.height));
        const sTheme = sTmpResult.data.theme === '-' ? 'dark' : sTmpResult.data.theme;

        setResult(sTmpResult.data);

        setTimeout(() => {
            const tmpChartDiv = drawChart(sTmpResult.data, sTheme);
            setChartDiv(tmpChartDiv);
        }, 100);
    };

    useEffect(() => {
        if (chartRef && chartRef.current && !!pSqlQueryTxt) {
            getChartData({
                width: chartRef.current.clientWidth,
                height: chartRef.current.clientHeight,
            });
            setStyle({
                width: Math.floor(chartRef.current.clientWidth) + 'px',
                height: Math.floor(chartRef.current.clientHeight) + 'px',
            });
        }
    }, [pDisplay]);

    const reDrawChart = () => {
        setStyle({
            width: Math.floor(chartRef.current.clientWidth) + 'px',
            height: Math.floor(chartRef.current.clientHeight) + 'px',
        });
        reSizeChart(sChartDiv, {
            width: Math.floor(chartRef.current.clientWidth) + 'px',
            height: Math.floor(chartRef.current.clientHeight) + 'px',
        });
    };

    useDebounce(chartRef, [pSizes, pIsVertical], reDrawChart);

    return pDisplay === '' ? (
        <div ref={chartRef} className="sql-form" style={{ height: 'calc(100% - 40px)' }}>
            {sResult && (
                <div className="chart_container">
                    <div className="chart_item" id={sResult.chartID} style={{ width: sStyle.width, height: sStyle.height, margin: 'auto' }}></div>
                </div>
            )}
        </div>
    ) : (
        <></>
    );
};

export default CHART;
