import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Input, Page } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';
import {
    AXES_SECTION_STYLE,
    EDITOR_X_AXIS_INPUT_STYLE,
} from '../EditorConstants';
import type {
    EditorCheckboxInputEvent,
    EditorInputEvent,
    EditorXAxisSectionProps,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';

const EditorXAxisSection = ({
    xAxisConfig,
    samplingConfig,
    onChangeXAxisConfig,
    onChangeSamplingConfig,
}: EditorXAxisSectionProps) => {
    return (
        <Page.ContentBlock pHoverNone style={AXES_SECTION_STYLE}>
            <Page.ContentText pContent="X-Axis" />
            <Checkbox
                checked={xAxisConfig.show_tickline}
                onChange={(event: EditorCheckboxInputEvent) =>
                    onChangeXAxisConfig({ show_tickline: event.target.checked })
                }
                label="Displays the X-Axis tick line"
                size="sm"
            />

            <Page.ContentDesc>Pixels between tick marks</Page.ContentDesc>
            <Page.DpRow style={{ padding: 0 }}>
                <Input
                    label="Raw"
                    labelPosition="left"
                    type="number"
                    value={xAxisConfig.raw_data_pixels_per_tick}
                    onChange={(event: EditorInputEvent) =>
                        onChangeXAxisConfig({
                            raw_data_pixels_per_tick: parseEditorNumber(event.target.value),
                        })
                    }
                    size="md"
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </Page.DpRow>
            <Page.DpRow style={{ padding: 0 }}>
                <Input
                    label="Calculation"
                    labelPosition="left"
                    type="number"
                    value={xAxisConfig.calculated_data_pixels_per_tick}
                    onChange={(event: EditorInputEvent) =>
                        onChangeXAxisConfig({
                            calculated_data_pixels_per_tick: parseEditorNumber(
                                event.target.value,
                            ),
                        })
                    }
                    size="md"
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </Page.DpRow>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                    className="warning-tooltip"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}
                >
                    <VscWarning color="#FDB532" />
                    use Sampling
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Checkbox
                        checked={samplingConfig.enabled}
                        onChange={(event: EditorCheckboxInputEvent) =>
                            onChangeSamplingConfig({ enabled: event.target.checked })
                        }
                        size="sm"
                    />
                    <Input
                        type="number"
                        disabled={!samplingConfig.enabled}
                        value={samplingConfig.sample_count}
                        onChange={(event: EditorInputEvent) =>
                            onChangeSamplingConfig({
                                sample_count: parseEditorNumber(event.target.value),
                            })
                        }
                        size="sm"
                        style={{ width: '150px' }}
                    />
                </div>
                <Tooltip
                    anchorSelect=".warning-tooltip"
                    content="Resource usage can be overloaded."
                />
            </div>
        </Page.ContentBlock>
    );
};

export default EditorXAxisSection;
