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
    PanelSamplingDraft,
    PanelXAxisDraft,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';

const EditorXAxisSection = ({
    xAxisConfig,
    samplingConfig,
    mainChartSamplingConfig,
    isRawMode,
    onChangeXAxisConfig,
    onChangeSamplingConfig,
    onChangeMainChartSamplingConfig,
}: {
    xAxisConfig: PanelXAxisDraft;
    samplingConfig: PanelSamplingDraft;
    mainChartSamplingConfig: PanelSamplingDraft;
    isRawMode: boolean;
    onChangeXAxisConfig: (patch: Partial<PanelXAxisDraft>) => void;
    onChangeSamplingConfig: (patch: Partial<PanelSamplingDraft>) => void;
    onChangeMainChartSamplingConfig: (patch: Partial<PanelSamplingDraft>) => void;
}) => {
    const sRawControlDisabled = !isRawMode;
    const sCalculationControlDisabled = isRawMode;
    const sSamplingControlDisabled = !isRawMode;

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

            <Page.ContentDesc>Raw</Page.ContentDesc>
            <Page.DpRow style={{ padding: 0, opacity: sRawControlDisabled ? 0.45 : 1 }}>
                <Input
                    label="Pixels between tick marks"
                    labelPosition="left"
                    type="number"
                    disabled={sRawControlDisabled}
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
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: sSamplingControlDisabled ? 0.45 : 1,
                }}
            >
                <span
                    className="main-chart-sampling-tooltip"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}
                >
                    <VscWarning color="#FDB532" />
                    Use main chart sampling
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Checkbox
                        checked={mainChartSamplingConfig.enabled}
                        onChange={(event: EditorCheckboxInputEvent) =>
                            onChangeMainChartSamplingConfig({
                                enabled: event.target.checked,
                            })
                        }
                        disabled={sSamplingControlDisabled}
                        size="sm"
                    />
                    <Input
                        type="number"
                        disabled={
                            sSamplingControlDisabled || !mainChartSamplingConfig.enabled
                        }
                        value={mainChartSamplingConfig.sample_count}
                        onChange={(event: EditorInputEvent) =>
                            onChangeMainChartSamplingConfig({
                                sample_count: parseEditorNumber(event.target.value),
                            })
                        }
                        size="sm"
                        style={{ width: '150px' }}
                    />
                </div>
                <Tooltip
                    anchorSelect=".main-chart-sampling-tooltip"
                    content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: sSamplingControlDisabled ? 0.45 : 1,
                }}
            >
                <span
                    className="navigation-sampling-tooltip"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'rgba(255, 255, 255, 0.5)',
                    }}
                >
                    <VscWarning color="#FDB532" />
                    Use navigation sampling
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Checkbox
                        checked={samplingConfig.enabled}
                        onChange={(event: EditorCheckboxInputEvent) =>
                            onChangeSamplingConfig({ enabled: event.target.checked })
                        }
                        disabled={sSamplingControlDisabled}
                        size="sm"
                    />
                    <Input
                        type="number"
                        disabled={sSamplingControlDisabled || !samplingConfig.enabled}
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
                    anchorSelect=".navigation-sampling-tooltip"
                    content="Raw navigator data uses this as the database sampling value. When disabled, the raw navigator uses calculated data."
                />
            </div>

            <Page.ContentDesc>Calculation</Page.ContentDesc>
            <Page.DpRow
                style={{ padding: 0, opacity: sCalculationControlDisabled ? 0.45 : 1 }}
            >
                <Input
                    label="Pixels between tick marks"
                    labelPosition="left"
                    type="number"
                    disabled={sCalculationControlDisabled}
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
        </Page.ContentBlock>
    );
};

export default EditorXAxisSection;
