import { Checkbox, Dropdown, Input } from '@/design-system/components';
import type { CSSProperties, ReactNode } from 'react';
import {
    EDITOR_AXIS_COMPACT_INPUT_STYLE,
    EDITOR_AXIS_THRESHOLD_INPUT_STYLE,
    EDITOR_RIGHT_AXIS_TRIGGER_STYLE,
    parseEditorNumber,
    type PanelAxesDraft,
    type PanelSamplingDraft,
    type PanelYAxisDraft,
} from '../PanelEditor';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import styles from '../PanelEditor.module.scss';

type AxisKey = keyof Pick<
    PanelAxesDraft,
    'x_axis' | 'left_y_axis' | 'right_y_axis'
>;
type YAxisKey = 'left_y_axis' | 'right_y_axis';
type RangeKey = 'value_range' | 'raw_data_value_range';
type ThresholdKey = 'upper_control_limit' | 'lower_control_limit';

const AXIS_FLAGS = [['zero_base', 'The scale of the Y-axis start at zero'], ['show_tickline', 'Displays the Y-Axis tick line']] as const;
const RANGES = [['value_range', 'Custom scale'], ['raw_data_value_range', 'Custom scale for raw data chart']] as const;
const THRESHOLDS = [['upper_control_limit', 'use UCL'], ['lower_control_limit', 'use LCL']] as const;
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ') || undefined;

function isAxisRangeInvalid(range: PanelYAxisDraft['value_range']): boolean {
    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;
    const sIsAutoRange =
        (!sHasMin && !sHasMax) ||
        (range.min === 0 && range.max === 0);

    if (sIsAutoRange) {
        return false;
    }

    if (!sHasMin || !sHasMax) {
        return true;
    }

    return (
        !Number.isFinite(sMin) ||
        !Number.isFinite(sMax) ||
        sMin >= sMax
    );
}

function isInvalidAxisThreshold(
    threshold: PanelYAxisDraft['upper_control_limit'],
): boolean {
    return (
        threshold.enabled &&
        (
            threshold.value === undefined ||
            !Number.isFinite(threshold.value)
        )
    );
}

function hasInvalidYAxisRange(axisConfig: PanelYAxisDraft): boolean {
    return (
        isAxisRangeInvalid(axisConfig.value_range) ||
        isAxisRangeInvalid(axisConfig.raw_data_value_range) ||
        isInvalidAxisThreshold(axisConfig.upper_control_limit) ||
        isInvalidAxisThreshold(axisConfig.lower_control_limit)
    );
}

function isInvalidSampling(sampling: PanelSamplingDraft): boolean {
    return (
        sampling.enabled &&
        (
            sampling.sample_count === undefined ||
            !Number.isFinite(sampling.sample_count)
        )
    );
}

export function hasInvalidEditorAxes(axesConfig: PanelAxesDraft): boolean {
    return (
        isInvalidSampling(axesConfig.main_chart_sampling) ||
        hasInvalidYAxisRange(axesConfig.left_y_axis) ||
        (
            axesConfig.right_y_axis_enabled &&
            hasInvalidYAxisRange(axesConfig.right_y_axis)
        )
    );
}

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

const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: {
    pAxesConfig: PanelAxesDraft;
    pTagSet: PanelSeriesDefinition[];
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
            </Section>
            {renderYAxis('Left Y-Axis', 'left_y_axis')}
            {renderYAxis('Right Y-Axis', 'right_y_axis', !pAxesConfig.right_y_axis_enabled)}
        </div>
    );
};

export default EditorAxesTab;
