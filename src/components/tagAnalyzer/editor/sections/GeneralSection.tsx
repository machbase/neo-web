import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    TagAnalyzerPanelGeneralConfig,
    EditorCheckboxInputEvent,
    EditorInputEvent,
} from '../PanelEditorTypes';

// Used by GeneralSection to type flag field.
type GeneralFlagField = 'use_zoom' | 'use_time_keeper';

/**
 * Edits the general panel behavior such as title, zoom support, and time-keeper usage.
 * Intent: Keep the top-level panel settings together in one small form section.
 * @param {TagAnalyzerPanelGeneralConfig} pGeneralConfig The current general config.
 * @param {(aConfig: TagAnalyzerPanelGeneralConfig) => void} pOnChangeGeneralConfig Updates the general config.
 * @returns {JSX.Element}
 */
const GeneralSection = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: {
    pGeneralConfig: TagAnalyzerPanelGeneralConfig;
    pOnChangeGeneralConfig: (aConfig: TagAnalyzerPanelGeneralConfig) => void;
}) => {
    /**
     * Updates one general-config flag and resets time-keeper state when needed.
     * Intent: Keep the time-keeper toggle from leaving stale configuration behind.
     * @param {GeneralFlagField} aField The flag field to update.
     * @param {boolean} aChecked The new checked state.
     * @returns {void}
     */
    const setGeneralFlag = (aField: GeneralFlagField, aChecked: boolean) => {
        if (aField === 'use_time_keeper' && !aChecked) {
            pOnChangeGeneralConfig({
                ...pGeneralConfig,
                [aField]: false,
                time_keeper: {},
            });
            return;
        }

        pOnChangeGeneralConfig({
            ...pGeneralConfig,
            [aField]: aChecked,
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
                onChange={(aEvent: EditorInputEvent) => {
                    pOnChangeGeneralConfig({
                        ...pGeneralConfig,
                        chart_title: aEvent.target.value,
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
                    onChange={(aEvent: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_zoom', aEvent.target.checked)
                    }
                    label="Use Zoom when dragging"
                    size="sm"
                    error={undefined}
                    helperText={undefined}
                    indeterminate={undefined}
                />
                <Checkbox
                    checked={pGeneralConfig.use_time_keeper}
                    onChange={(aEvent: EditorCheckboxInputEvent) =>
                        setGeneralFlag('use_time_keeper', aEvent.target.checked)
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

export default GeneralSection;
