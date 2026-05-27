import { Checkbox, Input } from '@/design-system/components';
import {
    EDITOR_AXIS_COMPACT_INPUT_STYLE,
    EDITOR_AXIS_THRESHOLD_INPUT_STYLE,
} from '../EditorConstants';
import type { ReactNode } from 'react';
import type {
    PanelYAxisDraft,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';
import { isAxisRangeInvalid } from '../PanelEditorValidation';
import styles from '../PanelEditor.module.scss';

type AxisRangeKey = 'value_range' | 'raw_data_value_range';
type AxisThresholdKey = 'upper_control_limit' | 'lower_control_limit';
type AxisRangeRow = {
    label: string;
    rangeKey: AxisRangeKey;
    disabled?: boolean;
    labelMinWidth?: string;
};
type AxisThresholdRow = {
    thresholdKey: AxisThresholdKey;
    label: string;
    disabled?: boolean;
};
type EditorYAxisToggleConfig = {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
};

const EditorYAxisSection = ({
    title,
    axisConfig,
    onChangeAxisConfig,
    rangeRows,
    thresholdRows,
    enableToggle,
    zeroBaseDisabled,
    tickLineDisabled,
    children,
}: {
    title: string;
    axisConfig: PanelYAxisDraft;
    onChangeAxisConfig: (patch: Partial<PanelYAxisDraft>) => void;
    rangeRows: AxisRangeRow[];
    thresholdRows: AxisThresholdRow[];
    enableToggle?: EditorYAxisToggleConfig;
    zeroBaseDisabled?: boolean;
    tickLineDisabled?: boolean;
    children?: ReactNode;
}) => {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
            </div>
            {enableToggle && (
                <Checkbox
                    checked={enableToggle.checked}
                    onChange={(event) =>
                        enableToggle.onChange(event.target.checked)
                    }
                    label={enableToggle.label}
                    size="sm"
                />
            )}

            <Checkbox
                checked={axisConfig.zero_base}
                onChange={(event) =>
                    onChangeAxisConfig({ zero_base: event.target.checked })
                }
                disabled={zeroBaseDisabled}
                label="The scale of the Y-axis start at zero"
                size="sm"
            />

            <Checkbox
                checked={axisConfig.show_tickline}
                onChange={(event) =>
                    onChangeAxisConfig({ show_tickline: event.target.checked })
                }
                disabled={tickLineDisabled}
                label="Displays the Y-Axis tick line"
                size="sm"
            />

            {rangeRows.map(({ label, rangeKey, disabled, labelMinWidth }) => {
                const sHasRangeError =
                    !disabled && isAxisRangeInvalid(axisConfig[rangeKey]);

                return (
                    <div
                        key={rangeKey}
                        className={[
                            styles.rangeField,
                            disabled && styles.disabledControl,
                        ]
                            .filter(Boolean)
                            .join(' ')}
                    >
                        <div className={styles.rangeInputs}>
                            <span
                                className={styles.mutedLabel}
                                style={labelMinWidth ? { minWidth: labelMinWidth } : undefined}
                            >
                                {label}
                            </span>
                            <Input
                                type="number"
                                value={axisConfig[rangeKey].min}
                                disabled={disabled}
                                variant={sHasRangeError ? 'error' : 'default'}
                                aria-invalid={sHasRangeError}
                                onChange={(event) =>
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
                            <span className={styles.rangeSeparator}>~</span>
                            <Input
                                type="number"
                                value={axisConfig[rangeKey].max}
                                disabled={disabled}
                                variant={sHasRangeError ? 'error' : 'default'}
                                aria-invalid={sHasRangeError}
                                onChange={(event) =>
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
                        {sHasRangeError && (
                            <span className={styles.fieldError}>
                                Minimum must be less than maximum.
                            </span>
                        )}
                    </div>
                );
            })}

            <div className={styles.controlRow}>
                {thresholdRows.map(({ thresholdKey, label, disabled }) => {
                    const sThresholdConfig = axisConfig[thresholdKey];

                    return (
                        <div
                            key={thresholdKey}
                            className={styles.controlRow}
                        >
                            <Checkbox
                                disabled={disabled}
                                checked={sThresholdConfig.enabled}
                                onChange={(event) =>
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
                                onChange={(event) =>
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
        </section>
    );
};

export default EditorYAxisSection;
