import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox } from '@/design-system/components';
import type { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import type { PanelDisplay } from '../../../domain/panel/PanelConfig';
import {
    RAW_NAVIGATOR_MAX_SAMPLE_COUNT,
    RAW_NAVIGATOR_MIN_SAMPLE_COUNT,
    RAW_NAVIGATOR_SAMPLING_VALUE,
} from '../../../fetch/panelData/PanelSeriesDataRepository';
import {
    cx,
    isInvalidPixelsPerTickValue,
    isInvalidSamplingValue,
} from './EditorFieldUtils';
import { NumberInput, Section } from './EditorControls';
import styles from '../PanelEditor.module.scss';

type PixelsPerTickField = 'calculated' | 'calculatedNavigator' | 'raw';

function SamplingRow({
    anchorClass,
    label,
    content,
    children,
}: {
    anchorClass: string;
    label: string;
    content: string;
    children: ReactNode;
}) {
    return (
        <div className={styles.controlRow}>
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
    pDisplayConfig: PanelDisplay;
    pIsRawMode: boolean;
    pIsNumericXAxis: boolean;
    pOnChangeDisplayConfig: (config: PanelDisplay) => void;
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
        patch: Partial<PanelDisplay['mainChartSampling']>,
    ) => {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            mainChartSampling: {
                ...pDisplayConfig.mainChartSampling,
                ...patch,
            },
        });
    };

    const patchRawNavigatorSampling = (
        patch: Partial<PanelDisplay['rawNavigatorSampling']>,
    ) => {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            rawNavigatorSampling: {
                ...pDisplayConfig.rawNavigatorSampling,
                ...patch,
            },
        });
    };

    const xNumber = (field: PixelsPerTickField) => {
        const sHasInvalidValue = isInvalidPixelsPerTickValue(
            pDisplayConfig.pixelsPerTick[field],
        );

        return (
            <div className={styles.rangeField}>
                <div className={styles.controlRow}>
                    <span className={styles.mutedLabel}>
                        Pixels between tick marks
                    </span>
                    <NumberInput
                        value={pDisplayConfig.pixelsPerTick[field]}
                        error={sHasInvalidValue}
                        onChange={(value) => patchPixelsPerTick(field, value)}
                        width="standard"
                    />
                </div>
                {sHasInvalidValue && (
                    <span className={styles.fieldError}>
                        Value must be greater than 0.
                    </span>
                )}
            </div>
        );
    };

    const samplingNumber = (
        config: PanelDisplay['mainChartSampling'],
        onChangeSampleCount: (value: number | undefined) => void,
    ) => (
        <NumberInput
            value={config.sampleCount}
            error={config.enabled && isInvalidSamplingValue(config.sampleCount)}
            onChange={onChangeSampleCount}
            width="standard"
        />
    );

    const rawNavigatorTooltip = pIsNumericXAxis
        ? 'Raw numeric navigator data requires database sampling.'
        : 'Raw navigator data uses average buckets by default. Enable sampling to use database sampling.';
    const sUseRawNavigatorSampling = pDisplayConfig.rawNavigatorSampling.enabled;
    const sCanPrefetchMainChart = !pIsRawMode;
    const sPrefetchTooltip = sCanPrefetchMainChart
        ? 'Main chart prefetch is active for calculated data.'
        : 'Main chart prefetch is disabled for raw data because raw limits can make expanded ranges unsafe.';

    return (
        <div className={styles.dataSettingGrid}>
            <Section title="Calculation Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('calculated')}
                <StatusRow
                    anchorClass="calculation-prefetch-main-tooltip"
                    label="Prefetch main chart"
                    content={sPrefetchTooltip}
                    checked={sCanPrefetchMainChart}
                />
                <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                {xNumber('calculatedNavigator')}
            </Section>
            <Section title="Raw Mode">
                <span className={styles.axisSubsectionTitle}>Main Chart</span>
                {xNumber('raw')}
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
                >
                    <Checkbox
                        checked={pDisplayConfig.mainChartSampling.enabled}
                        onChange={(event) =>
                            patchMainChartSampling({
                                enabled: event.target.checked,
                            })
                        }
                        size="sm"
                    />
                    {samplingNumber(
                        pDisplayConfig.mainChartSampling,
                        (sampleCount) => patchMainChartSampling({ sampleCount }),
                    )}
                </SamplingRow>
                <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                <SamplingRow
                    anchorClass="navigation-sampling-tooltip"
                    label="Use navigation sampling"
                    content={rawNavigatorTooltip}
                >
                    <Checkbox
                        checked={sUseRawNavigatorSampling}
                        onChange={(event) =>
                            patchRawNavigatorSampling({
                                enabled: event.target.checked,
                                sampleCount:
                                    pDisplayConfig.rawNavigatorSampling
                                        .sampleCount ??
                                    RAW_NAVIGATOR_SAMPLING_VALUE,
                            })
                        }
                        size="sm"
                    />
                    {samplingNumber(
                        pDisplayConfig.rawNavigatorSampling,
                        (sampleCount) =>
                            patchRawNavigatorSampling({ sampleCount }),
                    )}
                    {sUseRawNavigatorSampling ? (
                        <span className={styles.editorFixedValue}>
                            {`dynamic cap ${RAW_NAVIGATOR_MIN_SAMPLE_COUNT.toLocaleString()}-${RAW_NAVIGATOR_MAX_SAMPLE_COUNT.toLocaleString()}`}
                        </span>
                    ) : (
                        <span className={styles.editorFixedValue}>Average</span>
                    )}
                </SamplingRow>
            </Section>
        </div>
    );
};

export default EditorDataSettingTab;
