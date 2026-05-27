import { Dropdown } from '@/design-system/components';
import { EDITOR_RIGHT_AXIS_TRIGGER_STYLE } from '../EditorConstants';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import styles from '../PanelEditor.module.scss';

const EditorRightAxisSeriesSection = ({
    isEnabled,
    tagSet,
    onAssignSeries,
    onRemoveSeries,
}: {
    isEnabled: boolean;
    tagSet: PanelSeriesDefinition[];
    onAssignSeries: (seriesKey: string) => void;
    onRemoveSeries: (seriesKey: string) => void;
}) => {
    const sAvailableTags = tagSet.filter((item) => !item.useSecondaryAxis);
    const sSelectedTags = tagSet.filter((item) => item.useSecondaryAxis);
    const sSeriesOptions = sAvailableTags.map((item) => ({
        value: item.key,
        label: item.alias || `${item.sourceTagName}(${item.calculationMode})`,
    }));

    return (
        <div
            className={[
                styles.rightAxisSeries,
                !isEnabled && styles.disabledControl,
            ]
                .filter(Boolean)
                .join(' ')}
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

            <div className={styles.rightAxisSeriesList}>
                {sSelectedTags.map((item) => {
                    const sSeriesIndex = tagSet.findIndex(
                        (seriesConfig) => seriesConfig.key === item.key,
                    );

                    return (
                        <div
                            key={item.key}
                            onClick={() => onRemoveSeries(item.key)}
                            className={styles.rightAxisSeriesItem}
                            style={{
                                borderLeft: `solid 2px ${getPanelSeriesDisplayColor(
                                    item,
                                    Math.max(sSeriesIndex, 0),
                                )}`,
                            }}
                        >
                            <span>
                                {item.alias || `${item.sourceTagName}(${item.calculationMode})`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EditorRightAxisSeriesSection;
