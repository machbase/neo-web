import './CreatePanelRight.scss';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import { ChartTypeList } from '@/utils/constants';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { CheckCustomChartType, CheckPlgChart, DefaultCommonOption, chartTypeConverter, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { geomapAggregatorList, useXAxis, useYAxis } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';
import { ScatterOptions } from './option/ScatterOptions';
import { GaugeOptions } from './option/GaugeOptions';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { LiquidfillOptions } from './option/LiquidfillOptions';
import { TqlOptions } from './option/TqlOptions';
import { TextOptions } from './option/TextOptions';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { GeomapOptions } from './option/GeomapOptions';
import { AdvancedScatterOptions } from './option/AdvanceScatter';
import { CalcBlockTotal, CalcBlockTotalType } from '@/utils/helpers/Dashboard/BlockHelper';
import { TrxParsedBlockType } from '@/utils/Chart/TransformDataParser';

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
        const sIsPie = sConvertedChartType === E_CHART_TYPE.PIE;
        const sIsAdvScatter = sConvertedChartType === E_CHART_TYPE.ADV_SCATTER;

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
                if (sIsPie) sResVal.commonOptions = sPieLegendOption;
                else sResVal.commonOptions = DefaultCommonOption;

                if (sIsAdvScatter) sResVal.commonOptions.tooltipTrigger = 'item';
            }
            if (sConvertedChartType === E_CHART_TYPE.TQL) {
                sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };
                sResVal.theme = 'white';
            } else {
                sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };
                sResVal.theme = 'dark';
            }
            if (sIsPlgChart) sResVal.plg = sIsPlgChart.plg;
            else sResVal.plg = undefined;

            const sBlockCntInfo: CalcBlockTotalType = CalcBlockTotal(sResVal);
            if (sBlockCntInfo.total > sBlockCntInfo.limit) {
                let sLimit = sBlockCntInfo.limit;
                const sQueryBlock = sResVal.blockList.map((qBlock) => {
                    if (sLimit > 0) {
                        --sLimit;
                        return { ...qBlock, isVisible: true };
                    } else return { ...qBlock, isVisible: false };
                });
                const sTrxBlock: TrxParsedBlockType[] = sResVal.transformBlockList.map((tBlock: TrxParsedBlockType) => {
                    if (sLimit > 0) {
                        --sLimit;
                        return { ...tBlock, isVisible: true };
                    } else return { ...tBlock, isVisible: false };
                });

                sResVal.blockList = sQueryBlock;
                sResVal.transformBlockList = sTrxBlock;
            }

            if (sConvertedChartType !== E_CHART_TYPE.GEOMAP) {
                if (sConvertedChartType !== E_CHART_TYPE.LINE && sConvertedChartType !== E_CHART_TYPE.BAR) {
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
                <Select
                    pFontSize={14}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pInitValue={pPanelOption.type}
                    pHeight={30}
                    onChange={(aEvent: any) => changeTypeOfSeriesOption(aEvent)}
                    pOptions={ChartTypeList.map((aType: { key: string; value: string }) => aType.key) as string[]}
                />
                <div className="content" style={{ height: '100%' }}>
                    {chartTypeConverter(pPanelOption.type) !== E_CHART_TYPE.TQL && <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />}
                    {useXAxis(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption?.xAxisOptions && (
                        <XAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                    )}
                    {useYAxis(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption?.yAxisOptions && (
                        <YAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                    )}
                    <div className="divider" />
                    {CheckCustomChartType(pPanelOption.type) ? (
                        <>
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.GEOMAP ? <GeomapOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TEXT ? <TextOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TQL ? <TqlOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? (
                                <AdvancedScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                        </>
                    ) : (
                        <Collapse title="Chart option" isOpen>
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.LINE ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.BAR ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.SCATTER ? (
                                <ScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.PIE ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.GAUGE ? <GaugeOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.LIQUID_FILL ? (
                                <LiquidfillOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                        </Collapse>
                    )}
                    <div className="divider" />
                </div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
