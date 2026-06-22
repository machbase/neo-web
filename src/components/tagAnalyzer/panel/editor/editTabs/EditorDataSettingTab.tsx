import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox, Input } from '@/design-system/components';
import type { CSSProperties, ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    EDITOR_X_AXIS_INPUT_STYLE,
    parseEditorNumber,
    type PanelDisplayDraft,
    type PanelSamplingDraft,
} from '../PanelEditor';
import {
    RAW_NAVIGATOR_MAX_SAMPLE_COUNT,
    RAW_NAVIGATOR_MIN_SAMPLE_COUNT,
    RAW_NAVIGATOR_SAMPLING_VALUE,
} from '../../../fetch/PanelSeriesDataRepository';
import styles from '../PanelEditor.module.scss';

type PixelsPerTickField = 'calculated' | 'calculatedNavigator' | 'raw';

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
    error,
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    style?: CSSProperties;
    label?: string;
    size?: 'sm' | 'md';
    error?: boolean;
}) {
    return (
        <Input
            label={label}
            labelPosition={label ? 'left' : undefined}
            type="number"
            disabled={disabled}
            value={value ?? ''}
            variant={error ? 'error' : 'default'}
            aria-invalid={error}
            onChange={(event) => onChange(parseEditorNumber(event.target.value))}
            size={size}
            style={style}
        />
    );
}

function isInvalidPixelsPerTickValue(value: number | undefined): boolean {
    return value === undefined || !Number.isFinite(value) || value <= 0;
}

export function hasInvalidEditorPixelsPerTick(
    displayConfig: PanelDisplayDraft,
): boolean {
    return (
        isInvalidPixelsPerTickValue(displayConfig.pixelsPerTick.calculated) ||
        isInvalidPixelsPerTickValue(
            displayConfig.pixelsPerTick.calculatedNavigator,
        ) ||
        isInvalidPixelsPerTickValue(displayConfig.pixelsPerTick.raw)
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
function StatusRow({
    anchorClass,
    label,
    content,
    checked,
}: {
    anchorClass: string;
    label: string;
    content: string;
    checked: boolean;
}) {
    return (
        <div className={cx(styles.controlRow, styles.disabledControl)}>
            <span className={cx(anchorClass, styles.mutedLabel)}>
                <VscWarning color="#FDB532" />
                {label}
            </span>
            <Checkbox checked={checked} disabled size="sm" />
            <span className={styles.editorFixedValue}>
                {checked ? 'Enabled' : 'Disabled'}
            </span>
            <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
        </div>
    );
}

const EditorDataSettingTab = ({
    pDisplayConfig,
    pIsRawMode,
    pIsNumericXAxis,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: PanelDisplayDraft;
    pIsRawMode: boolean;
    pIsNumericXAxis: boolean;
    pOnChangeDisplayConfig: (config: PanelDisplayDraft) => void;
}) => {
    const patchPixelsPerTick = (
        field: PixelsPerTickField,
        value: number | undefined,
    ) => {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            pixelsPerTick: {
                ...pDisplayConfig.pixelsPerTick,
                [field]: value,
            },
        });
    };
    const patchMainChartSampling = (
        patch: Partial<PanelDisplayDraft['mainChartSampling']>,
    ) => {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            mainChartSampling: {
                ...pDisplayConfig.mainChartSampling,
                ...patch,
            },
        });
    };
    const xNumber = (field: PixelsPerTickField, disabled: boolean) => (
        <div className={cx(disabled && styles.disabledControl)}>
            <NumberInput
                label="Pixels between tick marks"
                size="md"
                disabled={disabled}
                value={pDisplayConfig.pixelsPerTick[field]}
                error={isInvalidPixelsPerTickValue(
                    pDisplayConfig.pixelsPerTick[field],
                )}
                onChange={(value) => patchPixelsPerTick(field, value)}
                style={EDITOR_X_AXIS_INPUT_STYLE}
            />
            {isInvalidPixelsPerTickValue(pDisplayConfig.pixelsPerTick[field]) && (
                <span className={styles.fieldError}>
                    Value must be greater than 0.
                </span>
            )}
        </div>
    );
    const samplingNumber = (
        config: PanelSamplingDraft,
        disabled: boolean,
    ) => (
        <NumberInput
            disabled={disabled}
            value={config.sampleCount}
            onChange={(sampleCount) =>
                patchMainChartSampling({ sampleCount })
            }
            style={{ width: '150px' }}
        />
    );
    const rawNavigatorTooltip = pIsNumericXAxis
        ? 'Numeric navigator data uses fixed database sampling and a fixed row cap.'
        : 'Raw navigator data uses fixed database sampling and a fixed row cap.';
    const sCanPrefetchMainChart = !pIsRawMode;
    const sPrefetchTooltip = sCanPrefetchMainChart
        ? 'Main chart prefetch is active for calculated data.'
        : 'Main chart prefetch is disabled for raw data because raw limits can make expanded ranges unsafe.';

    return (
        <div className={styles.dataSettingGrid}>
            <Section title="Calculation Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('calculated', pIsRawMode)}
                <StatusRow
                    anchorClass="calculation-prefetch-main-tooltip"
                    label="Prefetch main chart"
                    content={sPrefetchTooltip}
                    checked={sCanPrefetchMainChart}
                />
                <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                {xNumber('calculatedNavigator', pIsRawMode)}
            </Section>
            <Section title="Raw Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('raw', !pIsRawMode)}
                <StatusRow
                    anchorClass="raw-prefetch-main-tooltip"
                    label="Prefetch main chart"
                    content={sPrefetchTooltip}
                    checked={sCanPrefetchMainChart}
                />
                <SamplingRow
                    anchorClass="main-chart-sampling-tooltip"
                    label="Use main chart sampling"
                    content="Main raw chart data uses this as the database sampling value instead of only the raw pixel row cap."
                    disabled={!pIsRawMode}
                >
                    <Checkbox
                        checked={pDisplayConfig.mainChartSampling.enabled}
                        onChange={(event) =>
                            patchMainChartSampling({
                                enabled: event.target.checked,
                            })
                        }
                        disabled={!pIsRawMode}
                        size="sm"
                    />
                    {samplingNumber(
                        pDisplayConfig.mainChartSampling,
                        !pIsRawMode || !pDisplayConfig.mainChartSampling.enabled,
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
                        Sampling {RAW_NAVIGATOR_SAMPLING_VALUE}, dynamic cap{' '}
                        {RAW_NAVIGATOR_MIN_SAMPLE_COUNT.toLocaleString()}-
                        {RAW_NAVIGATOR_MAX_SAMPLE_COUNT.toLocaleString()}
                    </span>
                </SamplingRow>
            </Section>
        </div>
    );
};

export default EditorDataSettingTab;
