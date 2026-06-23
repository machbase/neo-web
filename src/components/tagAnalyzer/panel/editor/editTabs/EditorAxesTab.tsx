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
    'x' | 'leftY' | 'rightY'
>;
type YAxisKey = 'leftY' | 'rightY';
type RangeKey = 'valueRange' | 'rawValueRange';
type ThresholdKey = 'upperControlLimit' | 'lowerControlLimit';

const AXIS_FLAGS = [['zeroBase', 'The scale of the Y-axis start at zero'], ['showTickline', 'Displays the Y-Axis tick line']] as const;
const RANGES = [['valueRange', 'Custom scale'], ['rawValueRange', 'Custom scale for raw data chart']] as const;
const THRESHOLDS = [['upperControlLimit', 'use UCL'], ['lowerControlLimit', 'use LCL']] as const;
const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ') || undefined;

function isAxisRangeInvalid(range: PanelYAxisDraft['valueRange']): boolean {
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
    threshold: PanelYAxisDraft['upperControlLimit'],
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
        isAxisRangeInvalid(axisConfig.valueRange) ||
        isAxisRangeInvalid(axisConfig.rawValueRange) ||
        isInvalidAxisThreshold(axisConfig.upperControlLimit) ||
        isInvalidAxisThreshold(axisConfig.lowerControlLimit)
    );
}

function isInvalidSampling(sampling: PanelSamplingDraft): boolean {
    return (
        sampling.enabled &&
        (
            sampling.sampleCount === undefined ||
            !Number.isFinite(sampling.sampleCount)
        )
    );
}

export function hasInvalidEditorAxes(
    axesConfig: PanelAxesDraft,
    mainChartSampling: PanelSamplingDraft,
): boolean {
    return (
        isInvalidSampling(mainChartSampling) ||
        hasInvalidYAxisRange(axesConfig.leftY) ||
        (
            axesConfig.rightY.enabled &&
            hasInvalidYAxisRange(axesConfig.rightY)
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
        pOnChangeAxesConfig({
            ...pAxesConfig,
            rightY: {
                ...pAxesConfig.rightY,
                enabled: checked,
            },
        });
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
                        style={disabled && rangeKey === 'rawValueRange' ? { minWidth: '100px' } : undefined}
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
        <div className={cx(styles.rightAxisSeries, !pAxesConfig.rightY.enabled && styles.disabledControl)}>
            <Dropdown.Root
                options={pTagSet
                    .filter((item) => !item.useSecondaryAxis)
                    .map((item) => ({
                        value: item.key,
                        label: item.alias || `${item.sourceTagName}(${item.calculationMode})`,
                    }))}
                value="none"
                onChange={(value) => value !== 'none' && setSeriesAxis(value, true)}
                disabled={!pAxesConfig.rightY.enabled}
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
                {axisKey === 'rightY' && (
                    <Checkbox
                        checked={pAxesConfig.rightY.enabled}
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
                {axisKey === 'rightY' && renderRightAxisSeries()}
            </Section>
        );
    };

    return (
        <div className={styles.axesGrid}>
            <Section title="X-Axis">
                <Checkbox
                    checked={pAxesConfig.x.showTickline}
                    onChange={(event) =>
                        patchAxis('x', { showTickline: event.target.checked })
                    }
                    label="Displays the X-Axis tick line"
                    size="sm"
                />
            </Section>
            {renderYAxis('Left Y-Axis', 'leftY')}
            {renderYAxis('Right Y-Axis', 'rightY', !pAxesConfig.rightY.enabled)}
        </div>
    );
};

export default EditorAxesTab;
