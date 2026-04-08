import { VscWarning } from '@/assets/icons/Icon';
import { Input, Checkbox, Dropdown, Page } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';
import type { TagAnalyzerTagItem } from '../../panel/TagAnalyzerPanelModelTypes';
import type { TagAnalyzerEditorNumericValue, TagAnalyzerPanelAxesDraft } from '../PanelEditorTypes';

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

type CheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

type NumberInputEvent = {
    target: {
        value: string;
    };
};

type AxisRangeRowConfig = {
    label: string;
    minField: AxisNumericField;
    maxField: AxisNumericField;
    disabled?: boolean;
    labelMinWidth?: string;
};

type AxisThresholdRowConfig = {
    enabledField: AxisFlagField;
    valueField: AxisNumericField;
    label: string;
    disabled?: boolean;
};

const parseEditorNumber = (aValue: string): TagAnalyzerEditorNumericValue => {
    return aValue === '' ? '' : Number(aValue);
};

const formatTagDisplayLabel = (aTag: TagAnalyzerTagItem) => {
    return aTag.alias && aTag.alias !== '' ? aTag.alias : `${aTag.tagName}(${aTag.calculationMode})`;
};

// Configures axis behavior for the panel.
// It controls tick visibility, sampling, custom scales, control lines, and the secondary Y-axis mapping.
// Future Refactor Target: the primary and secondary axis sections still want a shared config-driven form path.
const Axes = ({
    pAxesConfig,
    pTagSet,
    pOnChangeAxesConfig,
    pOnChangeTagSet,
}: {
    pAxesConfig: TagAnalyzerPanelAxesDraft;
    pTagSet: TagAnalyzerTagItem[];
    pOnChangeAxesConfig: (aConfig: TagAnalyzerPanelAxesDraft) => void;
    pOnChangeTagSet: (aTagSet: TagAnalyzerTagItem[]) => void;
}) => {
    const updateAxesConfig = (aPatch: Partial<TagAnalyzerPanelAxesDraft>) => {
        pOnChangeAxesConfig({ ...pAxesConfig, ...aPatch });
    };

    const setAxisFlag = (aField: AxisFlagField, aChecked: boolean) => {
        if (aField === 'use_right_y2' && !aChecked) {
            pOnChangeTagSet(
                pTagSet.map((aTag: TagAnalyzerTagItem) => {
                    return { ...aTag, use_y2: 'N' };
                })
            );
        }

        updateAxesConfig({ [aField]: aChecked ? 'Y' : 'N' } as Partial<TagAnalyzerPanelAxesDraft>);
    };

    const setSamplingEnabled = (aChecked: boolean) => {
        updateAxesConfig({ use_sampling: aChecked });
    };

    const setAxisNumber = (aField: AxisNumericField, aValue: string) => {
        updateAxesConfig({ [aField]: parseEditorNumber(aValue) } as Partial<TagAnalyzerPanelAxesDraft>);
    };

    const setY2TagList = (aValue: string) => {
        if (aValue === 'none') return;
        pOnChangeTagSet(
            pTagSet.map((aItem: TagAnalyzerTagItem) => {
                return aValue === aItem.key ? { ...aItem, use_y2: 'Y' } : aItem;
            })
        );
    };
    const setRemoveY2TagList = (aKey: string) => {
        pOnChangeTagSet(
            pTagSet.map((aItem: TagAnalyzerTagItem) => {
                return aKey === aItem.key ? { ...aItem, use_y2: 'N' } : aItem;
            })
        );
    };

    const availableY2Tags = pTagSet.filter((aItem: TagAnalyzerTagItem) => aItem.use_y2 === 'N');
    const selectedY2Tags = pTagSet.filter((aItem: TagAnalyzerTagItem) => aItem.use_y2 === 'Y');
    const y2TagOptions = availableY2Tags.map((aItem: TagAnalyzerTagItem) => ({
        value: aItem.key,
        label: formatTagDisplayLabel(aItem),
    }));
    const primaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            minField: 'custom_min',
            maxField: 'custom_max',
        },
        {
            label: 'Custom scale for raw data chart',
            minField: 'custom_drilldown_min',
            maxField: 'custom_drilldown_max',
        },
    ];
    const secondaryAxisRangeRows: AxisRangeRowConfig[] = [
        {
            label: 'Custom scale',
            minField: 'custom_min2',
            maxField: 'custom_max2',
            disabled: pAxesConfig.use_right_y2 !== 'Y',
        },
        {
            label: 'Custom scale for raw data chart',
            minField: 'custom_drilldown_min2',
            maxField: 'custom_drilldown_max2',
            disabled: pAxesConfig.use_right_y2 !== 'Y',
            labelMinWidth: '100px',
        },
    ];
    const primaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            enabledField: 'use_ucl',
            valueField: 'ucl_value',
            label: 'use UCL',
        },
        {
            enabledField: 'use_lcl',
            valueField: 'lcl_value',
            label: 'use LCL',
        },
    ];
    const secondaryThresholdRows: AxisThresholdRowConfig[] = [
        {
            enabledField: 'use_ucl2',
            valueField: 'ucl2_value',
            label: 'use UCL',
            disabled: pAxesConfig.use_right_y2 !== 'Y',
        },
        {
            enabledField: 'use_lcl2',
            valueField: 'lcl2_value',
            label: 'use LCL',
            disabled: pAxesConfig.use_right_y2 !== 'Y',
        },
    ];

    const renderAxisRangeRow = ({
        label,
        minField,
        maxField,
        disabled = false,
        labelMinWidth,
    }: AxisRangeRowConfig) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: disabled ? 0.6 : 1 }}>
            <span
                style={
                    labelMinWidth
                        ? { minWidth: labelMinWidth, color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }
                        : undefined
                }
            >
                {label}
            </span>
            <Input
                type="number"
                value={pAxesConfig[minField]}
                disabled={disabled}
                onChange={(aEvent: NumberInputEvent) => setAxisNumber(minField, aEvent.target.value)}
                size="sm"
                style={{ width: '48px' }}
            />
            <span style={{ margin: '0 5px' }}>~</span>
            <Input
                type="number"
                value={pAxesConfig[maxField]}
                disabled={disabled}
                onChange={(aEvent: NumberInputEvent) => setAxisNumber(maxField, aEvent.target.value)}
                size="sm"
                style={{ width: '48px' }}
            />
        </div>
    );

    const renderThresholdRows = (aRows: AxisThresholdRowConfig[]) => (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {aRows.map((aRow) => (
                <div key={aRow.enabledField} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Checkbox
                        disabled={aRow.disabled}
                        checked={pAxesConfig[aRow.enabledField] === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag(aRow.enabledField, aEvent.target.checked)}
                        label={aRow.label}
                        size="sm"
                    />
                    <Input
                        type="number"
                        value={pAxesConfig[aRow.valueField]}
                        disabled={pAxesConfig[aRow.enabledField] === 'N' || aRow.disabled}
                        onChange={(aEvent: NumberInputEvent) => setAxisNumber(aRow.valueField, aEvent.target.value)}
                        size="sm"
                        style={{ width: '80px' }}
                    />
                </div>
            ))}
        </div>
    );

    return (
        <>
            <Page.DpRow style={{ flexWrap: 'wrap', justifyContent: 'start', alignItems: 'start' }}>
                <Page.ContentBlock pHoverNone style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}>
                    {/* X-Axis Section */}
                    <Page.ContentText pContent="X-Axis" />
                    <Checkbox
                        checked={pAxesConfig.show_x_tickline === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('show_x_tickline', aEvent.target.checked)}
                        label="Displays the X-Axis tick line"
                        size="sm"
                    />

                    <Page.ContentDesc>Pixels between tick marks</Page.ContentDesc>
                    <Page.DpRow style={{ padding: 0 }}>
                        <Input
                            label="Raw"
                            labelPosition="left"
                            type="number"
                            value={pAxesConfig.pixels_per_tick_raw}
                            onChange={(aEvent: NumberInputEvent) => setAxisNumber('pixels_per_tick_raw', aEvent.target.value)}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                        />
                    </Page.DpRow>
                    <Page.DpRow style={{ padding: 0 }}>
                        <Input
                            label="Calculation"
                            labelPosition="left"
                            type="number"
                            value={pAxesConfig.pixels_per_tick}
                            onChange={(aEvent: NumberInputEvent) => setAxisNumber('pixels_per_tick', aEvent.target.value)}
                            size="md"
                            style={{ width: '150px', height: '30px' }}
                        />
                    </Page.DpRow>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="warning-tooltip" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            <VscWarning color="#FDB532" />
                            use Sampling
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Checkbox
                                checked={pAxesConfig.use_sampling}
                                onChange={(aEvent: CheckboxInputEvent) => setSamplingEnabled(aEvent.target.checked)}
                                size="sm"
                            />
                            <Input
                                type="number"
                                disabled={!pAxesConfig.use_sampling}
                                value={pAxesConfig.sampling_value}
                                onChange={(aEvent: NumberInputEvent) => setAxisNumber('sampling_value', aEvent.target.value)}
                                size="sm"
                                style={{ width: '150px' }}
                            />
                        </div>
                        <Tooltip anchorSelect={`.warning-tooltip`} content={'Resource usage can be overloaded.'} />
                    </div>
                </Page.ContentBlock>
                <Page.ContentBlock pHoverNone style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}>
                    {/* Y-Axis Section */}
                    <Page.ContentText pContent="Y-Axis" />
                    <Checkbox
                        checked={pAxesConfig.zero_base === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('zero_base', aEvent.target.checked)}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                    />

                    <Checkbox
                        checked={pAxesConfig.show_y_tickline === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('show_y_tickline', aEvent.target.checked)}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                    />

                    {primaryAxisRangeRows.map((aRow) => (
                        <div key={aRow.minField}>{renderAxisRangeRow(aRow)}</div>
                    ))}

                    {renderThresholdRows(primaryThresholdRows)}
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={{ flexWrap: 'wrap', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'start', justifyContent: 'start' }}
                >
                    {/* Additional Y-Axis Section */}
                    <Page.ContentText pContent="Additional Y-Axis" />

                    <Checkbox
                        checked={pAxesConfig.use_right_y2 === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('use_right_y2', aEvent.target.checked)}
                        label="Set additional Y-axis"
                        size="sm"
                    />

                    <Checkbox
                        checked={pAxesConfig.zero_base2 === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('zero_base2', aEvent.target.checked)}
                        disabled={pAxesConfig.use_right_y2 !== 'Y'}
                        label="The scale of the Y-axis start at zero"
                        size="sm"
                    />

                    <Checkbox
                        checked={pAxesConfig.show_y_tickline2 === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) => setAxisFlag('show_y_tickline2', aEvent.target.checked)}
                        disabled={pAxesConfig.use_right_y2 !== 'Y'}
                        label="Displays the Y-Axis tick line"
                        size="sm"
                    />

                    {secondaryAxisRangeRows.map((aRow) => (
                        <div key={aRow.minField}>{renderAxisRangeRow(aRow)}</div>
                    ))}

                    {renderThresholdRows(secondaryThresholdRows)}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', opacity: pAxesConfig.use_right_y2 !== 'Y' ? 0.6 : 1 }}>
                        <Dropdown.Root options={y2TagOptions} value="none" onChange={setY2TagList} disabled={pAxesConfig.use_right_y2 !== 'Y'}>
                            <Dropdown.Trigger style={{ width: '200px' }} />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedY2Tags.length > 0 &&
                                selectedY2Tags.map((bItem: TagAnalyzerTagItem) => {
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
                                                    {formatTagDisplayLabel(bItem)}
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

export default Axes;
