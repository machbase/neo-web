import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Input } from '@/design-system/components';
import { Tooltip } from 'react-tooltip';
import { EDITOR_X_AXIS_INPUT_STYLE } from '../EditorConstants';
import type {
    PanelSamplingDraft,
    PanelXAxisDraft,
} from '../EditorTypes';
import { parseEditorNumber } from '../PanelEditorUtils';
import styles from '../PanelEditor.module.scss';

const EditorXAxisSection = ({
    xAxisConfig,
    samplingConfig,
    mainChartSamplingConfig,
    isRawMode,
    onChangeXAxisConfig,
    onChangeSamplingConfig,
    onChangeMainChartSamplingConfig,
}: {
    xAxisConfig: PanelXAxisDraft;
    samplingConfig: PanelSamplingDraft;
    mainChartSamplingConfig: PanelSamplingDraft;
    isRawMode: boolean;
    onChangeXAxisConfig: (patch: Partial<PanelXAxisDraft>) => void;
    onChangeSamplingConfig: (patch: Partial<PanelSamplingDraft>) => void;
    onChangeMainChartSamplingConfig: (patch: Partial<PanelSamplingDraft>) => void;
}) => {
    const sRawControlDisabled = !isRawMode;
    const sCalculationControlDisabled = isRawMode;
    const sSamplingControlDisabled = !isRawMode;

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>X-Axis</span>
            </div>
            <Checkbox
                checked={xAxisConfig.show_tickline}
                onChange={(event) =>
                    onChangeXAxisConfig({ show_tickline: event.target.checked })
                }
                label="Displays the X-Axis tick line"
                size="sm"
            />

            <span className={styles.sectionSubTitle}>Raw</span>
            <div className={sRawControlDisabled ? styles.disabledControl : undefined}>
                <Input
                    label="Pixels between tick marks"
                    labelPosition="left"
                    type="number"
                    disabled={sRawControlDisabled}
                    value={xAxisConfig.raw_data_pixels_per_tick}
                    onChange={(event) =>
                        onChangeXAxisConfig({
                            raw_data_pixels_per_tick: parseEditorNumber(event.target.value),
                        })
                    }
                    size="md"
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </div>
            <div
                className={[
                    styles.controlRow,
                    sSamplingControlDisabled && styles.disabledControl,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <span
                    className={[
                        'main-chart-sampling-tooltip',
                        styles.mutedLabel,
                    ].join(' ')}
                >
                    <VscWarning color="#FDB532" />
                    Use main chart sampling
                </span>
                <div className={styles.controlRow}>
                    <Checkbox
                        checked={mainChartSamplingConfig.enabled}
                        onChange={(event) =>
                            onChangeMainChartSamplingConfig({
                                enabled: event.target.checked,
                            })
                        }
                        disabled={sSamplingControlDisabled}
                        size="sm"
                    />
                    <Input
                        type="number"
                        disabled={
                            sSamplingControlDisabled || !mainChartSamplingConfig.enabled
                        }
                        value={mainChartSamplingConfig.sample_count}
                        onChange={(event) =>
                            onChangeMainChartSamplingConfig({
                                sample_count: parseEditorNumber(event.target.value),
                            })
                        }
                        size="sm"
                        style={{ width: '150px' }}
                    />
                </div>
                <Tooltip
                    anchorSelect=".main-chart-sampling-tooltip"
                    content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                />
            </div>
            <div
                className={[
                    styles.controlRow,
                    sSamplingControlDisabled && styles.disabledControl,
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                <span
                    className={[
                        'navigation-sampling-tooltip',
                        styles.mutedLabel,
                    ].join(' ')}
                >
                    <VscWarning color="#FDB532" />
                    Navigation sampling
                </span>
                <div className={styles.controlRow}>
                    <Input
                        type="number"
                        disabled={sSamplingControlDisabled}
                        value={samplingConfig.sample_count}
                        onChange={(event) =>
                            onChangeSamplingConfig({
                                sample_count: parseEditorNumber(event.target.value),
                            })
                        }
                        size="sm"
                        style={{ width: '150px' }}
                    />
                </div>
                <Tooltip
                    anchorSelect=".navigation-sampling-tooltip"
                    content="Raw navigator data always uses this as the database sampling value."
                />
            </div>

            <span className={styles.sectionSubTitle}>Calculation</span>
            <div className={sCalculationControlDisabled ? styles.disabledControl : undefined}>
                <Input
                    label="Pixels between tick marks"
                    labelPosition="left"
                    type="number"
                    disabled={sCalculationControlDisabled}
                    value={xAxisConfig.calculated_data_pixels_per_tick}
                    onChange={(event) =>
                        onChangeXAxisConfig({
                            calculated_data_pixels_per_tick: parseEditorNumber(
                                event.target.value,
                            ),
                        })
                    }
                    size="md"
                    style={EDITOR_X_AXIS_INPUT_STYLE}
                />
            </div>
        </section>
    );
};

export default EditorXAxisSection;
