import { getTqlChart } from '@/api/repository/machiot';
import { useRef, useState, useEffect } from 'react';
import { reSizeChart, drawChart } from '@/plugin/eCharts';
import { sqlBasicChartFormatter } from '@/utils/sqlFormatter';
import useDebounce from '@/hooks/useDebounce';
import { Play } from '@/assets/icons/Icon';
import './index.scss';

const CHART = ({
    pQueryList,
    pChartAixsList,
    pIsVertical,
    pDisplay,
    pSqlQueryTxt,
    pSizes,
}: {
    pQueryList: string[] | [];
    pChartAixsList: string[];
    pIsVertical: boolean;
    pDisplay: string;
    pSqlQueryTxt: () => string;
    pSizes: number[] | string[];
}) => {
    const [sResult, setResult] = useState<any>(null);
    const [sStyle, setStyle] = useState({ width: 0, height: 0 });
    const [sChartDiv, setChartDiv] = useState<any>(null);
    const [sSelectedXAxis, setSelectedXAxis] = useState<string>('');
    const [sSelectedYAxis, setSelectedYAxis] = useState<string>('');
    const chartRef = useRef<any>(null);
    const sControlPanelHeight: number = 40;
    const sControlList: string[] = ['X Axis', 'Y Axis'];

    const getChartData = async (aSize: any) => {
        if (pChartAixsList.length === 0) return;
        let sTmpResult: any = '';
        if (sSelectedXAxis && sSelectedYAxis)
            sTmpResult = await getTqlChart(sqlBasicChartFormatter(pSqlQueryTxt(), aSize.width, aSize.height, { x: sSelectedXAxis, y: sSelectedYAxis }));
        else sTmpResult = await getTqlChart(sqlBasicChartFormatter(pSqlQueryTxt(), aSize.width, aSize.height));
        const sIsData = !!sTmpResult.data.chartOption.series;
        if (sIsData) {
            const sTheme = sTmpResult.data.theme === '-' ? 'vintage' : sTmpResult.data.theme;
            const sDataLength = sTmpResult.data.chartOption.series.length > 0 ? sTmpResult.data.chartOption.series[0].data.length : 0;
            sTmpResult.data.chartOption.dataZoom[0].start = 100 - (5 * aSize.width) / sDataLength;
            sTmpResult.data.chartOption.dataZoom[0].end = 100;

            setResult(sTmpResult.data);

            setTimeout(() => {
                const tmpChartDiv = drawChart(sTmpResult.data, sTheme);
                setChartDiv(tmpChartDiv);
            }, 100);
        } else setResult(null);
    };

    useEffect(() => {
        if (chartRef && chartRef.current && !!pSqlQueryTxt() && pQueryList.length > 0) {
            getChartData({
                width: chartRef.current.clientWidth,
                height: chartRef.current.clientHeight - sControlPanelHeight,
            });
            setStyle({
                width: Math.floor(chartRef.current.clientWidth),
                height: Math.floor(chartRef.current.clientHeight - sControlPanelHeight),
            });
        }
    }, [pDisplay]);

    useEffect(() => {
        if (pChartAixsList.length > 0) {
            setSelectedXAxis(pChartAixsList[0]);
            setSelectedYAxis(pChartAixsList[1]);
        }
    }, [pChartAixsList]);

    const reDrawChart = () => {
        const sTmpChartDiv: any = sChartDiv;
        const sDataLength = sResult.chartOption.series && sResult.chartOption.series.length > 0 ? sResult.chartOption.series[0].data.length : 0;
        sTmpChartDiv._model.option.dataZoom[0].start = 100 - (5 * chartRef.current.clientWidth) / sDataLength;
        sTmpChartDiv._model.option.dataZoom[0].end = 100;

        setChartDiv(sTmpChartDiv);

        setStyle({
            width: Math.floor(chartRef.current.clientWidth),
            height: Math.floor(chartRef.current.clientHeight - sControlPanelHeight),
        });
        reSizeChart(sChartDiv, {
            width: Math.floor(chartRef.current.clientWidth) + 'px',
            height: Math.floor(chartRef.current.clientHeight - sControlPanelHeight) + 'px',
        });
    };

    const handleAxis = (e: any, aControl: string) => {
        switch (aControl) {
            case 'X Axis':
                return setSelectedXAxis(e.target.value);
            case 'Y Axis':
                return setSelectedYAxis(e.target.value);
        }
    };

    useDebounce(chartRef, [pSizes, pIsVertical], reDrawChart);

    return pDisplay === '' ? (
        <div ref={chartRef} className="chart-wrapper" style={{ height: 'calc(100% - 40px)' }}>
            {pChartAixsList.length > 0 && pQueryList.length > 0 && sResult ? (
                <>
                    <div className="chart-control" style={{ height: `${sControlPanelHeight}px` }}>
                        {sControlList.map((aControl: string) => {
                            return (
                                <div className="chart-control-drop-wrapper" key={aControl}>
                                    <span>{aControl}</span>
                                    <div className="chart-control-drop">
                                        <div className="chart-control-select-wrapper">
                                            <select defaultValue={aControl === 'X Axis' ? sSelectedXAxis : sSelectedYAxis} onChange={(e) => handleAxis(e, aControl)}>
                                                {pChartAixsList.length > 0 ? (
                                                    pChartAixsList.map((aItem: string) => {
                                                        return (
                                                            <option value={aItem} key={aItem}>
                                                                {aItem}
                                                            </option>
                                                        );
                                                    })
                                                ) : (
                                                    <option>...</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="chart-control-play-btn">
                            <Play className="chart-control-play-btn-item" size="20px" color="#939498" onClick={() => getChartData(sStyle)} />
                        </div>
                    </div>
                    {sResult && (
                        <div className="chart_container">
                            <div className="chart_item" id={sResult.chartID} style={{ width: sStyle.width + 'px', height: sStyle.height + 'px', margin: 'auto' }}></div>
                        </div>
                    )}
                </>
            ) : (
                <></>
            )}
        </div>
    ) : (
        <></>
    );
};

export default CHART;
