import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Input } from '@/design-system/components';
import type { CSSProperties, ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    EDITOR_X_AXIS_INPUT_STYLE,
    parseEditorNumber,
    type PanelAxesDraft,
    type PanelSamplingDraft,
} from '../PanelEditor';
import {
    RAW_NAVIGATOR_SAMPLE_COUNT,
    RAW_NAVIGATOR_SAMPLING_VALUE,
} from '../../../fetch/PanelSeriesDataRepository';
import styles from '../PanelEditor.module.scss';

type AxisKey = keyof Pick<PanelAxesDraft, 'x_axis' | 'main_chart_sampling'>;
type XAxisDensityField =
    | 'calculated_data_pixels_per_tick'
    | 'calculated_navigator_pixels_per_tick'
    | 'raw_data_pixels_per_tick';

const cx = (...classes: Array<string | false | undefined>) =>
    classes.filter(Boolean).join(' ') || undefined;

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
            </div>
            {children}
        </section>
    );
}

function NumberInput({
    value,
    onChange,
    disabled,
    style,
    label,
    size = 'sm',
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    style?: CSSProperties;
    label?: string;
    size?: 'sm' | 'md';
}) {
    return (
        <Input
            label={label}
            labelPosition={label ? 'left' : undefined}
            type="number"
            disabled={disabled}
            value={value ?? ''}
            onChange={(event) => onChange(parseEditorNumber(event.target.value))}
            size={size}
            style={style}
        />
    );
}

function SamplingRow({
    anchorClass,
    label,
    content,
    disabled,
    children,
}: {
    anchorClass: string;
    label: string;
    content: string;
    disabled: boolean;
    children: ReactNode;
}) {
    return (
        <div className={cx(styles.controlRow, disabled && styles.disabledControl)}>
            <span className={cx(anchorClass, styles.mutedLabel)}>
                <VscWarning color="#FDB532" />
                {label}
            </span>
            <div className={styles.controlRow}>{children}</div>
            <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
        </div>
    );
}

const EditorDataSettingTab = ({
    pAxesConfig,
    pIsRawMode,
    pIsNumericXAxis,
    pOnChangeAxesConfig,
}: {
    pAxesConfig: PanelAxesDraft;
    pIsRawMode: boolean;
    pIsNumericXAxis: boolean;
    pOnChangeAxesConfig: (config: PanelAxesDraft) => void;
}) => {
    const patchAxis = <K extends AxisKey>(
        key: K,
        patch: Partial<PanelAxesDraft[K]>,
    ) =>
        pOnChangeAxesConfig({
            ...pAxesConfig,
            [key]: { ...pAxesConfig[key], ...patch },
        });
    const xNumber = (field: XAxisDensityField, disabled: boolean) => (
        <div className={cx(disabled && styles.disabledControl)}>
            <NumberInput
                label="Pixels between tick marks"
                size="md"
                disabled={disabled}
                value={pAxesConfig.x_axis[field]}
                onChange={(value) => patchAxis('x_axis', { [field]: value })}
                style={EDITOR_X_AXIS_INPUT_STYLE}
            />
        </div>
    );
    const samplingNumber = (
        config: PanelSamplingDraft,
        disabled: boolean,
    ) => (
        <NumberInput
            disabled={disabled}
            value={config.sample_count}
            onChange={(sample_count) =>
                patchAxis('main_chart_sampling', { sample_count })
            }
            style={{ width: '150px' }}
        />
    );
    const rawNavigatorTooltip = pIsNumericXAxis
        ? 'Numeric navigator data uses fixed database sampling and a fixed row cap.'
        : 'Raw navigator data uses fixed database sampling and a fixed row cap.';

    return (
        <div className={styles.dataSettingGrid}>
            <Section title="Calculation Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('calculated_data_pixels_per_tick', pIsRawMode)}
                <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                {xNumber('calculated_navigator_pixels_per_tick', pIsRawMode)}
            </Section>
            <Section title="Raw Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('raw_data_pixels_per_tick', !pIsRawMode)}
                <SamplingRow
                    anchorClass="main-chart-sampling-tooltip"
                    label="Use main chart sampling"
                    content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                    disabled={!pIsRawMode}
                >
                    <Checkbox
                        checked={pAxesConfig.main_chart_sampling.enabled}
                        onChange={(event) =>
                            patchAxis('main_chart_sampling', {
                                enabled: event.target.checked,
                            })
                        }
                        disabled={!pIsRawMode}
                        size="sm"
                    />
                    {samplingNumber(
                        pAxesConfig.main_chart_sampling,
                        !pIsRawMode || !pAxesConfig.main_chart_sampling.enabled,
                    )}
                </SamplingRow>
                <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                <SamplingRow
                    anchorClass="navigation-sampling-tooltip"
                    label="Navigation sampling"
                    content={rawNavigatorTooltip}
                    disabled={!pIsRawMode}
                >
                    <span className={styles.editorFixedValue}>
                        Sampling {RAW_NAVIGATOR_SAMPLING_VALUE}, cap{' '}
                        {RAW_NAVIGATOR_SAMPLE_COUNT.toLocaleString()}
                    </span>
                </SamplingRow>
            </Section>
        </div>
    );
};

export default EditorDataSettingTab;
