import { Input } from '@/components/inputs/Input';
import './General.scss';
const General = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'Y' });
        } else {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N' });
        }
    };

    return (
        <div className="general">
            <div className="first-row">
                <div className="chart-title">
                    <div className="title-text">Chart Title</div>
                    <Input
                        pWidth={180}
                        pHeight={28}
                        pValue={pPanelInfo.chart_title}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, chart_title: aEvent.target.value })}
                    />
                </div>
            </div>
            <div className="second-row">
                <div className="zoom-dragging">
                    <input checked={pPanelInfo.use_zoom === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, 'use_zoom')} type="checkbox" />
                    <span>Use Zoom when dragging</span>
                </div>
            </div>
        </div>
    );
};

export default General;
