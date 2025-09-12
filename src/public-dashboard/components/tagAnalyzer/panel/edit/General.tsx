import { Input } from '../../components/inputs/Input';
import './General.scss';

const GeneralOptions = ['use_zoom', 'use_time_keeper'];

const General = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'Y' });
        } else {
            if (aType === GeneralOptions[1]) {
                pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N', time_keeper: {} });
            } else {
                pSetCopyPanelInfo({ ...pPanelInfo, [aType]: 'N' });
            }
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
                <div className="row-options">
                    <input checked={pPanelInfo.use_zoom === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[0])} type="checkbox" />
                    <span>Use Zoom when dragging</span>
                </div>
                <div className="row-options">
                    <input checked={pPanelInfo.use_time_keeper === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[1])} type="checkbox" />
                    <span>Keep Navigator Posistion</span>
                </div>
            </div>
        </div>
    );
};

export default General;
