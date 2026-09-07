import { Duplicate } from '@/assets/icons/Icon';
import { Button, Checkbox, Dropdown } from '@/design-system/components';
import {
    clonePanelYAxis,
    isValueRangeInvalid,
    type PanelAxes,
    type PanelYAxis,
} from '../../panelModel';
import {
    getPanelSeriesDisplayColor,
    getPanelSeriesDisplayName,
    type PanelSeriesDefinition,
} from '../../../seriesModel';

import { NumberInput } from './TabControls';
import { Inline, Section, Stack, Text } from '../../../ui/Presentation';
import styles from '../PanelEditorTab.module.scss';
import controls from '../../../ui/Controls.module.scss';

export default function EditorAxesTab({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
    pIsActive,
}: {
    pAxesConfig: PanelAxes;
    pTagSet: PanelSeriesDefinition[];
    pOnChangeAxesConfig: (config: PanelAxes) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
    pIsActive: boolean;
}) {
    if (!pIsActive) return null;
    const patchAxis = <K extends AxisKey>(key: K, patch: Partial<PanelAxes[K]>) =>
        pOnChangeAxesConfig({ ...pAxesConfig, [key]: { ...pAxesConfig[key], ...patch } });
    const patchYAxis = (key: YAxisKey, patch: Partial<PanelYAxis>) =>
        patchAxis(key, patch);
    const setRightEnabled = (checked: boolean) => {
        if (!checked) {
            pOnChangeTagSet(pTagSet.map((tag) => ({ ...tag, useSecondaryAxis: false })));
        }
        patchAxis('rightY', { enabled: checked });
    };
    const copyLeftYAxisToRight = () =>
        patchYAxis('rightY', clonePanelYAxis(pAxesConfig.leftY));
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
    ) => {
        const error = isValueRangeInvalid(axis[rangeKey]);
        const setEdge = (edge: 'min' | 'max', value: number | undefined) =>
            patchYAxis(axisKey, { [rangeKey]: { ...axis[rangeKey], [edge]: value } });

        return (
            <Stack key={rangeKey} gap={4} data-testid={rangeKey}>
                <Inline>
                    <Text variant="label" tone="muted" weight="medium">{label}</Text>
                    <NumberInput
                        data-testid="min"
                        value={axis[rangeKey].min}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('min', value)}
                        width="compact"
                    />
                    <Text variant="label" tone="muted">~</Text>
                    <NumberInput
                        data-testid="max"
                        value={axis[rangeKey].max}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('max', value)}
                        width="compact"
                    />
                </Inline>
                {error && (
                    <Text variant="caption" tone="danger">
                        Minimum must be less than maximum.
                    </Text>
                )}
            </Stack>
        );
    };
    const renderThreshold = (
        axisKey: YAxisKey,
        axis: PanelYAxis,
        thresholdKey: ThresholdKey,
        label: string,
    ) => {
        const threshold = axis[thresholdKey];

        return (
            <Inline key={thresholdKey} wrap data-testid={thresholdKey}>
                <Checkbox
                    data-testid="enabled"
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
                    data-testid="value"
                    disabled={!threshold.enabled}
                    value={threshold.value}
                    onChange={(value) =>
                        patchYAxis(axisKey, { [thresholdKey]: { ...threshold, value } })
                    }
                    width="threshold"
                />
            </Inline>
        );
    };
    const renderRightAxisSeries = () => (
        <Stack gap={8}>
            <Dropdown.Root
                options={pTagSet
                    .filter((item) => !item.useSecondaryAxis)
                    .map((item) => ({
                        value: item.key,
                        testId: `right-axis-series-option-${encodeURIComponent(item.key)}`,
                        label: getPanelSeriesDisplayName(item),
                    }))}
                value="none"
                onChange={(value) => value !== 'none' && setSeriesAxis(value, true)}
            >
                <Dropdown.Trigger data-testid="add-series" className={`${controls.control} ${styles.rightAxisTrigger}`} />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <Stack gap={8}>
                {pTagSet.filter((item) => item.useSecondaryAxis).map((item) => (
                    <button
                        key={item.key}
                        data-testid={`series-${encodeURIComponent(item.key)}`}
                        type="button"
                        onClick={() => setSeriesAxis(item.key, false)}
                        className={`${controls.chip} ${controls.selectable}`}
                        style={{
                            borderLeft: `solid 2px ${getPanelSeriesDisplayColor(
                                item,
                                Math.max(pTagSet.findIndex((series) => series.key === item.key), 0),
                            )}`,
                        }}
                    >
                        <span>{getPanelSeriesDisplayName(item)}</span>
                    </button>
                ))}
            </Stack>
        </Stack>
    );
    const renderYAxis = (title: string, axisKey: YAxisKey) => {
        const axis = pAxesConfig[axisKey];
        const disabled = axisKey === 'rightY' && !pAxesConfig.rightY.enabled;

        return (
            <Section
                testId={`axis-${axisKey}`}
                title={title}
                density="compact"
                className={styles.axisSubgroup}
                headerAddon={axisKey === 'rightY' ? (
                    <Inline gap={4}>
                        <Checkbox
                            data-testid="enable-axis"
                            checked={pAxesConfig.rightY.enabled}
                            onChange={(event) => setRightEnabled(event.target.checked)}
                            label="Enable"
                            aria-label="Enable right Y-axis"
                            size="sm"
                        />
                        {pAxesConfig.rightY.enabled && (
                            <Button
                                data-testid="copy-left-axis"
                                type="button"
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="Copy left Y-axis settings"
                                aria-label="Copy left Y-axis settings"
                                icon={<Duplicate size={14} />}
                                onClick={copyLeftYAxisToRight}
                            />
                        )}
                    </Inline>
                ) : undefined}
            >
                {disabled ? (
                    <Text as="p" variant="caption" tone="muted">
                        Enable the right Y axis to configure it.
                    </Text>
                ) : (
                    <>
                        {AXIS_FLAGS.map(([field, label]) => (
                            <Checkbox
                                key={field}
                                data-testid={field}
                                checked={axis[field]}
                                onChange={(event) =>
                                    patchYAxis(axisKey, {
                                        [field]: event.target.checked,
                                    })
                                }
                                label={label}
                                size="sm"
                            />
                        ))}
                        {RANGES.map(([rangeKey, label]) =>
                            renderRange(axisKey, axis, rangeKey, label),
                        )}
                        <Inline wrap>
                            {THRESHOLDS.map(([thresholdKey, label]) =>
                                renderThreshold(
                                    axisKey,
                                    axis,
                                    thresholdKey,
                                    label,
                                ),
                            )}
                        </Inline>
                        {axisKey === 'rightY' && renderRightAxisSeries()}
                    </>
                )}
            </Section>
        );
    };

    return (
        <div className={styles.axesGrid}>
            <Section title="X axis" gap={8} testId="axis-x">
                <Checkbox
                    data-testid="showTickline"
                    checked={pAxesConfig.x.showTickline}
                    onChange={(event) =>
                        patchAxis('x', { showTickline: event.target.checked })
                    }
                    label="Show X-axis tick marks"
                    size="sm"
                />
            </Section>
            <Section
                title="Y axes"
                gap={8}
            >
                <div className={`${controls.twoColumns} ${styles.yAxesGroup}`}>
                    {renderYAxis('Left Y axis', 'leftY')}
                    {renderYAxis('Right Y axis', 'rightY')}
                </div>
            </Section>
        </div>
    );
}

// -------------------- Local --------------------

type AxisKey = keyof Pick<PanelAxes, 'x' | 'leftY' | 'rightY'>;
type YAxisKey = 'leftY' | 'rightY';
type RangeKey = 'valueRange' | 'rawValueRange';
type ThresholdKey = 'upperControlLimit' | 'lowerControlLimit';

const AXIS_FLAGS = [
    ['zeroBase', 'Start the Y-axis at zero'],
    ['showTickline', 'Show Y-axis tick marks'],
] as const;
const RANGES = [
    ['valueRange', 'Custom scale'],
    ['rawValueRange', 'Custom scale for raw data chart'],
] as const;
const THRESHOLDS = [
    ['lowerControlLimit', 'Use LCL'],
    ['upperControlLimit', 'Use UCL'],
] as const;
