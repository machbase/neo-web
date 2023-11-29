import './Display.scss';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Input } from '@/components/inputs/Input';

const Display = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const changeChartType = (aValue: string) => {
        if (aValue === 'Zone') {
            pSetCopyPanelInfo({ ...pPanelInfo, chart_type: aValue, show_point: 'N', point_radius: 0, fill: 0.15, stroke: 1 });
        } else if (aValue === 'Dot') {
            pSetCopyPanelInfo({ ...pPanelInfo, chart_type: aValue, show_point: 'Y', point_radius: 2, fill: 0, stroke: 0 });
        } else {
            pSetCopyPanelInfo({ ...pPanelInfo, chart_type: aValue, show_point: 'Y', point_radius: 0, fill: 0, stroke: 1 });
        }
    };

    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'Y' });
        } else {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N' });
        }
    };

    return (
        <div className="display">
            <div className="first-row">
                <div className="chart-type">
                    <div className="chart-type-title">Chart Type</div>
                    <div className="type-img">
                        <img
                            onClick={() => changeChartType('Zone')}
                            style={pPanelInfo.chart_type === 'Zone' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                            src={InnerLine}
                        />
                        <img
                            onClick={() => changeChartType('Dot')}
                            style={pPanelInfo.chart_type === 'Dot' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                            src={Scatter}
                        />
                        <img
                            onClick={() => changeChartType('Line')}
                            style={pPanelInfo.chart_type === 'Line' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                            src={Line}
                        />
                    </div>
                </div>
                <div className="display-pointer">
                    <input checked={pPanelInfo.show_point === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_point')} type="checkbox" />
                    <span>Display data points in the line chart</span>
                </div>
                <div className="display-legend">
                    <input defaultChecked={pPanelInfo.show_legend === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_legend')} type="checkbox" />
                    <span>Display legend</span>
                </div>
            </div>
            <div className="second-row">
                <div>
                    <span>Point Radius</span>
                    <Input
                        pWidth={150}
                        pHeight={28}
                        pValue={pPanelInfo.point_radius}
                        pSetValue={() => null}
                        pType="number"
                        onChange={(aEvent: any) => {
                            const sValue = aEvent.target.value;
                            pSetCopyPanelInfo({
                                ...pPanelInfo,
                                point_radius: sValue !== '' ? Number(sValue) : sValue,
                            });
                        }}
                    />
                </div>
                <div>
                    <span>Opacity Of Fill Area</span>
                    <Input
                        pWidth={150}
                        pHeight={28}
                        pValue={pPanelInfo.fill}
                        pSetValue={() => null}
                        pType="number"
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, fill: aEvent.target.value })}
                    />
                </div>
                <div>
                    <span>Line Thickness</span>
                    <Input
                        pWidth={150}
                        pHeight={28}
                        pValue={pPanelInfo.stroke}
                        pSetValue={() => null}
                        pType="number"
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, stroke: aEvent.target.value })}
                    />
                </div>
            </div>
        </div>
    );
};

export default Display;
