import { Duplicate } from '@/assets/icons/Icon';
import { Button, Checkbox, Dropdown } from '@/design-system/components';
import { useLayoutEffect } from 'react';
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

import { NumberInput, Section } from './TabControls';
import styles from '../PanelEditorTab.module.scss';

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

function isYAxisValid(axis: PanelYAxis): boolean {
    return (
        !isValueRangeInvalid(axis.valueRange) &&
        !isValueRangeInvalid(axis.rawValueRange) &&
        THRESHOLDS.every(
            ([field]) => !axis[field].enabled || Number.isFinite(axis[field].value),
        )
    );
}

const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
    pReportValidity,
    pIsActive,
}: {
    pAxesConfig: PanelAxes;
    pTagSet: PanelSeriesDefinition[];
    pOnChangeAxesConfig: (config: PanelAxes) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
    pReportValidity: (tab: 'Axes', isValid: boolean, message?: string) => void;
    pIsActive: boolean;
}) => {
    const sIsValid =
        isYAxisValid(pAxesConfig.leftY) &&
        (!pAxesConfig.rightY.enabled || isYAxisValid(pAxesConfig.rightY));
    useLayoutEffect(() => {
        pReportValidity(
            'Axes',
            sIsValid,
            sIsValid ? undefined : 'Review the invalid axis settings.',
        );
    }, [pReportValidity, sIsValid]);
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
            <div key={rangeKey} className={styles.rangeField}>
                <div className={styles.rangeInputs}>
                    <span className={styles.mutedLabel}>{label}</span>
                    <NumberInput
                        value={axis[rangeKey].min}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('min', value)}
                        width="compact"
                    />
                    <span className={styles.rangeSeparator}>~</span>
                    <NumberInput
                        value={axis[rangeKey].max}
                        error={error}
                        placeholder="Auto"
                        onChange={(value) => setEdge('max', value)}
                        width="compact"
                    />
                </div>
                {error && (
                    <span className={styles.fieldError}>
                        Minimum must be less than maximum.
                    </span>
                )}
            </div>
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
            <div key={thresholdKey} className={styles.controlRow}>
                <Checkbox
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
                    disabled={!threshold.enabled}
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
        <div className={styles.rightAxisSeries}>
            <Dropdown.Root
                options={pTagSet
                    .filter((item) => !item.useSecondaryAxis)
                    .map((item) => ({
                        value: item.key,
                        label: getPanelSeriesDisplayName(item),
                    }))}
                value="none"
                onChange={(value) => value !== 'none' && setSeriesAxis(value, true)}
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
                        <span>{getPanelSeriesDisplayName(item)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
    const renderYAxis = (title: string, axisKey: YAxisKey) => {
        const axis = pAxesConfig[axisKey];
        const disabled = axisKey === 'rightY' && !pAxesConfig.rightY.enabled;

        return (
            <Section
                title={title}
                className={styles.axisSubgroup}
                headerAddon={axisKey === 'rightY' ? (
                    <div className={styles.rightAxisHeaderActions}>
                        <Checkbox
                            checked={pAxesConfig.rightY.enabled}
                            onChange={(event) => setRightEnabled(event.target.checked)}
                            label="Enable"
                            aria-label="Enable right Y-axis"
                            size="sm"
                            className={styles.sectionHeaderCheckbox}
                        />
                        {pAxesConfig.rightY.enabled && (
                            <Button
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
                    </div>
                ) : undefined}
            >
                {disabled ? (
                    <p className={styles.axisDisabledMessage}>
                        Enable the right Y axis to configure it.
                    </p>
                ) : (
                    <>
                        {AXIS_FLAGS.map(([field, label]) => (
                            <Checkbox
                                key={field}
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
                        <div className={styles.controlRow}>
                            {THRESHOLDS.map(([thresholdKey, label]) =>
                                renderThreshold(
                                    axisKey,
                                    axis,
                                    thresholdKey,
                                    label,
                                ),
                            )}
                        </div>
                        {axisKey === 'rightY' && renderRightAxisSeries()}
                    </>
                )}
            </Section>
        );
    };

    return (
        <div className={styles.axesGrid}>
            <Section title="X axis" className={styles.axisGroup}>
                <Checkbox
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
                className={styles.axisGroup}
            >
                <div className={styles.yAxesGroup}>
                    {renderYAxis('Left Y axis', 'leftY')}
                    {renderYAxis('Right Y axis', 'rightY')}
                </div>
            </Section>
        </div>
    );
};

export default EditorAxesTab;
