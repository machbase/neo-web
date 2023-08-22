import { useState, useEffect } from 'react';
import showChart from '@/plugin/eCharts';

interface ShowChartProps {
    pData: any;
    pIsCenter?: boolean;
}

export const ShowChart = (props: ShowChartProps) => {
    const { pData, pIsCenter } = props;
    const [sText, setText] = useState<string>('');
    const sTheme = pData.theme === '-' ? 'dark' : pData.theme;

    useEffect(() => {
        init();
    }, [pData]);

    const init = async () => {
        const divScripts = document.getElementsByTagName('head')[0];
        const newScript = document.createElement('script');

        newScript.src = `/web/echarts/themes/${sTheme}.js`;

        if (divScripts && !divScripts.hasChildNodes()) {
            divScripts.appendChild(newScript);
        }

        const sValue = ` <div className="chart_container">
                <div className="chart_item" id="${pData.chartID}" style="width:${pData.style.width};height:${pData.style.height};margin:${pIsCenter ? 'auto' : 'initial'}"></div>
            </div>`;
        setText(sValue);

        setTimeout(() => {
            showChart(pData, sTheme);
        }, 100);
    };

    return (
        <div className="tql-form">
            <div dangerouslySetInnerHTML={{ __html: sText }} style={{ display: 'flex' }} className="tql-chart-form"></div>
        </div>
    );
};
