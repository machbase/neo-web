import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { useState } from 'react';
import './CreatePanelRight.scss';
import Line from './option/Line';

const CreatePanelRight = ({ pPanelOption, pSetPanelOption }: any) => {
    const [sPanelOptionCollapse, setPanelOptionCollapse] = useState(true);
    const [sChartOptionCollapse, setChartOpitonCollapse] = useState(true);

    const changedOption = (aEvent: any, aKey: string) => {
        pSetPanelOption({ ...pPanelOption, [aKey]: Object.keys(aEvent.target).includes('checked') ? aEvent.target.checked : aEvent.target.value });
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
                        pInitValue={pPanelOption.chartType}
                        pHeight={30}
                        onChange={(aEvent: any) => changedOption(aEvent, 'chartType')}
                        pOptions={['line', 'bar', 'scatter']}
                    />
                </div>

                <div className="normal">
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                    <div className="panel-option-header" onClick={() => setPanelOptionCollapse(!sPanelOptionCollapse)}>
                        <div className="collapse-icon">{sPanelOptionCollapse ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                        Panel Option
                    </div>

                    <div style={sPanelOptionCollapse ? { marginLeft: '18px' } : { display: 'none' }}>
                        <div className="panel-name-form">
                            <div className="panel-name-wrap">Title</div>
                            <Input
                                pType="text"
                                pWidth={'100%'}
                                pHeight={28}
                                pValue={pPanelOption.panelName}
                                pSetValue={() => null}
                                pBorderRadius={4}
                                onChange={(aEvent: any) => changedOption(aEvent, 'panelName')}
                            />
                        </div>
                    </div>
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                </div>
                <div className="normal">
                    <div className="panel-option-header" onClick={() => setChartOpitonCollapse(!sChartOptionCollapse)}>
                        <div className="collapse-icon">{sChartOptionCollapse ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                        Chart Option
                    </div>

                    <div style={sChartOptionCollapse ? { marginLeft: '18px' } : { display: 'none' }}>
                        {(pPanelOption.chartType === 'line' || pPanelOption.chartType === 'bar' || pPanelOption.chartType === 'scatter') && (
                            <Line pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} pChangedOption={changedOption}></Line>
                        )}
                    </div>
                    <div className="divider" style={{ margin: '12px 3px' }}></div>
                </div>
            </div>
        </div>
    );
};
export default CreatePanelRight;
