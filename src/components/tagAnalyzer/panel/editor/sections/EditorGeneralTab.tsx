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
        if (field === 'use_time_keeper' && !checked) {
            pOnChangeGeneralConfig({
                ...pGeneralConfig,
                [field]: false,
                time_keeper: {},
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
            pActive={undefined}
            pSticky={undefined}
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
                variant={undefined}
                error={undefined}
                labelPosition={undefined}
                helperText={undefined}
                fullWidth={undefined}
                leftIcon={undefined}
                rightIcon={undefined}
            />
            <Page.DpRow
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '12px',
                    alignItems: 'start',
                }}
                className={undefined}
            >
                <Checkbox
                    checked={pGeneralConfig.use_zoom}
                    onChange={(event: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_zoom', event.target.checked)
                    }
                    label="Use Zoom when dragging"
                    size="sm"
                    error={undefined}
                    helperText={undefined}
                    indeterminate={undefined}
                />
                <Checkbox
                    checked={pGeneralConfig.use_time_keeper}
                    onChange={(event: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_time_keeper', event.target.checked)
                    }
                    label="Keep Navigator Posistion"
                    size="sm"
                    error={undefined}
                    helperText={undefined}
                    indeterminate={undefined}
                />
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorGeneralTab;
