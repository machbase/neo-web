import './CreatePanelRight.scss';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import { ChartTypeList } from '@/utils/constants';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { getDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { isTimeSeriesChart } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';

const CreatePanelRight = ({ pPanelOption, pSetPanelOption }: any) => {
    const handleDefaultOption = (aEvent: ChangeEvent<HTMLInputElement>, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                [aKey]: aEvent.target.value,
            };
        });
    };

    const handleCheckboxOption = (aEvent: ChangeEvent<HTMLInputElement>, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                [aKey]: aEvent.target.checked,
            };
        });
    };

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        const sChangeChartOption = getDefaultSeriesOption(aEvent.target.value);
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                type: aEvent.target.value,
                chartInfo: sChangeChartOption,
                chartOptions: sChangeChartOption,
            };
        });
    };

    return (
        <div className="chart-set-wrap">
            <div className="body">
                <div className="select">
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
                </div>
                <div className="divider" />
                <ChartCommonOptions pPanelOption={pPanelOption} pHandleDefaultOption={handleDefaultOption} pHandleCheckboxOption={handleCheckboxOption} />
                {isTimeSeriesChart(pPanelOption.type) && pPanelOption.xAxisOptions && (
                    <>
                        <div className="divider" />
                        <XAxisOptions pXAxis={pPanelOption.xAxisOptions} pSetPanelOption={pSetPanelOption} />
                    </>
                )}
                {isTimeSeriesChart(pPanelOption.type) && pPanelOption.yAxisOptions && (
                    <>
                        <div className="divider" />
                        <YAxisOptions pYAxis={pPanelOption.yAxisOptions} pSetPanelOption={pSetPanelOption} />
                    </>
                )}
                <div className="divider" />
                <Collapse title="Chart Option">
                    {pPanelOption.type === 'line' ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    {pPanelOption.type === 'bar' ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    {pPanelOption.type === 'pie' ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                </Collapse>
                <div className="divider" />
            </div>
        </div>
    );
};
export default CreatePanelRight;
