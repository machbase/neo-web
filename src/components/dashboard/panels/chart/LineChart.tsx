import { getTqlChart } from '@/api/repository/machiot';
import { drawChart } from '@/plugin/eCharts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pPanelInfo, pDraged, pInsetDraging }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sChart, setChart] = useState<any>({});
    const [sFirstSet, setFirstSet] = useState(false);

    const getLineChart = async () => {
        const sInput =
            'SQL(`' + 'select * from example' + '`)\n' + 'TAKE(50)\n' + `CHART_LINE(size('${ChartRef.current.clientWidth}px','${ChartRef.current.clientHeight - 34}px'))`;
        const sResult: any = await getTqlChart(sInput);

        const sValue = ` <div class="chart_container">
        <div class="chart_item" id="${sResult.data.chartID}" style="width:${sResult.data.style.width};height:${sResult.data.style.height};"></div>
    </div>`;

        setText(sValue);
        setTimeout(() => {
            setChart(drawChart(sResult.data, 'dark'));
        }, 10);
    };

    useEffect(() => {
        console.log(pPanelInfo);
        getLineChart();
    }, []);

    useEffect(() => {
        console.log(sChart);
    }, [pPanelInfo]);
    // useLayoutEffect(() => {
    //     ChartRef?.current?.clientWidth && getLineChart();
    // }, [pPanelInfo.w, pPanelInfo.h, pDraged, pInsetDraging]);

    // useLayoutEffect(() => {
    //     if (ChartRef?.current?.clientWidth && !sFirstSet) {
    //         setFirstSet(true);
    //         getLineChart();
    //     }
    // }, [ChartRef?.current?.clientWidth, pInsetDraging]);

    return (
        <div ref={ChartRef} className="chart-form">
            <div className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
