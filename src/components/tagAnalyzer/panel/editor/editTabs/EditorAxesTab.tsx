import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Dropdown, Input } from '@/design-system/components';
import type { CSSProperties, ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import { EDITOR_AXIS_COMPACT_INPUT_STYLE, EDITOR_AXIS_THRESHOLD_INPUT_STYLE, EDITOR_RIGHT_AXIS_TRIGGER_STYLE, EDITOR_X_AXIS_INPUT_STYLE } from '../EditorConstants';
import type {
    PanelAxesDraft,
    PanelSamplingDraft,
    PanelYAxisDraft,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';
import { isAxisRangeInvalid } from '../PanelEditorValidation';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import { RAW_NAVIGATOR_SAMPLE_COUNT } from '../../../fetch/PanelSeriesDataRepository';
import styles from '../PanelEditor.module.scss';

type AxisKey = keyof Pick<
    PanelAxesDraft,
    'x_axis' | 'sampling' | 'main_chart_sampling' | 'left_y_axis' | 'right_y_axis'
>;
type YAxisKey = 'left_y_axis' | 'right_y_axis';
type RangeKey = 'value_range' | 'raw_data_value_range';
type ThresholdKey = 'upper_control_limit' | 'lower_control_limit';

const AXIS_FLAGS = [['zero_base', 'The scale of the Y-axis start at zero'], ['show_tickline', 'Displays the Y-Axis tick line']] as const;
const RANGES = [['value_range', 'Custom scale'], ['raw_data_value_range', 'Custom scale for raw data chart']] as const;
const THRESHOLDS = [['upper_control_limit', 'use UCL'], ['lower_control_limit', 'use LCL']] as const;
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ') || undefined;

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
            </div>
            {children}
        </section>
    );
}

function NumberInput({
    value,
    onChange,
    disabled,
    style,
    label,
    size = 'sm',
    error,
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    style?: CSSProperties;
    label?: string;
    size?: 'sm' | 'md';
    error?: boolean;
}) {
    return (
        <Input
            label={label}
            labelPosition={label ? 'left' : undefined}
            type="number"
            disabled={disabled}
            value={value ?? ''}
            variant={error ? 'error' : 'default'}
            aria-invalid={error}
            onChange={(event) => onChange(parseEditorNumber(event.target.value))}
            size={size}
            style={style}
        />
    );
}

function SamplingRow({
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
}) {
    return (
        <div className={cx(styles.controlRow, disabled && styles.disabledControl)}>
            <span className={cx(anchorClass, styles.mutedLabel)}>
                <VscWarning color="#FDB532" />
                {label}
            </span>
            <div className={styles.controlRow}>{children}</div>
            <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
        </div>
    );
}

const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pIsRawMode,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: {
    pAxesConfig: PanelAxesDraft;
    pTagSet: PanelSeriesDefinition[];
    pIsRawMode: boolean;
    pOnChangeAxesConfig: (config: PanelAxesDraft) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
}) => {
    const patchAxis = <K extends AxisKey>(key: K, patch: Partial<PanelAxesDraft[K]>) =>
        pOnChangeAxesConfig({ ...pAxesConfig, [key]: { ...pAxesConfig[key], ...patch } });
    const patchYAxis = (key: YAxisKey, patch: Partial<PanelYAxisDraft>) =>
        patchAxis(key, patch);
    const setRightEnabled = (checked: boolean) => {
        if (!checked) {
            pOnChangeTagSet(pTagSet.map((tag) => ({ ...tag, useSecondaryAxis: false })));
        }
        pOnChangeAxesConfig({ ...pAxesConfig, right_y_axis_enabled: checked });
    };
    const setSeriesAxis = (seriesKey: string, useSecondaryAxis: boolean) =>
        pOnChangeTagSet(
            pTagSet.map((item) =>
                item.key === seriesKey ? { ...item, useSecondaryAxis } : item,
            ),
        );
    const xNumber = (
        field: 'raw_data_pixels_per_tick' | 'calculated_data_pixels_per_tick',
        disabled: boolean,
    ) => (
        <div className={cx(disabled && styles.disabledControl)}>
            <NumberInput
                label="Pixels between tick marks"
                size="md"
                disabled={disabled}
                value={pAxesConfig.x_axis[field]}
                onChange={(value) => patchAxis('x_axis', { [field]: value })}
                style={EDITOR_X_AXIS_INPUT_STYLE}
            />
        </div>
    );
    const samplingNumber = (
        key: 'main_chart_sampling',
        config: PanelSamplingDraft,
        disabled: boolean,
    ) => (
        <NumberInput
            disabled={disabled}
            value={config.sample_count}
            onChange={(sample_count) => patchAxis(key, { sample_count })}
            style={{ width: '150px' }}
        />
    );
    const renderRange = (
        axisKey: YAxisKey,
        axis: PanelYAxisDraft,
        rangeKey: RangeKey,
        label: string,
        disabled: boolean,
    ) => {
        const error = !disabled && isAxisRangeInvalid(axis[rangeKey]);
        const setEdge = (edge: 'min' | 'max', value: number | undefined) =>
            patchYAxis(axisKey, { [rangeKey]: { ...axis[rangeKey], [edge]: value } });

        return (
            <div key={rangeKey} className={cx(styles.rangeField, disabled && styles.disabledControl)}>
                <div className={styles.rangeInputs}>
                    <span
                        className={styles.mutedLabel}
                        style={disabled && rangeKey === 'raw_data_value_range' ? { minWidth: '100px' } : undefined}
                    >
                        {label}
                    </span>
                    <NumberInput
                        disabled={disabled}
                        value={axis[rangeKey].min}
                        error={error}
                        onChange={(value) => setEdge('min', value)}
                        style={EDITOR_AXIS_COMPACT_INPUT_STYLE}
                    />
                    <span className={styles.rangeSeparator}>~</span>
                    <NumberInput
                        disabled={disabled}
                        value={axis[rangeKey].max}
                        error={error}
                        onChange={(value) => setEdge('max', value)}
                        style={EDITOR_AXIS_COMPACT_INPUT_STYLE}
                    />
                </div>
                {error && <span className={styles.fieldError}>Minimum must be less than maximum.</span>}
            </div>
        );
    };
    const renderThreshold = (
        axisKey: YAxisKey,
        axis: PanelYAxisDraft,
        thresholdKey: ThresholdKey,
        label: string,
        disabled: boolean,
    ) => {
        const threshold = axis[thresholdKey];

        return (
            <div key={thresholdKey} className={styles.controlRow}>
                <Checkbox
                    disabled={disabled}
                    checked={threshold.enabled}
                    onChange={(event) =>
                        patchYAxis(axisKey, {
                            [thresholdKey]: { ...threshold, enabled: event.target.checked },
                        })
                    }
                    label={label}
                    size="sm"
                />
                <NumberInput
                    disabled={disabled || !threshold.enabled}
                    value={threshold.value}
                    onChange={(value) =>
                        patchYAxis(axisKey, { [thresholdKey]: { ...threshold, value } })
                    }
                    style={EDITOR_AXIS_THRESHOLD_INPUT_STYLE}
                />
            </div>
        );
    };
    const renderRightAxisSeries = () => (
        <div className={cx(styles.rightAxisSeries, !pAxesConfig.right_y_axis_enabled && styles.disabledControl)}>
            <Dropdown.Root
                options={pTagSet
                    .filter((item) => !item.useSecondaryAxis)
                    .map((item) => ({
                        value: item.key,
                        label: item.alias || `${item.sourceTagName}(${item.calculationMode})`,
                    }))}
                value="none"
                onChange={(value) => value !== 'none' && setSeriesAxis(value, true)}
                disabled={!pAxesConfig.right_y_axis_enabled}
            >
                <Dropdown.Trigger style={EDITOR_RIGHT_AXIS_TRIGGER_STYLE} />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <div className={styles.rightAxisSeriesList}>
                {pTagSet.filter((item) => item.useSecondaryAxis).map((item) => (
                    <div
                        key={item.key}
                        onClick={() => setSeriesAxis(item.key, false)}
                        className={styles.rightAxisSeriesItem}
                        style={{
                            borderLeft: `solid 2px ${getPanelSeriesDisplayColor(
                                item,
                                Math.max(pTagSet.findIndex((series) => series.key === item.key), 0),
                            )}`,
                        }}
                    >
                        <span>{item.alias || `${item.sourceTagName}(${item.calculationMode})`}</span>
                    </div>
                ))}
            </div>
        </div>
    );
    const renderYAxis = (title: string, axisKey: YAxisKey, disabled = false) => {
        const axis = pAxesConfig[axisKey];

        return (
            <Section title={title}>
                {axisKey === 'right_y_axis' && (
                    <Checkbox
                        checked={pAxesConfig.right_y_axis_enabled}
                        onChange={(event) => setRightEnabled(event.target.checked)}
                        label="Enable right Y-axis"
                        size="sm"
                    />
                )}
                {AXIS_FLAGS.map(([field, label]) => (
                    <Checkbox
                        key={field}
                        checked={axis[field]}
                        onChange={(event) => patchYAxis(axisKey, { [field]: event.target.checked })}
                        disabled={disabled}
                        label={label}
                        size="sm"
                    />
                ))}
                {RANGES.map(([rangeKey, label]) =>
                    renderRange(axisKey, axis, rangeKey, label, disabled),
                )}
                <div className={styles.controlRow}>
                    {THRESHOLDS.map(([thresholdKey, label]) =>
                        renderThreshold(axisKey, axis, thresholdKey, label, disabled),
                    )}
                </div>
                {axisKey === 'right_y_axis' && renderRightAxisSeries()}
            </Section>
        );
    };

    return (
        <div className={styles.axesGrid}>
            <Section title="X-Axis">
                <Checkbox
                    checked={pAxesConfig.x_axis.show_tickline}
                    onChange={(event) =>
                        patchAxis('x_axis', { show_tickline: event.target.checked })
                    }
                    label="Displays the X-Axis tick line"
                    size="sm"
                />
                <span className={styles.axisSubsectionTitle}>Calculation</span>
                {xNumber('calculated_data_pixels_per_tick', pIsRawMode)}
                <span className={styles.axisSubsectionTitle}>Raw</span>
                {xNumber('raw_data_pixels_per_tick', !pIsRawMode)}
                <SamplingRow
                    anchorClass="main-chart-sampling-tooltip"
                    label="Use main chart sampling"
                    content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                    disabled={!pIsRawMode}
                >
                    <Checkbox
                        checked={pAxesConfig.main_chart_sampling.enabled}
                        onChange={(event) =>
                            patchAxis('main_chart_sampling', { enabled: event.target.checked })
                        }
                        disabled={!pIsRawMode}
                        size="sm"
                    />
                    {samplingNumber(
                        'main_chart_sampling',
                        pAxesConfig.main_chart_sampling,
                        !pIsRawMode || !pAxesConfig.main_chart_sampling.enabled,
                    )}
                </SamplingRow>
                <SamplingRow
                    anchorClass="navigation-sampling-tooltip"
                    label="Navigation sampling"
                    content="Raw navigator data always uses fixed sampled loading."
                    disabled={!pIsRawMode}
                >
                    <span className={styles.editorFixedValue}>
                        Fixed at {RAW_NAVIGATOR_SAMPLE_COUNT.toLocaleString()}
                    </span>
                </SamplingRow>
            </Section>
            {renderYAxis('Left Y-Axis', 'left_y_axis')}
            {renderYAxis('Right Y-Axis', 'right_y_axis', !pAxesConfig.right_y_axis_enabled)}
        </div>
    );
};

export default EditorAxesTab;
