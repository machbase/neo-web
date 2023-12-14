import { useState, useEffect } from 'react';
import { drawChart } from '@/plugin/eCharts';

interface ShowChartProps {
    pData: any;
    pIsCenter?: boolean;
}

export const ShowChart = (props: ShowChartProps) => {
    const { pData, pIsCenter } = props;
    const [sText, setText] = useState<string>('');
    const sTheme = pData.theme ? pData.theme : 'dark';

    const [sInstance, setInstance] = useState<any[]>([]);

    useEffect(() => {
        const init = () => {
            const sValue = ` <div className="chart_container">
                    <div className="chart_item" id="${pData.chartID}" style="background-color:${sTheme === 'dark' ? '' : '#FFF'}; width:${pData.style.width};height:${
                pData.style.height
            };margin:${pIsCenter ? 'auto' : 'initial'}"></div>
                </div>`;
            setText(sValue);

            setTimeout(() => {
                setInstance([...sInstance, drawChart(pData, sTheme)]);
            }, 100);
        };

        init();

        return () => {
            const chartElement = document.getElementById(pData.chartID);
            // @ts-ignore
            if (chartElement && echarts.getInstanceByDom(chartElement)) {
                // @ts-ignore
                echarts.dispose(chartElement);
            }
        };
    }, [pData]);

    useEffect(() => {
        return () => {
            const chartElement = document.getElementById(pData.chartID);
            if (!chartElement && sInstance) setInstance([]);
        };
    }, [pData, sInstance]);

    return (
        <div className="tql-form">
            <div dangerouslySetInnerHTML={{ __html: sText }} style={{ display: 'flex' }} className="tql-chart-form"></div>
        </div>
    );
};
