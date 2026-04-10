import { Input, Checkbox, Page } from '@/design-system/components';
import type { TagAnalyzerPanelGeneralConfig } from '../PanelEditorTypes';

// Used by General to type flag field.
type GeneralFlagField = 'use_zoom' | 'use_time_keeper';
// Used by General to type text input event.
type TextInputEvent = {
    target: {
        value: string;
    };
};
// Used by General to type checkbox input event.
type CheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

// Edits the general panel behavior such as title, zoom support, and time-keeper usage.
const General = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: {
    pGeneralConfig: TagAnalyzerPanelGeneralConfig;
    pOnChangeGeneralConfig: (aConfig: TagAnalyzerPanelGeneralConfig) => void;
}) => {
    const updateGeneralConfig = (aPatch: Partial<TagAnalyzerPanelGeneralConfig>) => {
        pOnChangeGeneralConfig({ ...pGeneralConfig, ...aPatch });
    };

    const setGeneralFlag = (aField: GeneralFlagField, aChecked: boolean) => {
        if (aField === 'use_time_keeper' && !aChecked) {
            updateGeneralConfig({ [aField]: 'N', time_keeper: {} } as Partial<TagAnalyzerPanelGeneralConfig>);
            return;
        }

        updateGeneralConfig({ [aField]: aChecked ? 'Y' : 'N' } as Partial<TagAnalyzerPanelGeneralConfig>);
    };

    return (
        <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
            <Input
                label="Chart title"
                value={pGeneralConfig.chart_title}
                onChange={(aEvent: TextInputEvent) => updateGeneralConfig({ chart_title: aEvent.target.value })}
                size="md"
                style={{ width: '180px' }}
            />
            <Page.DpRow style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'start' }}>
                <Checkbox checked={pGeneralConfig.use_zoom === 'Y'} onChange={(aEvent: CheckboxInputEvent) => setGeneralFlag('use_zoom', aEvent.target.checked)} label="Use Zoom when dragging" size="sm" />
                <Checkbox
                    checked={pGeneralConfig.use_time_keeper === 'Y'}
                    onChange={(aEvent: CheckboxInputEvent) => setGeneralFlag('use_time_keeper', aEvent.target.checked)}
                    label="Keep Navigator Posistion"
                    size="sm"
                />
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default General;
