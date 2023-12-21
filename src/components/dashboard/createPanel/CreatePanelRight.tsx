import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChangeEvent, useState } from 'react';
import './CreatePanelRight.scss';
import Line from './option/Line';
import { ChartTypeList } from '@/utils/constants';

const CreatePanelRight = ({ pPanelOption, pSetPanelOption }: any) => {
    const [sPanelOptionCollapse, setPanelOptionCollapse] = useState<boolean>(true);
    const [sChartOptionCollapse, setChartOpitonCollapse] = useState<boolean>(true);

    const handleDefaultOption = (aEvent: ChangeEvent<HTMLInputElement>, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                [aKey]: aEvent.target.value,
            };
        });
    };

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        const sSeries = pPanelOption.chartInfo.series;
        const sChangeSeries = sSeries.map((aSeries: any, aIndex: number) => {
            return {
                ...aSeries[aIndex],
                type: aEvent.target.value,
            };
        });
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                type: aEvent.target.value,
                chartInfo: {
                    ...aPrev.chartInfo,
                    series: sChangeSeries,
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

                <div className="normal">
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                    <div className="panel-option-header" onClick={() => setPanelOptionCollapse(!sPanelOptionCollapse)}>
                        <div className="collapse-icon">{sPanelOptionCollapse ? <VscChevronDown /> : <VscChevronRight />}</div>
                        Panel Option
                    </div>

                    <div style={sPanelOptionCollapse ? { marginLeft: '18px' } : { display: 'none' }}>
                        <div className="panel-name-form">
                            <div className="panel-name-wrap">Title</div>
                            <Input
                                pType="text"
                                pWidth={'100%'}
                                pHeight={28}
                                pValue={pPanelOption.name}
                                pSetValue={() => null}
                                pBorderRadius={4}
                                onChange={(aEvent: any) => handleDefaultOption(aEvent, 'name')}
                            />
                        </div>
                    </div>
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                </div>
                <div className="normal">
                    <div className="panel-option-header" onClick={() => setChartOpitonCollapse(!sChartOptionCollapse)}>
                        <div className="collapse-icon">{sChartOptionCollapse ? <VscChevronDown /> : <VscChevronRight />}</div>
                        Chart Option
                    </div>

                    <div style={sChartOptionCollapse ? { marginLeft: '18px' } : { display: 'none' }}>
                        {(pPanelOption.type === 'line' || pPanelOption.type === 'bar' || pPanelOption.type === 'scatter') && (
                            <Line pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} pHandleDefaultOption={handleDefaultOption}></Line>
                        )}
                    </div>
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                </div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
