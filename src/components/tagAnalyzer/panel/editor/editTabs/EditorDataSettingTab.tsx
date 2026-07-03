import { VscWarning } from '@/assets/icons/Icon';
import { Checkbox } from '@/design-system/components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import type { PanelDisplay } from '../../../domain/panel/PanelInfo';
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

const DATA_DENSITY_DESCRIPTION =
    'Sets point density. Rollup may use a coarser interval.';
const DATA_SETTING_RUNTIME_METRICS_DESCRIPTION =
    'Shows the latest loaded query target and rendered point totals.';
const DATA_DENSITY_VALUE_PRECISION = 6;
const DEFAULT_DATA_DENSITY_POINTS = 1;
const MIN_READABLE_DATA_DENSITY_PIXELS = 1;
const DATA_DENSITY_SYNC_TOLERANCE = 0.000000001;

export type DataSettingRuntimeMetric = {
    queriedEntries: number | undefined;
    pointCount: number | undefined;
    pixelWidth: number | undefined;
};

export type PanelDataSettingRuntimeMetrics = {
    mainChart: DataSettingRuntimeMetric;
    navigator: DataSettingRuntimeMetric;
};

type DataDensityDraft = {
    points: number | undefined;
    pixels: number | undefined;
};

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
        if (
            areEditorNumbersEqual(
                pixelsPerTick,
                sLastEmittedPixelsPerTickRef.current,
            )
        ) {
            return;
        }

        sLastEmittedPixelsPerTickRef.current = pixelsPerTick;
        setDraft(toDataDensityDraft(pixelsPerTick));
    }, [pixelsPerTick]);

    const patchDraft = (patch: Partial<DataDensityDraft>) => {
        const sNextDraft = { ...sDraft, ...patch };
        const sNextPixelsPerTick =
            toPixelsPerTickFromDataDensityDraft(sNextDraft);

        setDraft(sNextDraft);
        sLastEmittedPixelsPerTickRef.current = sNextPixelsPerTick;
        onChange(sNextPixelsPerTick);
    };

    const sPointValueInvalid = !isValidDataDensityPart(sDraft.points);
    const sPixelValueInvalid = !isValidDataDensityPart(sDraft.pixels);
    const sDataDensity = toPointsPerPixelFromDataDensityDraft(sDraft);

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
                {formatDataDensityValue(sDataDensity)}
            </span>
        </div>
    );
}

function DataSettingRuntimeSummary({
    metrics,
    modeLabel,
}: {
    metrics: PanelDataSettingRuntimeMetrics;
    modeLabel: string;
}) {
    return (
        <div className={styles.dataSettingRuntimeSummary}>
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
                    content={DATA_SETTING_RUNTIME_METRICS_DESCRIPTION}
                />
            </div>
            <div className={styles.dataSettingMetricGrid}>
                <DataSettingMetricCard
                    label="Main Chart"
                    metric={metrics.mainChart}
                />
                <DataSettingMetricCard
                    label="Nav Bar"
                    metric={metrics.navigator}
                />
            </div>
        </div>
    );
}

function DataSettingMetricCard({
    label,
    metric,
}: {
    label: string;
    metric: DataSettingRuntimeMetric;
}) {
    return (
        <div className={styles.dataSettingMetricCard}>
            <span className={styles.dataSettingMetricTitle}>{label}</span>
            <DataSettingMetricValue
                label="Queried"
                value={metric.queriedEntries}
            />
            <DataSettingMetricValue label="Points" value={metric.pointCount} />
            <DataSettingMetricValue label="Pixels" value={metric.pixelWidth} />
        </div>
    );
}

function DataSettingMetricValue({
    label,
    value,
}: {
    label: string;
    value: number | undefined;
}) {
    return (
        <span className={styles.dataSettingMetricValue}>
            <span className={styles.dataSettingMetricLabel}>{label}</span>
            <span className={styles.dataSettingMetricNumber}>
                {formatMetricNumber(value)}
            </span>
        </span>
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
    pDataMetrics: PanelDataSettingRuntimeMetrics;
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
        const sPixelsPerTick = pDisplayConfig.pixelsPerTick[field];
        const sHasInvalidValue = isInvalidPixelsPerTickValue(sPixelsPerTick);
        const sDensityTooltipClass = `data-density-${field}-tooltip`;

        return (
            <div className={styles.rangeField}>
                <div className={styles.controlRow}>
                    <span className={cx(sDensityTooltipClass, styles.mutedLabel)}>
                        <VscWarning color="#FDB532" />
                        Data Density
                    </span>
                    <DataDensityRatioInput
                        pixelsPerTick={sPixelsPerTick}
                        onChange={(value) => patchPixelsPerTick(field, value)}
                    />
                </div>
                <Tooltip
                    anchorSelect={`.${sDensityTooltipClass}`}
                    content={DATA_DENSITY_DESCRIPTION}
                />
                {sHasInvalidValue && (
                    <span className={styles.fieldError}>
                        Points and pixels must be greater than 0.
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
    const sModeLabel = pIsRawMode ? 'Raw Mode' : 'Calculation Mode';

    return (
        <div className={styles.dataSettingStack}>
            <DataSettingRuntimeSummary
                metrics={pDataMetrics}
                modeLabel={sModeLabel}
            />
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
                    <div
                        className={styles.dataSettingAlignmentSpacer}
                        aria-hidden="true"
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
                            (sampleCount) =>
                                patchMainChartSampling({ sampleCount }),
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
        </div>
    );
};

function toDataDensityDraft(
    pixelsPerTick: number | undefined,
): DataDensityDraft {
    if (pixelsPerTick === undefined) {
        return {
            points: undefined,
            pixels: undefined,
        };
    }

    if (!isValidDataDensityPart(pixelsPerTick)) {
        return {
            points: DEFAULT_DATA_DENSITY_POINTS,
            pixels: pixelsPerTick,
        };
    }

    const sPoints = getReadableDataDensityPointCount(pixelsPerTick);

    return {
        points: sPoints,
        pixels: toRoundedDataDensityValue(pixelsPerTick * sPoints),
    };
}

function getReadableDataDensityPointCount(pixelsPerTick: number): number {
    if (pixelsPerTick >= MIN_READABLE_DATA_DENSITY_PIXELS) {
        return DEFAULT_DATA_DENSITY_POINTS;
    }

    return Math.max(
        DEFAULT_DATA_DENSITY_POINTS,
        Math.round(MIN_READABLE_DATA_DENSITY_PIXELS / pixelsPerTick),
    );
}

function toPixelsPerTickFromDataDensityDraft({
    points,
    pixels,
}: DataDensityDraft): number | undefined {
    if (!isValidDataDensityPart(points)) {
        return undefined;
    }

    if (!isValidDataDensityPart(pixels)) {
        return undefined;
    }

    return toRoundedDataDensityValue(pixels / points);
}

function toPointsPerPixelFromDataDensityDraft({
    points,
    pixels,
}: DataDensityDraft): number | undefined {
    if (!isValidDataDensityPart(points)) {
        return undefined;
    }

    if (!isValidDataDensityPart(pixels)) {
        return undefined;
    }

    return toRoundedDataDensityValue(points / pixels);
}

function isValidDataDensityPart(value: number | undefined): value is number {
    return value !== undefined && Number.isFinite(value) && value > 0;
}

function toRoundedDataDensityValue(value: number): number {
    if (!Number.isFinite(value) || value === 0) {
        return value;
    }

    return Number(value.toPrecision(DATA_DENSITY_VALUE_PRECISION));
}

function formatDataDensityValue(value: number | undefined): string {
    if (value === undefined) {
        return 'Invalid density';
    }

    return `${value} points/pixel`;
}

function formatMetricNumber(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) {
        return '-';
    }

    return Math.round(value).toLocaleString();
}

function areEditorNumbersEqual(
    left: number | undefined,
    right: number | undefined,
): boolean {
    if (left === right) {
        return true;
    }

    if (left === undefined || right === undefined) {
        return false;
    }

    if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return Object.is(left, right);
    }

    return Math.abs(left - right) <= DATA_DENSITY_SYNC_TOLERANCE;
}

export default EditorDataSettingTab;
