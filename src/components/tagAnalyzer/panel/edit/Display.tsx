import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Input, Checkbox, Page } from '@/design-system/components';

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
        <Page.ContentBlock style={{ padding: 0, margin: 0 }} pHoverNone>
            <Page.DpRow style={{ gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Page.ContentText pContent="Chart Type" />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <img
                            onClick={() => changeChartType('Zone')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: pPanelInfo.chart_type === 'Zone' ? 'solid 0.5px #4199ff' : 'solid 0.5px transparent',
                                boxShadow: pPanelInfo.chart_type === 'Zone' ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)' : 'none',
                            }}
                            src={InnerLine}
                            alt="Zone Chart"
                        />
                        <img
                            onClick={() => changeChartType('Dot')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: pPanelInfo.chart_type === 'Dot' ? 'solid 0.5px #4199ff' : 'solid 0.5px transparent',
                                boxShadow: pPanelInfo.chart_type === 'Dot' ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)' : 'none',
                            }}
                            src={Scatter}
                            alt="Dot Chart"
                        />
                        <img
                            onClick={() => changeChartType('Line')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border: pPanelInfo.chart_type === 'Line' ? 'solid 0.5px #4199ff' : 'solid 0.5px transparent',
                                boxShadow: pPanelInfo.chart_type === 'Line' ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)' : 'none',
                            }}
                            src={Line}
                            alt="Line Chart"
                        />
                    </div>
                    <Checkbox
                        checked={pPanelInfo.show_point === 'Y'}
                        onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_point')}
                        label="Display data points in the line chart"
                        size="sm"
                    />
                    <Checkbox checked={pPanelInfo.show_legend === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'show_legend')} label="Display legend" size="sm" />
                </div>
                <Page.DpRow style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '16px', marginTop: '8px' }}>
                    <Input
                        label="Point Radius"
                        labelPosition="left"
                        type="number"
                        value={pPanelInfo.point_radius}
                        onChange={(aEvent: any) => {
                            const sValue = aEvent.target.value;
                            pSetCopyPanelInfo({
                                ...pPanelInfo,
                                point_radius: sValue !== '' ? Number(sValue) : sValue,
                            });
                        }}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                    />
                    <Input
                        label="Opacity Of Fill Area"
                        labelPosition="left"
                        type="number"
                        value={pPanelInfo.fill}
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, fill: aEvent.target.value })}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                    />
                    <Input
                        label="Line Thickness"
                        labelPosition="left"
                        type="number"
                        value={pPanelInfo.stroke}
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, stroke: aEvent.target.value })}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                    />
                </Page.DpRow>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default Display;
