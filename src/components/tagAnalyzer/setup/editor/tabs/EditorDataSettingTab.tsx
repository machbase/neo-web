import { Checkbox } from '@/design-system/components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
    type PanelDisplay,
} from '../../../panel/panelModel';
import { cx, isValidPositiveEditorNumber } from './EditorFieldUtils';
import { NumberInput, Section } from './EditorControls';
import styles from '../PanelEditor.module.scss';

type PixelsPerTickField = 'calculated' | 'calculatedNavigator';

const DATA_DENSITY_DESCRIPTION =
    'Sets point density. Rollup may use a coarser interval.';
const DATA_LOAD_METRICS_DESCRIPTION =
    'Shows the latest loaded query target and rendered point totals.';
const DATA_DENSITY_VALUE_PRECISION = 6;
const DEFAULT_DATA_DENSITY_POINTS = 1;
const MIN_READABLE_DATA_DENSITY_PIXELS = 1;
const DATA_DENSITY_SYNC_TOLERANCE = 0.000000001;

type DataLoadMetric = {
    queriedEntries: number | undefined;
    pointCount: number | undefined;
    pixelWidth: number | undefined;
};

export type PanelDataLoadMetrics = {
    mainChart: DataLoadMetric;
    navigator: DataLoadMetric;
};

type DataDensityDraft = {
    points: number | undefined;
    pixels: number | undefined;
};

const DATA_LOAD_METRIC_FIELDS = [
    ['Queried', 'queriedEntries'],
    ['Points', 'pointCount'],
    ['Pixels', 'pixelWidth'],
] as const;
const DATA_LOAD_METRIC_GROUPS = [
    ['Main Chart', 'mainChart'],
    ['Nav Bar', 'navigator'],
] as const;

type TooltipRowProps = {
    anchorClass: string;
    label: string;
    content: string;
    children: ReactNode;
};

function TooltipRow({
    anchorClass,
    label,
    content,
    children,
}: TooltipRowProps) {
    return (
        <div className={styles.controlRow}>
            <span className={cx(anchorClass, styles.mutedLabel)}>
                {label}
            </span>
            {children}
            <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
        </div>
    );
}

function StatusRow({
    checked,
    ...tooltip
}: Omit<TooltipRowProps, 'children'> & { checked: boolean }) {
    return (
        <TooltipRow {...tooltip}>
            <span className={styles.editorFixedValue}>
                {checked ? 'Enabled' : 'Disabled'}
            </span>
        </TooltipRow>
    );
}

function DataDensityRatioInput({
    pixelsPerTick,
    onChange,
}: {
    pixelsPerTick: number | undefined;
    onChange: (value: number | undefined) => void;
}) {
    const [sDraft, setDraft] = useState<DataDensityDraft>(() =>
        toDataDensityDraft(pixelsPerTick),
    );
    const sLastEmittedPixelsPerTickRef = useRef<number | undefined>(
        pixelsPerTick,
    );

    useEffect(() => {
        const sLastPixelsPerTick = sLastEmittedPixelsPerTickRef.current;
        if (
            Object.is(pixelsPerTick, sLastPixelsPerTick) ||
            (pixelsPerTick !== undefined &&
                sLastPixelsPerTick !== undefined &&
                Number.isFinite(pixelsPerTick) &&
                Number.isFinite(sLastPixelsPerTick) &&
                Math.abs(pixelsPerTick - sLastPixelsPerTick) <=
                    DATA_DENSITY_SYNC_TOLERANCE)
        ) {
            return;
        }

        sLastEmittedPixelsPerTickRef.current = pixelsPerTick;
        setDraft(toDataDensityDraft(pixelsPerTick));
    }, [pixelsPerTick]);

    const patchDraft = (patch: Partial<DataDensityDraft>) => {
        const sNextDraft = { ...sDraft, ...patch };
        const sNextPixelsPerTick = toDataDensityRatio(
            sNextDraft.pixels,
            sNextDraft.points,
        );

        setDraft(sNextDraft);
        sLastEmittedPixelsPerTickRef.current = sNextPixelsPerTick;
        onChange(sNextPixelsPerTick);
    };

    const sPointValueInvalid = !isValidPositiveEditorNumber(sDraft.points);
    const sPixelValueInvalid = !isValidPositiveEditorNumber(sDraft.pixels);
    const sDataDensity = toDataDensityRatio(sDraft.points, sDraft.pixels);

    return (
        <div className={styles.controlRow}>
            <span className={styles.editorInlineField}>
                <NumberInput
                    value={sDraft.points}
                    error={sPointValueInvalid}
                    onChange={(points) => patchDraft({ points })}
                    width="auto"
                />
                <span className={styles.rangeSeparator}>points</span>
            </span>
            <span className={styles.rangeSeparator}>per</span>
            <span className={styles.editorInlineField}>
                <NumberInput
                    value={sDraft.pixels}
                    error={sPixelValueInvalid}
                    onChange={(pixels) => patchDraft({ pixels })}
                    width="auto"
                />
                <span className={styles.rangeSeparator}>pixels</span>
            </span>
            <span className={styles.editorFixedValue}>
                {sDataDensity === undefined
                    ? 'Invalid density'
                    : `${sDataDensity} points/pixel`}
            </span>
        </div>
    );
}

function DataLoadSummary({
    metrics,
    modeLabel,
}: {
    metrics: PanelDataLoadMetrics;
    modeLabel: string;
}) {
    return (
        <div className={styles.dataLoadSummary}>
            <div className={styles.controlRow}>
                <span
                    className={cx(
                        'data-setting-runtime-summary-tooltip',
                        styles.axisSubsectionTitle,
                    )}
                >
                    Current Data
                </span>
                <span className={styles.editorFixedValue}>{modeLabel}</span>
                <Tooltip
                    anchorSelect=".data-setting-runtime-summary-tooltip"
                    content={DATA_LOAD_METRICS_DESCRIPTION}
                />
            </div>
            <div className={styles.dataSettingMetricGrid}>
                {DATA_LOAD_METRIC_GROUPS.map(([label, metricKey]) => (
                    <div key={label} className={styles.dataSettingMetricCard}>
                        <span className={styles.dataSettingMetricTitle}>
                            {label}
                        </span>
                        {DATA_LOAD_METRIC_FIELDS.map(([fieldLabel, field]) => {
                            const value = metrics[metricKey][field];

                            return (
                                <span
                                    key={field}
                                    className={styles.dataSettingMetricValue}
                                >
                                    <span
                                        className={styles.dataSettingMetricLabel}
                                    >
                                        {fieldLabel}
                                    </span>
                                    <span
                                        className={styles.dataSettingMetricNumber}
                                    >
                                        {value === undefined ||
                                        !Number.isFinite(value)
                                            ? '-'
                                            : Math.round(value).toLocaleString()}
                                    </span>
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

const EditorDataSettingTab = ({
    pDisplayConfig,
    pDataMetrics,
    pIsRawMode,
    pIsNumericXAxis,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: PanelDisplay;
    pDataMetrics: PanelDataLoadMetrics;
    pIsRawMode: boolean;
    pIsNumericXAxis: boolean;
    pOnChangeDisplayConfig: (config: PanelDisplay) => void;
}) => {
    const patchDisplayField = <
        K extends 'pixelsPerTick' | 'mainChartSampling' | 'rawNavigatorSampling',
    >(
        field: K,
        patch: Partial<PanelDisplay[K]>,
    ) => {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            [field]: {
                ...pDisplayConfig[field],
                ...patch,
            },
        });
    };

    const renderDataDensityInput = (field: PixelsPerTickField) => {
        const sPixelsPerTick = pDisplayConfig.pixelsPerTick[field];
        const sDensityTooltipClass = `data-density-${field}-tooltip`;

        return (
            <div className={styles.rangeField}>
                <TooltipRow
                    anchorClass={sDensityTooltipClass}
                    label="Data Density"
                    content={DATA_DENSITY_DESCRIPTION}
                >
                    <DataDensityRatioInput
                        pixelsPerTick={sPixelsPerTick}
                        onChange={(value) =>
                            patchDisplayField('pixelsPerTick', {
                                [field]: value,
                            })
                        }
                    />
                </TooltipRow>
                {!isValidPositiveEditorNumber(sPixelsPerTick) && (
                    <span className={styles.fieldError}>
                        Points and pixels must be greater than 0.
                    </span>
                )}
            </div>
        );
    };

    const renderSamplingInput = (
        field: 'mainChartSampling' | 'rawNavigatorSampling',
    ) => {
        const config = pDisplayConfig[field];

        return (
            <NumberInput
                value={config.sampleCount}
                error={
                    config.enabled &&
                    !isValidPositiveEditorNumber(config.sampleCount)
                }
                onChange={(sampleCount) =>
                    patchDisplayField(field, { sampleCount })
                }
                width="standard"
            />
        );
    };

    const rawNavigatorTooltip = pIsNumericXAxis
        ? 'Raw numeric navigator data requires database sampling.'
        : 'Raw navigator data uses average buckets by default. Enable sampling to use database sampling.';
    const sUseRawNavigatorSampling = pDisplayConfig.rawNavigatorSampling.enabled;
    const sCanPrefetchMainChart = !pIsRawMode;
    const sPrefetchTooltip = sCanPrefetchMainChart
        ? 'Main chart prefetch is active for calculated data.'
        : 'Main chart prefetch is disabled for raw data because raw limits can make expanded ranges unsafe.';
    return (
        <div className={styles.dataSettingStack}>
            <DataLoadSummary
                metrics={pDataMetrics}
                modeLabel={pIsRawMode ? 'Raw Mode' : 'Calculation Mode'}
            />
            <div className={styles.dataSettingGrid}>
                <Section title="Calculation Mode">
                    <span className={styles.axisSubsectionTitle}>Main Chart</span>
                    {renderDataDensityInput('calculated')}
                    <StatusRow
                        anchorClass="calculation-prefetch-main-tooltip"
                        label="Prefetch main chart"
                        content={sPrefetchTooltip}
                        checked={sCanPrefetchMainChart}
                    />
                    <div
                        className={styles.dataSettingAlignmentSpacer}
                        aria-hidden="true"
                    />
                    <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                    {renderDataDensityInput('calculatedNavigator')}
                </Section>
                <Section title="Raw Mode">
                    <span className={styles.axisSubsectionTitle}>Main Chart</span>
                    <StatusRow
                        anchorClass="raw-prefetch-main-tooltip"
                        label="Prefetch main chart"
                        content={sPrefetchTooltip}
                        checked={sCanPrefetchMainChart}
                    />
                    <TooltipRow
                        anchorClass="main-chart-sampling-tooltip"
                        label="Use main chart sampling"
                        content="Main raw chart data uses this database sampling value instead of the fixed 20,000-row query."
                    >
                        <div className={styles.controlRow}>
                            <Checkbox
                                checked={pDisplayConfig.mainChartSampling.enabled}
                                onChange={(event) =>
                                    patchDisplayField('mainChartSampling', {
                                        enabled: event.target.checked,
                                    })
                                }
                                size="sm"
                            />
                            {renderSamplingInput('mainChartSampling')}
                        </div>
                    </TooltipRow>
                    <span className={styles.axisSubsectionTitle}>Nav Bar</span>
                    <TooltipRow
                        anchorClass="navigation-sampling-tooltip"
                        label="Use navigation sampling"
                        content={rawNavigatorTooltip}
                    >
                        <div className={styles.controlRow}>
                            <Checkbox
                                checked={sUseRawNavigatorSampling}
                                onChange={(event) =>
                                    patchDisplayField('rawNavigatorSampling', {
                                        enabled: event.target.checked,
                                        sampleCount:
                                            pDisplayConfig.rawNavigatorSampling
                                                .sampleCount ??
                                            DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
                                    })
                                }
                                size="sm"
                            />
                            {renderSamplingInput('rawNavigatorSampling')}
                            <span className={styles.editorFixedValue}>
                                {sUseRawNavigatorSampling ? 'Sampled' : 'Average'}
                            </span>
                        </div>
                    </TooltipRow>
                </Section>
            </div>
        </div>
    );
};

function toDataDensityDraft(
    pixelsPerTick: number | undefined,
): DataDensityDraft {
    if (pixelsPerTick === undefined) {
        return { points: undefined, pixels: undefined };
    }

    const sIsValid = isValidPositiveEditorNumber(pixelsPerTick);
    const sPoints =
        sIsValid && pixelsPerTick < MIN_READABLE_DATA_DENSITY_PIXELS
            ? Math.max(
                  DEFAULT_DATA_DENSITY_POINTS,
                  Math.round(
                      MIN_READABLE_DATA_DENSITY_PIXELS / pixelsPerTick,
                  ),
              )
            : DEFAULT_DATA_DENSITY_POINTS;

    return {
        points: sPoints,
        pixels: sIsValid
            ? toRoundedDataDensityValue(pixelsPerTick * sPoints)
            : pixelsPerTick,
    };
}

function toDataDensityRatio(
    numerator: number | undefined,
    denominator: number | undefined,
): number | undefined {
    return isValidPositiveEditorNumber(numerator) &&
        isValidPositiveEditorNumber(denominator)
        ? toRoundedDataDensityValue(numerator / denominator)
        : undefined;
}

function toRoundedDataDensityValue(value: number): number {
    if (!Number.isFinite(value) || value === 0) {
        return value;
    }

    return Number(value.toPrecision(DATA_DENSITY_VALUE_PRECISION));
}

export default EditorDataSettingTab;
