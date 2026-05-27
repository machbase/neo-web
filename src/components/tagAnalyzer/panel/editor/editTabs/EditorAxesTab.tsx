import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Dropdown, Input } from '@/design-system/components';
import type { CSSProperties, ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    EDITOR_AXIS_COMPACT_INPUT_STYLE,
    EDITOR_AXIS_THRESHOLD_INPUT_STYLE,
    EDITOR_RIGHT_AXIS_TRIGGER_STYLE,
    EDITOR_X_AXIS_INPUT_STYLE,
} from '../EditorConstants';
import type {
    EditorNumberInputValue,
    PanelAxesDraft,
    PanelSamplingDraft,
    PanelXAxisDraft,
    PanelYAxisDraft,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';
import { isAxisRangeInvalid } from '../PanelEditorValidation';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import styles from '../PanelEditor.module.scss';

type EditorAxesTabProps = {
    pAxesConfig: PanelAxesDraft;
    pTagSet: PanelSeriesDefinition[];
    pIsRawMode: boolean;
    pOnChangeAxesConfig: (config: PanelAxesDraft) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
};

type RangeKey = 'value_range' | 'raw_data_value_range';
type ThresholdKey = 'upper_control_limit' | 'lower_control_limit';
type AxisObjectKey =
    | 'x_axis'
    | 'sampling'
    | 'main_chart_sampling'
    | 'left_y_axis'
    | 'right_y_axis';

const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ') || undefined;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>{title}</span>
        </div>
        {children}
    </section>
);

const NumberInput = ({
    value,
    disabled,
    onChange,
    style,
    size = 'sm',
    variant,
    ariaInvalid,
    label,
}: {
    value: EditorNumberInputValue;
    disabled?: boolean;
    onChange: (value: EditorNumberInputValue) => void;
    style?: CSSProperties;
    size?: 'sm' | 'md';
    variant?: 'default' | 'error';
    ariaInvalid?: boolean;
    label?: string;
}) => (
    <Input
        label={label}
        labelPosition={label ? 'left' : undefined}
        type="number"
        disabled={disabled}
        value={value}
        variant={variant}
        aria-invalid={ariaInvalid}
        onChange={(event) => onChange(parseEditorNumber(event.target.value))}
        size={size}
        style={style}
    />
);

const SamplingRow = ({
    anchorClass,
    label,
    content,
    disabled,
    children,
}: {
    anchorClass: string;
    label: string;
    content: string;
    disabled: boolean;
    children: ReactNode;
}) => (
    <div className={cx(styles.controlRow, disabled && styles.disabledControl)}>
        <span className={cx(anchorClass, styles.mutedLabel)}>
            <VscWarning color="#FDB532" />
            {label}
        </span>
        <div className={styles.controlRow}>{children}</div>
        <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
    </div>
);

const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pIsRawMode,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: EditorAxesTabProps) => {
    const sRightAxisEnabled = pAxesConfig.right_y_axis_enabled;
    const sRawControlDisabled = !pIsRawMode;
    const sCalculationControlDisabled = pIsRawMode;
    const sSamplingControlDisabled = !pIsRawMode;

    function updateAxisObject<K extends AxisObjectKey>(
        axisKey: K,
        patch: Partial<PanelAxesDraft[K]>,
    ) {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            [axisKey]: { ...pAxesConfig[axisKey], ...patch },
        });
    }

    const setRightYAxisEnabled = (checked: boolean) => {
        if (!checked) {
            pOnChangeTagSet(
                pTagSet.map((tag) => ({ ...tag, useSecondaryAxis: false })),
            );
        }

        pOnChangeAxesConfig({ ...pAxesConfig, right_y_axis_enabled: checked });
    };

    const updateSeriesAxis = (seriesKey: string, useSecondaryAxis: boolean) => {
        pOnChangeTagSet(
            pTagSet.map((item) =>
                item.key === seriesKey ? { ...item, useSecondaryAxis } : item,
            ),
        );
    };

    const renderXAxisSection = (
        xAxisConfig: PanelXAxisDraft,
        samplingConfig: PanelSamplingDraft,
        mainChartSamplingConfig: PanelSamplingDraft,
    ) => (
        <Section title="X-Axis">
            <Checkbox
                checked={xAxisConfig.show_tickline}
                onChange={(event) =>
                    updateAxisObject('x_axis', { show_tickline: event.target.checked })
                }
                label="Displays the X-Axis tick line"
                size="sm"
            />

            <span className={styles.sectionSubTitle}>Raw</span>
            <div className={cx(sRawControlDisabled && styles.disabledControl)}>
                <NumberInput
                    label="Pixels between tick marks"
                    size="md"
                    disabled={sRawControlDisabled}
                    value={xAxisConfig.raw_data_pixels_per_tick}
                    onChange={(raw_data_pixels_per_tick) =>
                        updateAxisObject('x_axis', { raw_data_pixels_per_tick })
                    }
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </div>

            <SamplingRow
                anchorClass="main-chart-sampling-tooltip"
                label="Use main chart sampling"
                content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                disabled={sSamplingControlDisabled}
            >
                <Checkbox
                    checked={mainChartSamplingConfig.enabled}
                    onChange={(event) =>
                        updateAxisObject('main_chart_sampling', {
                            enabled: event.target.checked,
                        })
                    }
                    disabled={sSamplingControlDisabled}
                    size="sm"
                />
                <NumberInput
                    disabled={sSamplingControlDisabled || !mainChartSamplingConfig.enabled}
                    value={mainChartSamplingConfig.sample_count}
                    onChange={(sample_count) =>
                        updateAxisObject('main_chart_sampling', { sample_count })
                    }
                    style={{ width: '150px' }}
                />
            </SamplingRow>

            <SamplingRow
                anchorClass="navigation-sampling-tooltip"
                label="Navigation sampling"
                content="Raw navigator data always uses this as the database sampling value."
                disabled={sSamplingControlDisabled}
            >
                <NumberInput
                    disabled={sSamplingControlDisabled}
                    value={samplingConfig.sample_count}
                    onChange={(sample_count) =>
                        updateAxisObject('sampling', { sample_count })
                    }
                    style={{ width: '150px' }}
                />
            </SamplingRow>

            <span className={styles.sectionSubTitle}>Calculation</span>
            <div className={cx(sCalculationControlDisabled && styles.disabledControl)}>
                <NumberInput
                    label="Pixels between tick marks"
                    size="md"
                    disabled={sCalculationControlDisabled}
                    value={xAxisConfig.calculated_data_pixels_per_tick}
                    onChange={(calculated_data_pixels_per_tick) =>
                        updateAxisObject('x_axis', { calculated_data_pixels_per_tick })
                    }
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </div>
        </Section>
    );

    const renderYAxisSection = ({
        title,
        axisConfig,
        disabled = false,
        onChangeAxisConfig,
        children,
    }: {
        title: string;
        axisConfig: PanelYAxisDraft;
        disabled?: boolean;
        onChangeAxisConfig: (patch: Partial<PanelYAxisDraft>) => void;
        children?: ReactNode;
    }) => {
        const sRanges: Array<{ label: string; key: RangeKey; labelMinWidth?: string }> = [
            { label: 'Custom scale', key: 'value_range' },
            {
                label: 'Custom scale for raw data chart',
                key: 'raw_data_value_range',
                labelMinWidth: disabled ? '100px' : undefined,
            },
        ];
        const sThresholds: Array<{ label: string; key: ThresholdKey }> = [
            { label: 'use UCL', key: 'upper_control_limit' },
            { label: 'use LCL', key: 'lower_control_limit' },
        ];

        return (
            <Section title={title}>
                {title === 'Right Y-Axis' && (
                    <Checkbox
                        checked={sRightAxisEnabled}
                        onChange={(event) => setRightYAxisEnabled(event.target.checked)}
                        label="Enable right Y-axis"
                        size="sm"
                    />
                )}
                {[
                    ['zero_base', 'The scale of the Y-axis start at zero'],
                    ['show_tickline', 'Displays the Y-Axis tick line'],
                ].map(([key, label]) => (
                    <Checkbox
                        key={key}
                        checked={axisConfig[key as 'zero_base' | 'show_tickline']}
                        onChange={(event) =>
                            onChangeAxisConfig({ [key]: event.target.checked })
                        }
                        disabled={disabled}
                        label={label}
                        size="sm"
                    />
                ))}

                {sRanges.map(({ label, key, labelMinWidth }) => {
                    const sHasRangeError = !disabled && isAxisRangeInvalid(axisConfig[key]);

                    return (
                        <div
                            key={key}
                            className={cx(styles.rangeField, disabled && styles.disabledControl)}
                        >
                            <div className={styles.rangeInputs}>
                                <span
                                    className={styles.mutedLabel}
                                    style={
                                        labelMinWidth
                                            ? { minWidth: labelMinWidth }
                                            : undefined
                                    }
                                >
                                    {label}
                                </span>
                                <NumberInput
                                    disabled={disabled}
                                    value={axisConfig[key].min}
                                    variant={sHasRangeError ? 'error' : 'default'}
                                    ariaInvalid={sHasRangeError}
                                    onChange={(min) =>
                                        onChangeAxisConfig({
                                            [key]: { ...axisConfig[key], min },
                                        })
                                    }
                                    style={EDITOR_AXIS_COMPACT_INPUT_STYLE}
                                />
                                <span className={styles.rangeSeparator}>~</span>
                                <NumberInput
                                    disabled={disabled}
                                    value={axisConfig[key].max}
                                    variant={sHasRangeError ? 'error' : 'default'}
                                    ariaInvalid={sHasRangeError}
                                    onChange={(max) =>
                                        onChangeAxisConfig({
                                            [key]: { ...axisConfig[key], max },
                                        })
                                    }
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
                    {sThresholds.map(({ label, key }) => {
                        const sThresholdConfig = axisConfig[key];

                        return (
                            <div key={key} className={styles.controlRow}>
                                <Checkbox
                                    disabled={disabled}
                                    checked={sThresholdConfig.enabled}
                                    onChange={(event) =>
                                        onChangeAxisConfig({
                                            [key]: {
                                                ...sThresholdConfig,
                                                enabled: event.target.checked,
                                            },
                                        })
                                    }
                                    label={label}
                                    size="sm"
                                />
                                <NumberInput
                                    disabled={disabled || !sThresholdConfig.enabled}
                                    value={sThresholdConfig.value}
                                    onChange={(value) =>
                                        onChangeAxisConfig({
                                            [key]: { ...sThresholdConfig, value },
                                        })
                                    }
                                    style={EDITOR_AXIS_THRESHOLD_INPUT_STYLE}
                                />
                            </div>
                        );
                    })}
                </div>
                {children}
            </Section>
        );
    };

    const renderRightAxisSeries = () => {
        const sAvailableTags = pTagSet.filter((item) => !item.useSecondaryAxis);
        const sSelectedTags = pTagSet.filter((item) => item.useSecondaryAxis);

        return (
            <div
                className={cx(
                    styles.rightAxisSeries,
                    !sRightAxisEnabled && styles.disabledControl,
                )}
            >
                <Dropdown.Root
                    options={sAvailableTags.map((item) => ({
                        value: item.key,
                        label: item.alias || `${item.sourceTagName}(${item.calculationMode})`,
                    }))}
                    value="none"
                    onChange={(value) => {
                        if (value !== 'none') {
                            updateSeriesAxis(value, true);
                        }
                    }}
                    disabled={!sRightAxisEnabled}
                >
                    <Dropdown.Trigger style={EDITOR_RIGHT_AXIS_TRIGGER_STYLE} />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>

                <div className={styles.rightAxisSeriesList}>
                    {sSelectedTags.map((item) => {
                        const sSeriesIndex = pTagSet.findIndex(
                            (seriesConfig) => seriesConfig.key === item.key,
                        );

                        return (
                            <div
                                key={item.key}
                                onClick={() => updateSeriesAxis(item.key, false)}
                                className={styles.rightAxisSeriesItem}
                                style={{
                                    borderLeft: `solid 2px ${getPanelSeriesDisplayColor(
                                        item,
                                        Math.max(sSeriesIndex, 0),
                                    )}`,
                                }}
                            >
                                <span>
                                    {item.alias ||
                                        `${item.sourceTagName}(${item.calculationMode})`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.axesGrid}>
            {renderXAxisSection(
                pAxesConfig.x_axis,
                pAxesConfig.sampling,
                pAxesConfig.main_chart_sampling,
            )}
            {renderYAxisSection({
                title: 'Left Y-Axis',
                axisConfig: pAxesConfig.left_y_axis,
                onChangeAxisConfig: (patch) => updateAxisObject('left_y_axis', patch),
            })}
            {renderYAxisSection({
                title: 'Right Y-Axis',
                axisConfig: pAxesConfig.right_y_axis,
                disabled: !sRightAxisEnabled,
                onChangeAxisConfig: (patch) => updateAxisObject('right_y_axis', patch),
                children: renderRightAxisSeries(),
            })}
        </div>
    );
};

export default EditorAxesTab;
