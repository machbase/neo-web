import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    EditorCheckboxInputEvent,
    EditorGeneralTabProps,
    EditorInputEvent,
    GeneralFlagField,
} from '../EditorTypes';

/**
 * Edits the general panel behavior such as title, zoom support, and time-keeper usage.
 * Intent: Keep the top-level panel settings together in one small form section.
 * @param {PanelGeneralConfig} pGeneralConfig The current general config.
 * @param {(aConfig: PanelGeneralConfig) => void} pOnChangeGeneralConfig Updates the general config.
 * @returns {JSX.Element}
 */
const EditorGeneralTab = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: EditorGeneralTabProps) => {
    /**
     * Updates one general-config flag and resets time-keeper state when needed.
     * Intent: Keep the time-keeper toggle from leaving stale configuration behind.
     * @param {GeneralFlagField} field The flag field to update.
     * @param {boolean} checked The new checked state.
     * @returns {void}
     */
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
