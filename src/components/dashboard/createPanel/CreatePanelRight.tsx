import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent } from 'react';
import './CreatePanelRight.scss';
// import Line from './option/Line';
import { ChartTypeList } from '@/utils/constants';
import { ChartOptions } from './option/ChartOptions';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { GetDefaultSeriesOption } from '@/utils/eChartHelper';
import { Collapse } from '@/components/collapse/Collapse';

const CreatePanelRight = ({ pPanelOption, pSetPanelOption }: any) => {
    const handleDefaultOption = (aEvent: ChangeEvent<HTMLInputElement>, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                [aKey]: aEvent.target.value,
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

                <div className="divider"></div>
                <Collapse title="Panel Option">
                    <div className="panel-name-form">
                        <div className="panel-name-wrap">Title</div>
                        <Input
                            pType="text"
                            pIsFullWidth
                            pHeight={28}
                            pValue={pPanelOption.name}
                            pSetValue={() => null}
                            pBorderRadius={4}
                            onChange={(aEvent: any) => handleDefaultOption(aEvent, 'name')}
                        />
                    </div>
                </Collapse>
                <div className="divider"></div>
                <Collapse title="Chart Option">
                    <ChartCommonOptions pSetPanelOption={pSetPanelOption} pTheme={pPanelOption.theme} />
                    <ChartOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                </Collapse>
                <div className="divider"></div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
