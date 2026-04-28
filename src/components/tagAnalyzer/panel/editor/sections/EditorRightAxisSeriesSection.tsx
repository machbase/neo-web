import { Dropdown } from '@/design-system/components';
import { EDITOR_RIGHT_AXIS_TRIGGER_STYLE } from '../EditorConstants';
import { getSeriesEditorName } from '../../../utils/series/PanelSeriesLabelFormatter';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import type { EditorRightAxisSeriesSectionProps } from '../EditorTypes';

const EditorRightAxisSeriesSection = ({
    isEnabled,
    tagSet,
    onAssignSeries,
    onRemoveSeries,
}: EditorRightAxisSeriesSectionProps) => {
    const sAvailableTags = tagSet.filter((item) => !item.useSecondaryAxis);
    const sSelectedTags = tagSet.filter((item) => item.useSecondaryAxis);
    const sSeriesOptions = sAvailableTags.map((item) => ({
        value: item.key,
        label: getSeriesEditorName(item),
    }));

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '8px',
                opacity: isEnabled ? 1 : 0.6,
            }}
        >
            <Dropdown.Root
                options={sSeriesOptions}
                value="none"
                onChange={(value) => {
                    if (value !== 'none') {
                        onAssignSeries(value);
                    }
                }}
                disabled={!isEnabled}
            >
                <Dropdown.Trigger style={EDITOR_RIGHT_AXIS_TRIGGER_STYLE} />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sSelectedTags.map((item) => {
                    const sSeriesIndex = tagSet.findIndex(
                        (seriesConfig) => seriesConfig.key === item.key,
                    );

                    return (
                        <div
                            key={item.key}
                            onClick={() => onRemoveSeries(item.key)}
                            style={{
                                padding: '4px 8px',
                                gap: '4px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderLeft: `solid 2px ${getPanelSeriesDisplayColor(
                                    item,
                                    Math.max(sSeriesIndex, 0),
                                )}`,
                            }}
                        >
                            <span style={{ paddingLeft: '8px' }}>
                                {getSeriesEditorName(item)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EditorRightAxisSeriesSection;
