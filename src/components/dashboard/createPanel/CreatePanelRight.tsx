import './CreatePanelRight.scss';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import { ChartTypeList } from '@/utils/constants';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { CheckPlgChart, DefaultCommonOption, chartTypeConverter, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { geomapAggregatorList, isTimeSeriesChart } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';
import { ScatterOptions } from './option/ScatterOptions';
import { GaugeOptions } from './option/GaugeOptions';
import { ChartType } from '@/type/eChart';
import { LiquidfillOptions } from './option/LiquidfillOptions';
import { TqlOptions } from './option/TqlOptions';
import { TextOptions } from './option/TextOptions';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { GeomapOptions } from './option/GeomapOptions';

interface CreatePanelRightProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pType: undefined | 'create' | 'edit';
}

const CreatePanelRight = (props: CreatePanelRightProps) => {
    const { pPanelOption, pSetPanelOption, pType } = props;
    const sPieLegendValue = { legendTop: 'top', legendLeft: 'right', legendOrient: 'vertical' };

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        const sConvertedChartType = chartTypeConverter(aEvent.target.value);
        const sIsPlgChart = CheckPlgChart(sConvertedChartType as ChartType);
        const sChangeChartOption = getDefaultSeriesOption(sConvertedChartType as ChartType);
        const sIsPie = sConvertedChartType === 'pie';
        pSetPanelOption((aPrev: any) => {
            const sResVal = {
                ...aPrev,
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
            if (sConvertedChartType === 'tql') {
                sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };
                sResVal.theme = 'white';
            } else {
                sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };
                sResVal.theme = 'dark';
            }
            if (sResVal.chartOptions?.tagLimit) sResVal.blockList = sResVal.blockList.slice(0, sResVal.chartOptions?.tagLimit);
            if (sIsPlgChart) sResVal.plg = sIsPlgChart.plg;
            else sResVal.plg = undefined;
            if (sConvertedChartType !== 'geomap') {
                if (sConvertedChartType !== 'line' && sConvertedChartType !== 'bar') {
                    sResVal.blockList = sResVal.blockList.map((block: any) => {
                        return { ...block, values: [block.values[0]], customFullTyping: { use: false, text: '' } };
                    });
                } else {
                    sResVal.blockList = sResVal.blockList.map((block: any) => {
                        return { ...block, values: [block.values[0]] };
                    });
                }
            } else {
                sResVal.blockList = sResVal.blockList.map((block: any) => {
                    const sTmpValues = block.values.map((value: any) => {
                        if (geomapAggregatorList.includes(value.aggregator) || value.aggregator.match(VARIABLE_REGEX)) return value;
                        else return { ...value, aggregator: geomapAggregatorList[0] };
                    });
                    return { ...block, values: sTmpValues, useCustom: true };
                });
            }
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
                    pOptions={ChartTypeList.map((aType: { key: string; value: string }) => aType.key) as string[]}
                />

                {chartTypeConverter(pPanelOption.type) !== 'tql' && <div className="divider" />}
                <div className="content" style={{ height: '100%' }}>
                    {chartTypeConverter(pPanelOption.type) !== 'tql' && <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />}

                    {isTimeSeriesChart(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption.xAxisOptions && (
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
                    {isTimeSeriesChart(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption.yAxisOptions && (
                        <>
                            <div className="divider" />
                            <YAxisOptions pYAxis={pPanelOption.yAxisOptions} pSetPanelOption={pSetPanelOption} />
                        </>
                    )}
                    <div className="divider" />
                    {chartTypeConverter(pPanelOption.type) !== 'tql' && chartTypeConverter(pPanelOption.type) !== 'text' && chartTypeConverter(pPanelOption.type) !== 'geomap' && (
                        <Collapse title="Chart option" isOpen>
                            {chartTypeConverter(pPanelOption.type) === 'line' ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === 'bar' ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === 'scatter' ? <ScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === 'pie' ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === 'gauge' ? <GaugeOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === 'liquidFill' ? <LiquidfillOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        </Collapse>
                    )}
                    {chartTypeConverter(pPanelOption.type) === 'geomap' ? <GeomapOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    {chartTypeConverter(pPanelOption.type) === 'text' ? <TextOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    {chartTypeConverter(pPanelOption.type) === 'tql' ? <TqlOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    <div className="divider" />
                </div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
