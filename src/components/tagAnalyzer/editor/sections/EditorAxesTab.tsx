import { VscWarning } from '@/assets/icons/Icon';
import { Input, Checkbox, Dropdown, Page } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';
import type { PanelSeriesConfig } from '../../utils/series/seriesTypes';
import { getSeriesEditorName } from '../../utils/series/SeriesLabelFormatter';
import type {
    AxisKey,
    AxisRangeRowConfig,
    AxisThresholdRowConfig,
    EditorCheckboxInputEvent,
    EditorInputEvent,
    EditorAxesTabProps,
    PanelAxesDraft,
    PanelRightYAxisDraft,
    PanelYAxisDraft,
} from '../EditorTypes';
import { AXES_SECTION_STYLE } from '../EditorConstants';
import { parseEditorNumber } from '../PanelEditorUtils';

/**
 * Configures axis behavior for the panel.
 * Intent: Keep x-axis, sampling, left y-axis, and right y-axis settings in one editor section.
 * @param {PanelAxesDraft} pAxesConfig The current axes draft.
 * @param {PanelSeriesConfig[]} pTagSet The current series set.
 * @param {(aConfig: PanelAxesDraft) => void} pOnChangeAxesConfig Updates the axes draft.
 * @param {(aTagSet: PanelSeriesConfig[]) => void} pOnChangeTagSet Updates the current series set.
 * @returns {JSX.Element}
 */
const EditorAxesTab = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: EditorAxesTabProps) => {
    const updateXAxisConfig = (aPatch: Partial<PanelAxesDraft['x_axis']>) => {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            x_axis: {
                ...pAxesConfig.x_axis,
                ...aPatch,
            },
        });
    };

    const updateSamplingConfig = (
        aPatch: Partial<PanelAxesDraft['sampling']>,
    ) => {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            sampling: {
                ...pAxesConfig.sampling,
                ...aPatch,
            },
        });
    };

    const updateLeftYAxisConfig = (
        aPatch: Partial<PanelAxesDraft['left_y_axis']>,
    ) => {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            left_y_axis: {
                ...pAxesConfig.left_y_axis,
                ...aPatch,
            },
        });
    };

    const updateRightYAxisConfig = (
        aPatch: Partial<PanelAxesDraft['right_y_axis']>,
    ) => {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            right_y_axis: {
                ...pAxesConfig.right_y_axis,
                ...aPatch,
            },
        });
    };

    const getYAxisConfig = (
        aAxisKey: AxisKey,
    ): PanelYAxisDraft | PanelRightYAxisDraft => {
        return pAxesConfig[aAxisKey];
    };

    const updateYAxisConfig = (
        aAxisKey: AxisKey,
        aPatch:
            | Partial<PanelYAxisDraft>
            | Partial<PanelRightYAxisDraft>,
    ) => {
        if (aAxisKey === 'left_y_axis') {
            updateLeftYAxisConfig(aPatch as Partial<PanelYAxisDraft>);
            return;
        }

        updateRightYAxisConfig(aPatch as Partial<PanelRightYAxisDraft>);
    };

    /**
     * Enables or disables the right Y-axis and clears Y2 series assignments when it is disabled.
     * Intent: Keep right-axis series assignments aligned with the axis-enabled state.
     * @param {boolean} aChecked The next enabled state.
     * @returns {void}
     */
    const setRightYAxisEnabled = (aChecked: boolean) => {
        if (!aChecked) {
            pOnChangeTagSet(
                pTagSet.map((aTag: PanelSeriesConfig) => {
                    return { ...aTag, useSecondaryAxis: false };
                }),
            );
        }

        updateRightYAxisConfig({ enabled: aChecked });
    };

    /**
     * Enables one series on the right Y-axis.
     * Intent: Let the user assign series to the right axis without mutating unrelated series data.
     * @param {string} aValue The selected series key.
     * @returns {void}
     */
    const setY2TagList = (aValue: string) => {
        if (aValue === 'none') return;
        pOnChangeTagSet(
            pTagSet.map((aItem: PanelSeriesConfig) => {
                return aValue === aItem.key ? { ...aItem, useSecondaryAxis: true } : aItem;
            }),
        );
    };

    /**
     * Removes one series from the right Y-axis assignment list.
     * Intent: Let the user undo one right-axis assignment directly from this section.
     * @param {string} aKey The series key to remove.
     * @returns {void}
     */
    const setRemoveY2TagList = (aKey: string) => {
        pOnChangeTagSet(
            pTagSet.map((aItem: PanelSeriesConfig) => {
                return aKey === aItem.key ? { ...aItem, useSecondaryAxis: false } : aItem;
            }),
        );
    };

    const availableY2Tags = pTagSet.filter((aItem: PanelSeriesConfig) => !aItem.useSecondaryAxis);
    const selectedY2Tags = pTagSet.filter((aItem: PanelSeriesConfig) => aItem.useSecondaryAxis);
    const y2TagOptions = availableY2Tags.map((aItem: PanelSeriesConfig) => ({
        value: aItem.key,
        label: getSeriesEditorName(aItem),
        disabled: undefined,
    }));

    const primaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            axisKey: 'left_y_axis',
            rangeKey: 'value_range',
            disabled: undefined,
            labelMinWidth: undefined,
        },
        {
            label: 'Custom scale for raw data chart',
            axisKey: 'left_y_axis',
            rangeKey: 'raw_data_value_range',
            disabled: undefined,
            labelMinWidth: undefined,
        },
    ];
    const secondaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            axisKey: 'right_y_axis',
            rangeKey: 'value_range',
            disabled: !pAxesConfig.right_y_axis.enabled,
            labelMinWidth: undefined,
        },
        {
            label: 'Custom scale for raw data chart',
            axisKey: 'right_y_axis',
            rangeKey: 'raw_data_value_range',
            disabled: !pAxesConfig.right_y_axis.enabled,
            labelMinWidth: '100px',
        },
    ];
    const primaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            axisKey: 'left_y_axis',
            thresholdKey: 'upper_control_limit',
            label: 'use UCL',
            disabled: undefined,
        },
        {
            axisKey: 'left_y_axis',
            thresholdKey: 'lower_control_limit',
            label: 'use LCL',
            disabled: undefined,
        },
    ];
    const secondaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            axisKey: 'right_y_axis',
            thresholdKey: 'upper_control_limit',
            label: 'use UCL',
            disabled: !pAxesConfig.right_y_axis.enabled,
        },
        {
            axisKey: 'right_y_axis',
            thresholdKey: 'lower_control_limit',
            label: 'use LCL',
            disabled: !pAxesConfig.right_y_axis.enabled,
        },
    ];

    /**
     * Renders one axis range row with min and max inputs.
     * Intent: Reuse the same row layout for primary and secondary range editors.
     * @param {AxisRangeRowConfig} aRowConfig The row config to render.
     * @returns {JSX.Element}
     */
    const renderAxisRangeRow = ({
        label,
        axisKey,
        rangeKey,
        disabled = false,
        labelMinWidth,
    }: AxisRangeRowConfig) => {
        const sAxisConfig = getYAxisConfig(axisKey);

        return (
            <div
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
                    value={sAxisConfig[rangeKey].min}
                    disabled={disabled}
                    onChange={(aEvent: EditorInputEvent) => {
                        updateYAxisConfig(axisKey, {
                            [rangeKey]: {
                                ...sAxisConfig[rangeKey],
                                min: parseEditorNumber(aEvent.target.value),
                            },
                        });
                    }}
                    size="sm"
                    style={{ width: '48px' }}
                    variant={undefined}
                    error={undefined}
                    label={undefined}
                    labelPosition={undefined}
                    helperText={undefined}
                    fullWidth={undefined}
                    leftIcon={undefined}
                    rightIcon={undefined}
                />
                <span style={{ margin: '0 5px' }}>~</span>
                <Input
                    type="number"
                    value={sAxisConfig[rangeKey].max}
                    disabled={disabled}
                    onChange={(aEvent: EditorInputEvent) => {
                        updateYAxisConfig(axisKey, {
                            [rangeKey]: {
                                ...sAxisConfig[rangeKey],
                                max: parseEditorNumber(aEvent.target.value),
                            },
                        });
                    }}
                    size="sm"
                    style={{ width: '48px' }}
                    variant={undefined}
                    error={undefined}
                    label={undefined}
                    labelPosition={undefined}
                    helperText={undefined}
                    fullWidth={undefined}
                    leftIcon={undefined}
                    rightIcon={undefined}
                />
            </div>
        );
    };

    /**
     * Renders the threshold rows for one axis group.
     * Intent: Reuse the same checkbox-and-value layout for upper and lower control limits.
     * @param {AxisThresholdRowConfig[]} aRows The threshold rows to render.
     * @returns {JSX.Element}
     */
    const renderThresholdRows = (aRows: AxisThresholdRowConfig[]) => (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {aRows.map((aRow) => {
                const sAxisConfig = getYAxisConfig(aRow.axisKey);
                const sThresholdConfig = sAxisConfig[aRow.thresholdKey];

                return (
                    <div
                        key={`${aRow.axisKey}-${aRow.thresholdKey}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Checkbox
                            disabled={aRow.disabled}
                            checked={sThresholdConfig.enabled}
                            onChange={(aEvent: EditorCheckboxInputEvent) =>
                                updateYAxisConfig(aRow.axisKey, {
                                    [aRow.thresholdKey]: {
                                        ...sThresholdConfig,
                                        enabled: aEvent.target.checked,
                                    },
                                })
                            }
                            label={aRow.label}
                            size="sm"
                            error={undefined}
                            helperText={undefined}
                            indeterminate={undefined}
                        />
                        <Input
                            type="number"
                            value={sThresholdConfig.value}
                            disabled={!sThresholdConfig.enabled || aRow.disabled}
                            onChange={(aEvent: EditorInputEvent) => {
                                updateYAxisConfig(aRow.axisKey, {
                                    [aRow.thresholdKey]: {
                                        ...sThresholdConfig,
                                        value: parseEditorNumber(aEvent.target.value),
                                    },
                                });
                            }}
                            size="sm"
                            style={{ width: '80px' }}
                            variant={undefined}
                            error={undefined}
                            label={undefined}
                            labelPosition={undefined}
                            helperText={undefined}
                            fullWidth={undefined}
                            leftIcon={undefined}
                            rightIcon={undefined}
                        />
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            <Page.DpRow
                style={{ flexWrap: 'wrap', justifyContent: 'start', alignItems: 'start' }}
                className={undefined}
            >
                <Page.ContentBlock
                    pHoverNone
                    style={AXES_SECTION_STYLE}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    <Page.ContentText pContent="X-Axis" pWrap={undefined} style={undefined} />
                    <Checkbox
                        checked={pAxesConfig.x_axis.show_tickline}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            updateXAxisConfig({ show_tickline: aEvent.target.checked })
                        }
                        label="Displays the X-Axis tick line"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Page.ContentDesc style={undefined}>Pixels between tick marks</Page.ContentDesc>
                    <Page.DpRow style={{ padding: 0 }} className={undefined}>
                        <Input
                            label="Raw"
                            labelPosition="left"
                            type="number"
                            value={pAxesConfig.x_axis.raw_data_pixels_per_tick}
                            onChange={(aEvent: EditorInputEvent) => {
                                updateXAxisConfig({
                                    raw_data_pixels_per_tick: parseEditorNumber(
                                        aEvent.target.value,
                                    ),
                                });
                            }}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                            variant={undefined}
                            error={undefined}
                            helperText={undefined}
                            fullWidth={undefined}
                            leftIcon={undefined}
                            rightIcon={undefined}
                        />
                    </Page.DpRow>
                    <Page.DpRow style={{ padding: 0 }} className={undefined}>
                        <Input
                            label="Calculation"
                            labelPosition="left"
                            type="number"
                            value={pAxesConfig.x_axis.calculated_data_pixels_per_tick}
                            onChange={(aEvent: EditorInputEvent) => {
                                updateXAxisConfig({
                                    calculated_data_pixels_per_tick: parseEditorNumber(
                                        aEvent.target.value,
                                    ),
                                });
                            }}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                            variant={undefined}
                            error={undefined}
                            helperText={undefined}
                            fullWidth={undefined}
                            leftIcon={undefined}
                            rightIcon={undefined}
                        />
                    </Page.DpRow>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            className="warning-tooltip"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            <VscWarning color="#FDB532" />
                            use Sampling
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox
                                checked={pAxesConfig.sampling.enabled}
                                onChange={(aEvent: EditorCheckboxInputEvent) => {
                                    updateSamplingConfig({ enabled: aEvent.target.checked });
                                }}
                                size="sm"
                                label={undefined}
                                error={undefined}
                                helperText={undefined}
                                indeterminate={undefined}
                            />
                            <Input
                                type="number"
                                disabled={!pAxesConfig.sampling.enabled}
                                value={pAxesConfig.sampling.sample_count}
                                onChange={(aEvent: EditorInputEvent) => {
                                    updateSamplingConfig({
                                        sample_count: parseEditorNumber(aEvent.target.value),
                                    });
                                }}
                                size="sm"
                                style={{ width: '150px' }}
                                variant={undefined}
                                error={undefined}
                                label={undefined}
                                labelPosition={undefined}
                                helperText={undefined}
                                fullWidth={undefined}
                                leftIcon={undefined}
                                rightIcon={undefined}
                            />
                        </div>
                        <Tooltip
                            anchorSelect=".warning-tooltip"
                            content="Resource usage can be overloaded."
                        />
                    </div>
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={AXES_SECTION_STYLE}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    <Page.ContentText pContent="Left Y-Axis" pWrap={undefined} style={undefined} />
                    <Checkbox
                        checked={pAxesConfig.left_y_axis.zero_base}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            updateLeftYAxisConfig({ zero_base: aEvent.target.checked })
                        }
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.left_y_axis.show_tickline}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            updateLeftYAxisConfig({ show_tickline: aEvent.target.checked })
                        }
                        label="Displays the Y-Axis tick line"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    {primaryAxisRangeRows.map((aRow) => (
                        <div key={`${aRow.axisKey}-${aRow.rangeKey}`}>
                            {renderAxisRangeRow(aRow)}
                        </div>
                    ))}

                    {renderThresholdRows(primaryThresholdRows)}
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={{ ...AXES_SECTION_STYLE, flexWrap: 'wrap' }}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    <Page.ContentText
                        pContent="Right Y-Axis"
                        pWrap={undefined}
                        style={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.right_y_axis.enabled}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setRightYAxisEnabled(aEvent.target.checked)
                        }
                        label="Enable right Y-axis"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.right_y_axis.zero_base}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            updateRightYAxisConfig({ zero_base: aEvent.target.checked })
                        }
                        disabled={!pAxesConfig.right_y_axis.enabled}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.right_y_axis.show_tickline}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            updateRightYAxisConfig({ show_tickline: aEvent.target.checked })
                        }
                        disabled={!pAxesConfig.right_y_axis.enabled}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    {secondaryAxisRangeRows.map((aRow) => (
                        <div key={`${aRow.axisKey}-${aRow.rangeKey}`}>
                            {renderAxisRangeRow(aRow)}
                        </div>
                    ))}

                    {renderThresholdRows(secondaryThresholdRows)}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '8px',
                            opacity: pAxesConfig.right_y_axis.enabled ? 1 : 0.6,
                        }}
                    >
                        <Dropdown.Root
                            options={y2TagOptions}
                            value="none"
                            onChange={setY2TagList}
                            disabled={!pAxesConfig.right_y_axis.enabled}
                            className={undefined}
                            label={undefined}
                            labelPosition={undefined}
                            fullWidth={undefined}
                            style={undefined}
                            defaultValue={undefined}
                            onOpenChange={undefined}
                            placeholder={undefined}
                        >
                            <Dropdown.Trigger
                                style={{ width: '200px' }}
                                className={undefined}
                                children={undefined}
                            />
                            <Dropdown.Menu className={undefined}>
                                <Dropdown.List children={undefined} className={undefined} />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedY2Tags.length > 0 &&
                                selectedY2Tags.map((aItem: PanelSeriesConfig) => {
                                    return (
                                        <div
                                            onClick={() => setRemoveY2TagList(aItem.key)}
                                            key={aItem.key}
                                            style={{
                                                padding: '4px 8px',
                                                gap: '4px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                borderLeft: `solid 2px ${aItem.color}`,
                                            }}
                                        >
                                            <span style={{ paddingLeft: '8px' }}>
                                                {getSeriesEditorName(aItem)}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default EditorAxesTab;


