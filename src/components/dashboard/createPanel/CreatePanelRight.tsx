import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import './CreatePanelRight.scss';
// import Line from './option/Line';
import { ChartTypeList } from '@/utils/constants';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { GetDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';
import { PieOptions } from './option/PieOptions';
import CheckBox from '@/components/inputs/CheckBox';
import { LineOptions } from './option/LineOptions';

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
        // const sSeries = pPanelOption.chartInfo.series;
        // const sChangeSeries = sSeries.map((aSeries: any, aIndex: number) => {
        //     return {
        //         ...aSeries[aIndex],
        //         type: aEvent.target.value,
        //     };
        // });
        // pSetPanelOption((aPrev: any) => {
        //     return {
        //         ...aPrev,
        //         type: aEvent.target.value,
        //         chartInfo: {
        //             ...aPrev.chartInfo,
        //             series: sChangeSeries,
        //         },
        //     };
        // });
        const sChangeCahrtOption = GetDefaultSeriesOption(aEvent.target.value);
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                type: aEvent.target.value,
                chartInfo: {
                    ...sChangeCahrtOption,
                },
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
                <Collapse title="Panel Option">
                    <ChartCommonOptions pPanelOption={pPanelOption} pHandleOption={handleDefaultOption} />
                </Collapse>
                <div className="divider" />
                <Collapse title="Legend">
                    <CheckBox pText="Show Legend" pDefaultChecked={pPanelOption.isLegend} onChange={(aEvent: any) => handleCheckboxOption(aEvent, 'isLegend')} />
                </Collapse>
                <div className="divider" />
                <Collapse title="Tooltip">
                    <CheckBox pText="Show Tooltip" pDefaultChecked={pPanelOption.isTooltip} onChange={(aEvent: any) => handleCheckboxOption(aEvent, 'isTooltip')} />
                </Collapse>
                <div className="divider" />
                <Collapse title="Data Zoom">
                    <CheckBox pText="Use Zoom" pDefaultChecked={pPanelOption.isDataZoom} onChange={(aEvent: any) => handleCheckboxOption(aEvent, 'isDataZoom')} />
                </Collapse>
                <div className="divider" />
                <Collapse title="Chart Option">
                    {/* <ChartOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> */}
                    {pPanelOption.type === 'line' ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                    {pPanelOption.type === 'pie' ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                </Collapse>
                <div className="divider" />
            </div>
        </div>
    );
};
export default CreatePanelRight;
