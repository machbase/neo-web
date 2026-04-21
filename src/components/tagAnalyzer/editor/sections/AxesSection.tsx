import { VscWarning } from '@/assets/icons/Icon';
import { Input, Checkbox, Dropdown, Page } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';
import type { SeriesConfig } from '../../utils/series/seriesTypes';
import { getSeriesEditorName } from '../../utils/series/SeriesLabelFormatter';
import type { TagAnalyzerPanelAxesDraft, EditorCheckboxInputEvent, EditorInputEvent } from '../PanelEditorTypes';
import { parseEditorNumber } from '../PanelEditorTypes';

// Used by AxesSection to type axis flag field.
type AxisFlagField =
    | 'show_x_tickline'
    | 'zero_base'
    | 'show_y_tickline'
    | 'use_ucl'
    | 'use_lcl'
    | 'use_right_y2'
    | 'zero_base2'
    | 'show_y_tickline2'
    | 'use_ucl2'
    | 'use_lcl2';

// Used by AxesSection to type axis numeric field.
type AxisNumericField =
    | 'pixels_per_tick_raw'
    | 'pixels_per_tick'
    | 'sampling_value'
    | 'custom_min'
    | 'custom_max'
    | 'custom_drilldown_min'
    | 'custom_drilldown_max'
    | 'ucl_value'
    | 'lcl_value'
    | 'custom_min2'
    | 'custom_max2'
    | 'custom_drilldown_min2'
    | 'custom_drilldown_max2'
    | 'ucl2_value'
    | 'lcl2_value';


// Used by AxesSection to type axis range row config.
type AxisRangeRowConfig = {
    label: string;
    minField: AxisNumericField;
    maxField: AxisNumericField;
    disabled: boolean | undefined;
    labelMinWidth: string | undefined;
};

// Used by AxesSection to type axis threshold row config.
type AxisThresholdRowConfig = {
    enabledField: AxisFlagField;
    valueField: AxisNumericField;
    label: string;
    disabled: boolean | undefined;
};

const AXES_SECTION_STYLE = {
    margin: 0,
    padding: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '8px',
    alignItems: 'start' as const,
    justifyContent: 'start' as const,
};

/**
 * Configures axis behavior for the panel.
 * Intent: Keep primary and secondary axis settings in one place while the editor updates the draft config.
 * @param {TagAnalyzerPanelAxesDraft} pAxesConfig The current axes draft.
 * @param {SeriesConfig[]} pTagSet The current series set.
 * @param {(aConfig: TagAnalyzerPanelAxesDraft) => void} pOnChangeAxesConfig Updates the axes draft.
 * @param {(aTagSet: SeriesConfig[]) => void} pOnChangeTagSet Updates the current series set.
 * @returns {JSX.Element}
 */
const AxesSection = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: {
    pAxesConfig: TagAnalyzerPanelAxesDraft;
    pTagSet: SeriesConfig[];
    pOnChangeAxesConfig: (aConfig: TagAnalyzerPanelAxesDraft) => void;
    pOnChangeTagSet: (aTagSet: SeriesConfig[]) => void;
}) => {
    /**
     * Updates one boolean axis field and clears dependent secondary-axis tags when needed.
     * Intent: Keep the secondary Y-axis state consistent when the toggle is turned off.
     * @param {AxisFlagField} aField The flag field to update.
     * @param {boolean} aChecked The new checked state.
     * @returns {void}
     */
    const setAxisFlag = (aField: AxisFlagField, aChecked: boolean) => {
        if (aField === 'use_right_y2' && !aChecked) {
            pOnChangeTagSet(
                pTagSet.map((aTag: SeriesConfig) => {
                    return { ...aTag, use_y2: false };
                }),
            );
        }

        pOnChangeAxesConfig({
            ...pAxesConfig,
            [aField]: aChecked,
        });
    };

    /**
     * Enables one series on the secondary Y-axis.
     * Intent: Let the user assign series to the extra axis without mutating unrelated series data.
     * @param {string} aValue The selected series key.
     * @returns {void}
     */
    const setY2TagList = (aValue: string) => {
        if (aValue === 'none') return;
        pOnChangeTagSet(
            pTagSet.map((aItem: SeriesConfig) => {
                return aValue === aItem.key ? { ...aItem, use_y2: true } : aItem;
            }),
        );
    };
    /**
     * Removes one series from the secondary Y-axis assignment list.
     * Intent: Give the user a direct way to undo the extra-axis mapping from the section.
     * @param {string} aKey The series key to remove.
     * @returns {void}
     */
    const setRemoveY2TagList = (aKey: string) => {
        pOnChangeTagSet(
            pTagSet.map((aItem: SeriesConfig) => {
                return aKey === aItem.key ? { ...aItem, use_y2: false } : aItem;
            }),
        );
    };

    const availableY2Tags = pTagSet.filter((aItem: SeriesConfig) => !aItem.use_y2);
    const selectedY2Tags = pTagSet.filter((aItem: SeriesConfig) => aItem.use_y2);
    const y2TagOptions = availableY2Tags.map((aItem: SeriesConfig) => ({
        value: aItem.key,
        label: getSeriesEditorName(aItem),
        disabled: undefined,
    }));
    const primaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            minField: 'custom_min',
            maxField: 'custom_max',

            disabled: undefined,
            labelMinWidth: undefined,
        },
        {
            label: 'Custom scale for raw data chart',
            minField: 'custom_drilldown_min',
            maxField: 'custom_drilldown_max',

            disabled: undefined,
            labelMinWidth: undefined,
        },
    ];
    const secondaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            minField: 'custom_min2',
            maxField: 'custom_max2',
            disabled: !pAxesConfig.use_right_y2,

            labelMinWidth: undefined,
        },
        {
            label: 'Custom scale for raw data chart',
            minField: 'custom_drilldown_min2',
            maxField: 'custom_drilldown_max2',
            disabled: !pAxesConfig.use_right_y2,
            labelMinWidth: '100px',
        },
    ];
    const primaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            enabledField: 'use_ucl',
            valueField: 'ucl_value',
            label: 'use UCL',

            disabled: undefined,
        },
        {
            enabledField: 'use_lcl',
            valueField: 'lcl_value',
            label: 'use LCL',

            disabled: undefined,
        },
    ];
    const secondaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            enabledField: 'use_ucl2',
            valueField: 'ucl2_value',
            label: 'use UCL',
            disabled: !pAxesConfig.use_right_y2,
        },
        {
            enabledField: 'use_lcl2',
            valueField: 'lcl2_value',
            label: 'use LCL',
            disabled: !pAxesConfig.use_right_y2,
        },
    ];

    /**
     * Renders one axis range row with min and max inputs.
     * Intent: Reuse the same layout for primary and secondary range editors.
     * @param {AxisRangeRowConfig} aRowConfig The row config to render.
     * @returns {JSX.Element}
     */
    const renderAxisRangeRow = ({
        label,
        minField,
        maxField,
        disabled = false,
        labelMinWidth,
    }: AxisRangeRowConfig) => (
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
                value={pAxesConfig[minField]}
                disabled={disabled}
                onChange={(aEvent: EditorInputEvent) => {
                    pOnChangeAxesConfig({
                        ...pAxesConfig,
                        [minField]: parseEditorNumber(aEvent.target.value),
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
                value={pAxesConfig[maxField]}
                disabled={disabled}
                onChange={(aEvent: EditorInputEvent) => {
                    pOnChangeAxesConfig({
                        ...pAxesConfig,
                        [maxField]: parseEditorNumber(aEvent.target.value),
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

    /**
     * Renders the axis threshold rows for one axis group.
     * Intent: Keep UCL and LCL controls compact while reusing the same row layout.
     * @param {AxisThresholdRowConfig[]} aRows The threshold rows to render.
     * @returns {JSX.Element}
     */
    const renderThresholdRows = (aRows: AxisThresholdRowConfig[]) => (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {aRows.map((aRow) => (
                <div
                    key={aRow.enabledField}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Checkbox
                        disabled={aRow.disabled}
                        checked={pAxesConfig[aRow.enabledField]}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag(aRow.enabledField, aEvent.target.checked)
                        }
                        label={aRow.label}
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />
                    <Input
                        type="number"
                        value={pAxesConfig[aRow.valueField]}
                        disabled={!pAxesConfig[aRow.enabledField] || aRow.disabled}
                        onChange={(aEvent: EditorInputEvent) => {
                            pOnChangeAxesConfig({
                                ...pAxesConfig,
                                [aRow.valueField]: parseEditorNumber(aEvent.target.value),
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
            ))}
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
                    {/* X-Axis Section */}
                    <Page.ContentText pContent="X-Axis" pWrap={undefined} style={undefined} />
                    <Checkbox
                        checked={pAxesConfig.show_x_tickline}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('show_x_tickline', aEvent.target.checked)
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
                            value={pAxesConfig.pixels_per_tick_raw}
                            onChange={(aEvent: EditorInputEvent) => {
                                pOnChangeAxesConfig({
                                    ...pAxesConfig,
                                    pixels_per_tick_raw: parseEditorNumber(
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
                            value={pAxesConfig.pixels_per_tick}
                            onChange={(aEvent: EditorInputEvent) => {
                                pOnChangeAxesConfig({
                                    ...pAxesConfig,
                                    pixels_per_tick: parseEditorNumber(aEvent.target.value),
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
                                checked={pAxesConfig.use_sampling}
                                onChange={(aEvent: EditorCheckboxInputEvent) => {
                                    pOnChangeAxesConfig({
                                        ...pAxesConfig,
                                        use_sampling: aEvent.target.checked,
                                    });
                                }}
                                size="sm"
                                label={undefined}
                                error={undefined}
                                helperText={undefined}
                                indeterminate={undefined}
                            />
                            <Input
                                type="number"
                                disabled={!pAxesConfig.use_sampling}
                                value={pAxesConfig.sampling_value}
                                onChange={(aEvent: EditorInputEvent) => {
                                    pOnChangeAxesConfig({
                                        ...pAxesConfig,
                                        sampling_value: parseEditorNumber(
                                            aEvent.target.value,
                                        ),
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
                            anchorSelect={`.warning-tooltip`}
                            content={'Resource usage can be overloaded.'}
                        />
                    </div>
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={AXES_SECTION_STYLE}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    {/* Y-Axis Section */}
                    <Page.ContentText pContent="Y-Axis" pWrap={undefined} style={undefined} />
                    <Checkbox
                        checked={pAxesConfig.zero_base}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('zero_base', aEvent.target.checked)
                        }
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.show_y_tickline}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('show_y_tickline', aEvent.target.checked)
                        }
                        label="Displays the Y-Axis tick line"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    {primaryAxisRangeRows.map((aRow) => (
                        <div key={aRow.minField}>{renderAxisRangeRow(aRow)}</div>
                    ))}

                    {renderThresholdRows(primaryThresholdRows)}
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={{ ...AXES_SECTION_STYLE, flexWrap: 'wrap' }}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    {/* Additional Y-Axis Section */}
                    <Page.ContentText
                        pContent="Additional Y-Axis"
                        pWrap={undefined}
                        style={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.use_right_y2}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('use_right_y2', aEvent.target.checked)
                        }
                        label="Set additional Y-axis"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.zero_base2}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('zero_base2', aEvent.target.checked)
                        }
                        disabled={!pAxesConfig.use_right_y2}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    <Checkbox
                        checked={pAxesConfig.show_y_tickline2}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setAxisFlag('show_y_tickline2', aEvent.target.checked)
                        }
                        disabled={!pAxesConfig.use_right_y2}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />

                    {secondaryAxisRangeRows.map((aRow) => (
                        <div key={aRow.minField}>{renderAxisRangeRow(aRow)}</div>
                    ))}

                    {renderThresholdRows(secondaryThresholdRows)}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '8px',
                            opacity: pAxesConfig.use_right_y2 ? 1 : 0.6,
                        }}
                    >
                        <Dropdown.Root
                            options={y2TagOptions}
                            value="none"
                            onChange={setY2TagList}
                            disabled={!pAxesConfig.use_right_y2}
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
                                selectedY2Tags.map((bItem: SeriesConfig) => {
                                    return (
                                        <div
                                            onClick={() => setRemoveY2TagList(bItem.key)}
                                            key={bItem.key}
                                            style={{
                                                padding: '4px 8px',
                                                gap: '4px',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                borderLeft: `solid 2px ${bItem.color}`,
                                            }}
                                        >
                                            <span style={{ paddingLeft: '8px' }}>
                                    {getSeriesEditorName(bItem)}
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

export default AxesSection;
