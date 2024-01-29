import './CreatePanelRight.scss';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import { ChartTypeList } from '@/utils/constants';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { CheckPlgChart, DefaultCommonOption, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { isTimeSeriesChart } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';
import { ScatterOptions } from './option/ScatterOptions';
import { GaugeOptions } from './option/GaugeOptions';
import { ChartType } from '@/type/eChart';
import { LiquidfillOptions } from './option/LiquidfillOptions';
import { generateUUID } from '@/utils';

interface CreatePanelRightProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pType: undefined | 'create' | 'edit';
}

const CreatePanelRight = (props: CreatePanelRightProps) => {
    const { pPanelOption, pSetPanelOption, pType } = props;
    const sPieLegendValue = { legendTop: 'top', legendLeft: 'right', legendOrient: 'vertical' };

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        const sIsPlgChart = CheckPlgChart(aEvent.target.value as ChartType);
        const sChangeChartOption = getDefaultSeriesOption(aEvent.target.value as ChartType);
        const sIsPie = aEvent.target.value === 'pie';
        pSetPanelOption((aPrev: any) => {
            const sResVal = {
                ...aPrev,
                id: generateUUID(),
                type: aEvent.target.value,
                chartInfo: sChangeChartOption,
                chartOptions: sChangeChartOption,
            };
            if (pType === 'create') {
                const sPieLegendOption = {
                    ...DefaultCommonOption,
                    ...sPieLegendValue,
                };
                sResVal.commonOptions = sIsPie ? sPieLegendOption : DefaultCommonOption;
            }
            if (sResVal.chartOptions?.tagLimit) sResVal.blockList = sResVal.blockList.slice(0, sResVal.chartOptions?.tagLimit);
            if (sIsPlgChart) sResVal.plg = sIsPlgChart.plg;
            else sResVal.plg = undefined;
            return sResVal;
        });
    };

    return (
        <div className="chart-set-wrap">
            <div className="body">
                {/* add '3DLine', '3DBar', '3DScatter' */}
                <Select
                    pFontSize={14}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pInitValue={pPanelOption.type}
                    pHeight={30}
                    onChange={(aEvent: any) => changeTypeOfSeriesOption(aEvent)}
                    pOptions={ChartTypeList}
                />
                <div className="divider" />
                <div className="content" style={{ height: '100%' }}>
                    <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />
                    {isTimeSeriesChart(pPanelOption.type) && pPanelOption.xAxisOptions && (
                        <>
                            <div className="divider" />
                            <XAxisOptions
                                pXAxis={pPanelOption.xAxisOptions}
                                pAxisInterval={pPanelOption.axisInterval}
                                pIsAxisInterval={pPanelOption.isAxisInterval}
                                pSetPanelOption={pSetPanelOption}
                            />
                        </>
                    )}
                    {isTimeSeriesChart(pPanelOption.type) && pPanelOption.yAxisOptions && (
                        <>
                            <div className="divider" />
                            <YAxisOptions pYAxis={pPanelOption.yAxisOptions} pSetPanelOption={pSetPanelOption} />
                        </>
                    )}
                    <div className="divider" />
                    <Collapse title="Chart Option" isOpen>
                        {pPanelOption.type === 'line' ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {pPanelOption.type === 'bar' ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {pPanelOption.type === 'scatter' ? <ScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {pPanelOption.type === 'pie' ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {pPanelOption.type === 'gauge' ? <GaugeOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {pPanelOption.type === 'liquidFill' ? <LiquidfillOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    </Collapse>
                    <div className="divider" />
                </div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
