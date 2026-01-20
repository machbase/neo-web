import { getTqlChart } from '@/api/repository/machiot';
import { useRef, useState, useEffect } from 'react';
import { sqlBasicChartFormatter, STATEMENT_TYPE } from '@/utils/sqlFormatter';
import { Play } from '@/assets/icons/Icon';
import './index.scss';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';
import { Button, Dropdown } from '@/design-system/components';

const CHART = ({
    pQueryList,
    pChartAixsList,
    pDisplay,
    pSqlQueryTxt,
}: {
    pQueryList: STATEMENT_TYPE[] | [];
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
        sTmpResult.data &&
            (await loadScriptsSequentially({
                jsAssets: ExistCommonScript(sTmpResult.data.jsAssets) as string[],
                jsCodeAssets: sTmpResult.data.jsCodeAssets ? sTmpResult.data.jsCodeAssets : [],
            }));
    };

    useEffect(() => {
        if (chartRef && chartRef.current && !!pSqlQueryTxt() && pQueryList.length > 0) getChartData();
    }, [pDisplay]);

    useEffect(() => {
        if (pChartAixsList?.length > 0) {
            setSelectedXAxis(pChartAixsList[0]);
            setSelectedYAxis(pChartAixsList[1]);
        }
    }, [pChartAixsList]);

    const handleAxis = (value: string, aControl: string) => {
        switch (aControl) {
            case 'X Axis':
                return setSelectedXAxis(value);
            case 'Y Axis':
                return setSelectedYAxis(value);
        }
    };

    return pDisplay === '' ? (
        <div ref={chartRef} className="chart-wrapper">
            {pChartAixsList.length > 0 && pQueryList.length > 0 && sResult ? (
                <>
                    <div className="chart-control" style={{ height: `${sControlPanelHeight}px`, alignItems: 'center' }}>
                        <Button.Group>
                            {sControlList.map((aControl: string) => {
                                const currentValue = aControl === 'X Axis' ? sSelectedXAxis : sSelectedYAxis;
                                const options = pChartAixsList.map((aItem: string) => ({
                                    value: aItem,
                                    label: aItem,
                                }));

                                return (
                                    <Dropdown.Root
                                        key={aControl}
                                        label={aControl}
                                        labelPosition="left"
                                        options={options}
                                        value={currentValue}
                                        onChange={(value: string) => handleAxis(value, aControl)}
                                        placeholder="..."
                                    >
                                        <Dropdown.Trigger style={{ height: '28px' }} />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                );
                            })}
                            <Button size="icon" variant="secondary" onClick={getChartData} icon={<Play size={16} />} />
                        </Button.Group>
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
