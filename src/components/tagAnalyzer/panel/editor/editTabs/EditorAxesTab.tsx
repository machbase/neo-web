import { Checkbox, Dropdown } from '@/design-system/components';
import type { PanelAxes, PanelYAxis } from '../../../domain/panel/PanelConfig';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import { cx, isAxisRangeInvalid } from './EditorFieldUtils';
import { NumberInput, Section } from './EditorControls';
import styles from '../PanelEditor.module.scss';

type AxisKey = keyof Pick<
    PanelAxes,
    'x' | 'leftY' | 'rightY'
>;
type YAxisKey = 'leftY' | 'rightY';
type RangeKey = 'valueRange' | 'rawValueRange';
type ThresholdKey = 'upperControlLimit' | 'lowerControlLimit';

const AXIS_FLAGS = [['zeroBase', 'The scale of the Y-axis start at zero'], ['showTickline', 'Displays the Y-Axis tick line']] as const;
const RANGES = [['valueRange', 'Custom scale'], ['rawValueRange', 'Custom scale for raw data chart']] as const;
const THRESHOLDS = [['upperControlLimit', 'use UCL'], ['lowerControlLimit', 'use LCL']] as const;

const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: {
    pAxesConfig: PanelAxes;
    pTagSet: PanelSeriesDefinition[];
    pOnChangeAxesConfig: (config: PanelAxes) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
}) => {
    const patchAxis = <K extends AxisKey>(key: K, patch: Partial<PanelAxes[K]>) =>
        pOnChangeAxesConfig({ ...pAxesConfig, [key]: { ...pAxesConfig[key], ...patch } });
    const patchYAxis = (key: YAxisKey, patch: Partial<PanelYAxis>) =>
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
        axis: PanelYAxis,
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
                        className={cx(
                            styles.mutedLabel,
                            disabled &&
                                rangeKey === 'rawValueRange' &&
                                styles.rawRangeLabelWide,
                        )}
                    >
                        {label}
                    </span>
                    <NumberInput
                        disabled={disabled}
                        value={axis[rangeKey].min}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('min', value)}
                        width="compact"
                    />
                    <span className={styles.rangeSeparator}>~</span>
                    <NumberInput
                        disabled={disabled}
                        value={axis[rangeKey].max}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('max', value)}
                        width="compact"
                    />
                </div>
                {error && <span className={styles.fieldError}>Minimum must be less than maximum.</span>}
            </div>
        );
    };
    const renderThreshold = (
        axisKey: YAxisKey,
        axis: PanelYAxis,
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
                    width="threshold"
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
                <Dropdown.Trigger className={styles.rightAxisTrigger} />
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
