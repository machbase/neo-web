import { Checkbox, Input, Page } from '@/design-system/components';
import {
    AXES_SECTION_STYLE,
    EDITOR_AXIS_COMPACT_INPUT_STYLE,
    EDITOR_AXIS_THRESHOLD_INPUT_STYLE,
} from '../EditorConstants';
import type {
    EditorCheckboxInputEvent,
    EditorInputEvent,
    EditorYAxisSectionProps,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';

const EditorYAxisSection = ({
    title,
    axisConfig,
    onChangeAxisConfig,
    rangeRows,
    thresholdRows,
    enableToggle,
    isRightYAxis,
    zeroBaseDisabled,
    tickLineDisabled,
    children,
}: EditorYAxisSectionProps) => {
    return (
        <Page.ContentBlock
            pHoverNone
            style={{
                ...AXES_SECTION_STYLE,
                ...(isRightYAxis ? { flexWrap: 'wrap' } : undefined),
            }}
        >
            <Page.ContentText pContent={title} />
            {enableToggle && (
                <Checkbox
                    checked={enableToggle.checked}
                    onChange={(event: EditorCheckboxInputEvent) =>
                        enableToggle.onChange(event.target.checked)
                    }
                    label={enableToggle.label}
                    size="sm"
                />
            )}

            <Checkbox
                checked={axisConfig.zero_base}
                onChange={(event: EditorCheckboxInputEvent) =>
                    onChangeAxisConfig({ zero_base: event.target.checked })
                }
                disabled={zeroBaseDisabled}
                label="The scale of the Y-axis start at zero"
                size="sm"
            />

            <Checkbox
                checked={axisConfig.show_tickline}
                onChange={(event: EditorCheckboxInputEvent) =>
                    onChangeAxisConfig({ show_tickline: event.target.checked })
                }
                disabled={tickLineDisabled}
                label="Displays the Y-Axis tick line"
                size="sm"
            />

            {rangeRows.map(({ label, rangeKey, disabled, labelMinWidth }) => (
                <div
                    key={rangeKey}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: disabled ? 0.6 : 1,
                    }}
                >
                    <span
                        style={
                            labelMinWidth
                                ? {
                                      minWidth: labelMinWidth,
                                      color: 'rgba(255, 255, 255, 0.5)',
                                      fontSize: '11px',
                                  }
                                : undefined
                        }
                    >
                        {label}
                    </span>
                    <Input
                        type="number"
                        value={axisConfig[rangeKey].min}
                        disabled={disabled}
                        onChange={(event: EditorInputEvent) =>
                            onChangeAxisConfig({
                                [rangeKey]: {
                                    ...axisConfig[rangeKey],
                                    min: parseEditorNumber(event.target.value),
                                },
                            })
                        }
                        size="sm"
                        style={EDITOR_AXIS_COMPACT_INPUT_STYLE}
                    />
                    <span style={{ margin: '0 5px' }}>~</span>
                    <Input
                        type="number"
                        value={axisConfig[rangeKey].max}
                        disabled={disabled}
                        onChange={(event: EditorInputEvent) =>
                            onChangeAxisConfig({
                                [rangeKey]: {
                                    ...axisConfig[rangeKey],
                                    max: parseEditorNumber(event.target.value),
                                },
                            })
                        }
                        size="sm"
                        style={EDITOR_AXIS_COMPACT_INPUT_STYLE}
                    />
                </div>
            ))}

            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {thresholdRows.map(({ thresholdKey, label, disabled }) => {
                    const sThresholdConfig = axisConfig[thresholdKey];

                    return (
                        <div
                            key={thresholdKey}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Checkbox
                                disabled={disabled}
                                checked={sThresholdConfig.enabled}
                                onChange={(event: EditorCheckboxInputEvent) =>
                                    onChangeAxisConfig({
                                        [thresholdKey]: {
                                            ...sThresholdConfig,
                                            enabled: event.target.checked,
                                        },
                                    })
                                }
                                label={label}
                                size="sm"
                            />
                            <Input
                                type="number"
                                value={sThresholdConfig.value}
                                disabled={!sThresholdConfig.enabled || disabled}
                                onChange={(event: EditorInputEvent) =>
                                    onChangeAxisConfig({
                                        [thresholdKey]: {
                                            ...sThresholdConfig,
                                            value: parseEditorNumber(event.target.value),
                                        },
                                    })
                                }
                                size="sm"
                                style={EDITOR_AXIS_THRESHOLD_INPUT_STYLE}
                            />
                        </div>
                    );
                })}
            </div>
            {children}
        </Page.ContentBlock>
    );
};

export default EditorYAxisSection;
