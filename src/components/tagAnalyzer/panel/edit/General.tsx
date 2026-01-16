import { Input, Checkbox, Page } from '@/design-system/components';

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
        <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
            <Input
                label="Chart title"
                value={pPanelInfo.chart_title}
                onChange={(aEvent: any) => pSetCopyPanelInfo({ ...pPanelInfo, chart_title: aEvent.target.value })}
                size="md"
                style={{ width: '180px' }}
            />
            <Page.DpRow style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'start' }}>
                <Checkbox checked={pPanelInfo.use_zoom === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[0])} label="Use Zoom when dragging" size="sm" />
                <Checkbox
                    checked={pPanelInfo.use_time_keeper === 'Y'}
                    onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[1])}
                    label="Keep Navigator Posistion"
                    size="sm"
                />
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default General;
