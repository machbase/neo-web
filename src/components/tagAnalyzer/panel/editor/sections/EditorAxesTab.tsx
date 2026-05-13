import { Page } from '@/design-system/components';
import type {
    PanelAxesDraft,
    PanelYAxisDraft,
} from '../EditorTypes';
import type { PanelSeriesDefinition } from '../../../domain/SeriesModel';
import EditorRightAxisSeriesSection from './EditorRightAxisSeriesSection';
import EditorXAxisSection from './EditorXAxisSection';
import EditorYAxisSection from './EditorYAxisSection';

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
    const sRightAxisEnabled = pAxesConfig.right_y_axis_enabled;

    function updateAxisObject<
        K extends 'x_axis' | 'sampling' | 'main_chart_sampling' | 'left_y_axis' | 'right_y_axis'
    >(
        axisKey: K,
        patch: Partial<PanelAxesDraft[K]>,
    ) {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            [axisKey]: {
                ...pAxesConfig[axisKey],
                ...patch,
            },
        });
    }

    function setRightYAxisEnabledFlag(checked: boolean) {
        pOnChangeAxesConfig({
            ...pAxesConfig,
            right_y_axis_enabled: checked,
        });
    }

    function updateLeftYAxisConfig(patch: Partial<PanelYAxisDraft>) {
        updateAxisObject('left_y_axis', patch);
    }

    function updateRightYAxisConfig(patch: Partial<PanelYAxisDraft>) {
        updateAxisObject('right_y_axis', patch);
    }

    function setRightYAxisEnabled(checked: boolean) {
        if (!checked) {
            pOnChangeTagSet(
                pTagSet.map((tag) => ({ ...tag, useSecondaryAxis: false })),
            );
        }

        setRightYAxisEnabledFlag(checked);
    }

    function assignSecondaryAxisSeries(seriesKey: string) {
        pOnChangeTagSet(
            pTagSet.map((item) =>
                item.key === seriesKey ? { ...item, useSecondaryAxis: true } : item,
            ),
        );
    }

    function removeSecondaryAxisSeries(seriesKey: string) {
        pOnChangeTagSet(
            pTagSet.map((item) =>
                item.key === seriesKey ? { ...item, useSecondaryAxis: false } : item,
            ),
        );
    }

    return (
        <Page.DpRow
            style={{ flexWrap: 'wrap', justifyContent: 'start', alignItems: 'start' }}
        >
            <EditorXAxisSection
                xAxisConfig={pAxesConfig.x_axis}
                samplingConfig={pAxesConfig.sampling}
                mainChartSamplingConfig={pAxesConfig.main_chart_sampling}
                isRawMode={pIsRawMode}
                onChangeXAxisConfig={(patch) => updateAxisObject('x_axis', patch)}
                onChangeSamplingConfig={(patch) => updateAxisObject('sampling', patch)}
                onChangeMainChartSamplingConfig={(patch) =>
                    updateAxisObject('main_chart_sampling', patch)
                }
            />
            <EditorYAxisSection
                title="Left Y-Axis"
                axisConfig={pAxesConfig.left_y_axis}
                onChangeAxisConfig={updateLeftYAxisConfig}
                rangeRows={[
                    { label: 'Custom scale', rangeKey: 'value_range' },
                    {
                        label: 'Custom scale for raw data chart',
                        rangeKey: 'raw_data_value_range',
                    },
                ]}
                thresholdRows={[
                    { thresholdKey: 'upper_control_limit', label: 'use UCL' },
                    { thresholdKey: 'lower_control_limit', label: 'use LCL' },
                ]}
            />
            <EditorYAxisSection
                title="Right Y-Axis"
                axisConfig={pAxesConfig.right_y_axis}
                onChangeAxisConfig={updateRightYAxisConfig}
                rangeRows={[
                    {
                        label: 'Custom scale',
                        rangeKey: 'value_range',
                        disabled: !sRightAxisEnabled,
                    },
                    {
                        label: 'Custom scale for raw data chart',
                        rangeKey: 'raw_data_value_range',
                        disabled: !sRightAxisEnabled,
                        labelMinWidth: '100px',
                    },
                ]}
                thresholdRows={[
                    {
                        thresholdKey: 'upper_control_limit',
                        label: 'use UCL',
                        disabled: !sRightAxisEnabled,
                    },
                    {
                        thresholdKey: 'lower_control_limit',
                        label: 'use LCL',
                        disabled: !sRightAxisEnabled,
                    },
                ]}
                enableToggle={{
                    checked: sRightAxisEnabled,
                    label: 'Enable right Y-axis',
                    onChange: setRightYAxisEnabled,
                }}
                isRightYAxis
                zeroBaseDisabled={!sRightAxisEnabled}
                tickLineDisabled={!sRightAxisEnabled}
            >
                <EditorRightAxisSeriesSection
                    isEnabled={sRightAxisEnabled}
                    tagSet={pTagSet}
                    onAssignSeries={assignSecondaryAxisSeries}
                    onRemoveSeries={removeSecondaryAxisSeries}
                />
            </EditorYAxisSection>
        </Page.DpRow>
    );
};

export default EditorAxesTab;
