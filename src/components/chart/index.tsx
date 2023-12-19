import { getTqlChart } from '@/api/repository/machiot';
import { useRef, useState, useEffect } from 'react';
import { sqlBasicChartFormatter } from '@/utils/sqlFormatter';
import { Play } from '@/assets/icons/Icon';
import './index.scss';
import { loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

const CHART = ({
    pQueryList,
    pChartAixsList,
    pDisplay,
    pSqlQueryTxt,
}: {
    pQueryList: string[] | [];
    pChartAixsList: string[];
    pIsVertical?: boolean;
    pDisplay: string;
    pSqlQueryTxt: () => string;
    pSizes?: number[] | string[];
}) => {
    const [sResult, setResult] = useState<any>(null);
    const [sStyle, setStyle] = useState({ width: 0, height: 0 });
    const [sSelectedXAxis, setSelectedXAxis] = useState<string>('');
    const [sSelectedYAxis, setSelectedYAxis] = useState<string>('');
    const chartRef = useRef<any>(null);
    const sControlPanelHeight: number = 40;
    const sControlList: string[] = ['X Axis', 'Y Axis'];

    const getChartData = async () => {
        if (pChartAixsList.length === 0) return;
        const tmpSize = { width: Math.floor(chartRef.current.clientWidth), height: Math.floor(chartRef.current.clientHeight - sControlPanelHeight) };
        setStyle(tmpSize);
        const sTmpResult = await getTqlChart(
            sqlBasicChartFormatter(pSqlQueryTxt(), {
                x: sSelectedXAxis,
                y: sSelectedYAxis,
                xIndex: pChartAixsList.indexOf(sSelectedXAxis),
                yIndex: pChartAixsList.indexOf(sSelectedYAxis),
                list: pChartAixsList,
            })
        );
        setResult(sTmpResult.data);
        if (sTmpResult.data && sTmpResult.data.jsAssets) await loadScriptsSequentially(sTmpResult.data.jsAssets);
        if (sTmpResult.data && sTmpResult.data.jsCodeAssets) await loadScriptsSequentially(sTmpResult.data.jsCodeAssets);
    };

    useEffect(() => {
        if (chartRef && chartRef.current && !!pSqlQueryTxt() && pQueryList.length > 0) getChartData();
    }, [pDisplay]);

    useEffect(() => {
        if (pChartAixsList.length > 0) {
            setSelectedXAxis(pChartAixsList[0]);
            setSelectedYAxis(pChartAixsList[1]);
        }
    }, [pChartAixsList]);

    const handleAxis = (e: any, aControl: string) => {
        switch (aControl) {
            case 'X Axis':
                return setSelectedXAxis(e.target.value);
            case 'Y Axis':
                return setSelectedYAxis(e.target.value);
        }
    };

    return pDisplay === '' ? (
        <div ref={chartRef} className="chart-wrapper">
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
                            <Play className="chart-control-play-btn-item" size="20px" color="#939498" onClick={getChartData} />
                        </div>
                    </div>
                    <div className="chart_container">
                        <div className="chart_item" id={sResult.chartID} style={{ width: sStyle.width + 'px', height: sStyle.height + 'px' }} />
                    </div>
                </>
            ) : null}
        </div>
    ) : (
        <></>
    );
};

export default CHART;
