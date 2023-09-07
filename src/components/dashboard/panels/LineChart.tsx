import { getTqlChart } from '@/api/repository/machiot';
import showChart from '@/plugin/eCharts';
import { useLayoutEffect, useRef, useState } from 'react';
import './LineChart.scss';

const LineChart = ({ pValue, pDraged }: any) => {
    const [sText, setText] = useState('');
    const ChartRef = useRef<any>();
    const [sFirstSet, setFirstSet] = useState(false);

    const getLineChart = async () => {
        const sInput = 'INPUT(SQL(`' + 'select * from example' + '`))\n' + 'TAKE(50)\n' + `OUTPUT(CHART_LINE(size('${ChartRef.current.clientWidth}px','${pValue.h * 19}px')))`;
        const sResult: any = await getTqlChart(sInput);

        const sValue = ` <div class="chart_container">
        <div class="chart_item" id="${sResult.data.chartID}" style="width:${sResult.data.style.width};height:${sResult.data.style.height};"></div>
    </div>`;

        setText(sValue);
        setTimeout(() => {
            showChart(sResult.data, 'dark');
        });
    };

    useLayoutEffect(() => {
        ChartRef?.current?.clientWidth && getLineChart();
    }, [pValue.w, pValue.h, pDraged]);

    useLayoutEffect(() => {
        if (ChartRef?.current?.clientWidth && !sFirstSet) {
            setFirstSet(true);
            getLineChart();
        }
    }, [ChartRef?.current?.clientWidth]);

    return (
        <div ref={ChartRef} className="chart-form">
            <div className="inner-html-form" dangerouslySetInnerHTML={{ __html: sText }}></div>
        </div>
    );
};

export default LineChart;
