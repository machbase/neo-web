import { Input, Checkbox, Page } from '@/design-system/components';
import type { TagAnalyzerPanelGeneralConfig } from '../PanelEditorTypes';

const GeneralOptions = ['use_zoom', 'use_time_keeper'];

// Edits the general panel behavior such as title, zoom support, and time-keeper usage.
const General = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: {
    pGeneralConfig: TagAnalyzerPanelGeneralConfig;
    pOnChangeGeneralConfig: (aConfig: TagAnalyzerPanelGeneralConfig) => void;
}) => {
    const getCheckboxValue = (aEvent: any, aType: string) => {
        if (aEvent.target.checked === true) {
            pOnChangeGeneralConfig({ ...pGeneralConfig, [aType]: 'Y' });
        } else {
            if (aType === GeneralOptions[1]) {
                pOnChangeGeneralConfig({ ...pGeneralConfig, [aType]: 'N', time_keeper: {} });
            } else {
                pOnChangeGeneralConfig({ ...pGeneralConfig, [aType]: 'N' });
            }
        }
    };

    return (
        <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
            <Input
                label="Chart title"
                value={pGeneralConfig.chart_title}
                onChange={(aEvent: any) => pOnChangeGeneralConfig({ ...pGeneralConfig, chart_title: aEvent.target.value })}
                size="md"
                style={{ width: '180px' }}
            />
            <Page.DpRow style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'start' }}>
                <Checkbox checked={pGeneralConfig.use_zoom === 'Y'} onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[0])} label="Use Zoom when dragging" size="sm" />
                <Checkbox
                    checked={pGeneralConfig.use_time_keeper === 'Y'}
                    onChange={(aEvent: any) => getCheckboxValue(aEvent, GeneralOptions[1])}
                    label="Keep Navigator Posistion"
                    size="sm"
                />
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default General;
