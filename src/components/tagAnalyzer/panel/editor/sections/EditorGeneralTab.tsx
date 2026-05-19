import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    EditorCheckboxInputEvent,
    EditorInputEvent,
    GeneralFlagField,
    PanelGeneralConfig,
} from '../EditorTypes';

const EditorGeneralTab = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: {
    pGeneralConfig: PanelGeneralConfig;
    pOnChangeGeneralConfig: (config: PanelGeneralConfig) => void;
}) => {
    const setGeneralFlag = (field: GeneralFlagField, checked: boolean) => {
        if (field === 'use_last_viewed_range' && !checked) {
            pOnChangeGeneralConfig({
                ...pGeneralConfig,
                [field]: false,
                last_viewed_range: {},
            });
            return;
        }

        pOnChangeGeneralConfig({
            ...pGeneralConfig,
            [field]: checked,
        });
    };

    return (
        <Page.ContentBlock
            style={{ padding: '4px' }}
            pHoverNone
        >
            <Input
                label="Chart title"
                value={pGeneralConfig.chart_title}
                onChange={(event: EditorInputEvent) => {
                    pOnChangeGeneralConfig({
                        ...pGeneralConfig,
                        chart_title: event.target.value,
                    });
                }}
                size="md"
                style={{ width: '180px' }}
            />
            <Page.DpRow
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '12px',
                    alignItems: 'start',
                }}
            >
                <Checkbox
                    checked={pGeneralConfig.use_zoom}
                    onChange={(event: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_zoom', event.target.checked)
                    }
                    label="Use Zoom when dragging"
                    size="sm"
                />
                <Checkbox
                    checked={pGeneralConfig.use_last_viewed_range}
                    onChange={(event: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_last_viewed_range', event.target.checked)
                    }
                    label="Keep Navigator Posistion"
                    size="sm"
                />
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorGeneralTab;
