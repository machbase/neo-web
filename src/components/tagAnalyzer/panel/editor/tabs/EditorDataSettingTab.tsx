import { Checkbox } from '@/design-system/components';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import {
    DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
    type PanelDisplay,
} from '../../panelModel';
import type { AxisKind } from '../../../range/rangeModel';
import { NumberInput } from './TabControls';
import { Inline, Section, Stack, Text } from '../../../ui/Presentation';
import styles from '../PanelEditorTab.module.scss';
import controls from '../../../ui/Controls.module.scss';
import { isValidPositiveNumber } from '../editorValidation';

export default function EditorDataSettingTab({
    pDisplayConfig,
    pAxisKind,
    pDataValidationMessage,
    pOnChangeDisplayConfig,
    pIsActive,
}: {
    pDisplayConfig: PanelDisplay;
    pAxisKind: AxisKind | undefined;
    pDataValidationMessage?: string;
    pOnChangeDisplayConfig: (config: PanelDisplay) => void;
    pIsActive: boolean;
}) {
    if (!pIsActive) return null;
    if (!pAxisKind) {
        return <Text variant="caption" tone="danger">{pDataValidationMessage}</Text>;
    }
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

        return (
            <Stack gap={4} data-testid={`density-${field}`}>
                <DataDensityRatioInput
                    pixelsPerTick={sPixelsPerTick}
                    onChange={(value) =>
                        patchDisplayField('pixelsPerTick', {
                            [field]: value,
                        })
                    }
                />
                <Tooltip
                    anchorSelect={`.data-density-${field}-tooltip`}
                    content={DATA_DENSITY_DESCRIPTION}
                />
                {sPixelsPerTick !== undefined &&
                    !isValidPositiveNumber(sPixelsPerTick) && (
                    <Text variant="caption" tone="danger">
                        Points and pixels must be greater than 0.
                    </Text>
                )}
            </Stack>
        );
    };

    const renderSamplingInput = (
        field: 'mainChartSampling' | 'rawNavigatorSampling',
    ) => {
        const config = pDisplayConfig[field];

        return (
            <>
                <Checkbox
                    data-testid={`${field}-enabled`}
                    checked={config.enabled}
                    onChange={(event) =>
                        patchDisplayField(field, {
                            enabled: event.target.checked,
                            ...(field === 'rawNavigatorSampling' && {
                                sampleCount: config.sampleCount ?? DEFAULT_RAW_NAVIGATOR_SAMPLE_COUNT,
                            }),
                        })
                    }
                    size="sm"
                />
                <NumberInput
                    data-testid={`${field}-count`}
                    value={config.sampleCount}
                    error={
                        config.enabled &&
                        !isValidPositiveNumber(config.sampleCount)
                    }
                    onChange={(sampleCount) =>
                        patchDisplayField(field, { sampleCount })
                    }
                    width="standard"
                />
            </>
        );
    };

    const rawNavigatorTooltip = pAxisKind === 'numeric'
        ? 'Raw numeric navigator data requires database sampling.'
        : 'Raw navigator data uses average buckets by default. Enable sampling to use database sampling.';
    const sUseRawNavigatorSampling = pDisplayConfig.rawNavigatorSampling.enabled;
    return (
        <div className={styles.dataSettingGrid}>
            <Section title="Calculation Mode" testId="calculated-settings">
                <Text as="h5" variant="section" tone="secondary" className="data-density-calculated-tooltip">
                    Main Chart Data Density
                </Text>
                {renderDataDensityInput('calculated')}
                <Text as="h5" variant="section" tone="secondary" className="data-density-calculatedNavigator-tooltip">
                    Nav Bar Data Density
                </Text>
                {renderDataDensityInput('calculatedNavigator')}
            </Section>
            <Section title="Raw Mode" testId="raw-settings">
                <Text as="h5" variant="section" tone="secondary">Main Chart</Text>
                <TooltipRow
                    anchorClass="main-chart-sampling-tooltip"
                    label="Use main chart sampling"
                    content="Main raw chart data uses this database sampling value instead of the fixed 20,000-row query."
                >
                    {renderSamplingInput('mainChartSampling')}
                </TooltipRow>
                <Text as="h5" variant="section" tone="secondary">Nav Bar</Text>
                <TooltipRow
                    anchorClass="navigation-sampling-tooltip"
                    label="Use navigation sampling"
                    content={rawNavigatorTooltip}
                >
                    {renderSamplingInput('rawNavigatorSampling')}
                    <Text variant="body" tone="secondary" truncate className={controls.chip}>
                        {sUseRawNavigatorSampling ? 'Sampled' : 'Average'}
                    </Text>
                </TooltipRow>
            </Section>
        </div>
    );
}

// -------------------- Local --------------------

type PixelsPerTickField = 'calculated' | 'calculatedNavigator';

const DATA_DENSITY_DESCRIPTION =
    'Sets point density. Rollup may use a coarser interval.';
const DATA_DENSITY_VALUE_PRECISION = 6;
const DEFAULT_DATA_DENSITY_POINTS = 1;
const MIN_READABLE_DATA_DENSITY_PIXELS = 1;
const DATA_DENSITY_SYNC_TOLERANCE = 0.000000001;

type DataDensityDraft = {
    points: number | undefined;
    pixels: number | undefined;
};

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
        <Inline gap={12} className={styles.dataSettingRow}>
            <Text variant="label" tone="muted" weight="medium" className={anchorClass}>
                {label}
            </Text>
            {children}
            <Tooltip anchorSelect={`.${anchorClass}`} content={content} />
        </Inline>
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

    const sIsAutomatic =
        sDraft.points === undefined && sDraft.pixels === undefined;
    const sDataDensity = toDataDensityRatio(sDraft.points, sDraft.pixels);

    return (
        <Inline gap={12} className={styles.dataSettingRow}>
            {(['points', 'pixels'] as const).map((field) => (
                <Fragment key={field}>
                    {field === 'pixels' && <Text variant="label" tone="muted">per</Text>}
                    <Inline>
                        <NumberInput
                            data-testid={field}
                            value={sDraft[field]}
                            error={!sIsAutomatic && !isValidPositiveNumber(sDraft[field])}
                            onChange={(value) => patchDraft({ [field]: value })}
                            width="compact"
                        />
                        <Text variant="label" tone="muted">{field}</Text>
                    </Inline>
                </Fragment>
            ))}
            <Text variant="body" tone="secondary" truncate className={controls.chip}>
                {sIsAutomatic
                    ? 'Automatic density'
                    : isValidPositiveNumber(sDataDensity)
                      ? `${sDataDensity} points/pixel`
                      : 'Invalid density'}
            </Text>
        </Inline>
    );
}

function toDataDensityDraft(
    pixelsPerTick: number | undefined,
): DataDensityDraft {
    if (pixelsPerTick === undefined) {
        return { points: undefined, pixels: undefined };
    }

    const sIsValid = isValidPositiveNumber(pixelsPerTick);
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
    if (numerator === undefined && denominator === undefined) {
        return undefined;
    }

    return isValidPositiveNumber(numerator) &&
        isValidPositiveNumber(denominator)
        ? toRoundedDataDensityValue(numerator / denominator)
        : 0;
}

function toRoundedDataDensityValue(value: number): number {
    if (!Number.isFinite(value) || value === 0) {
        return value;
    }

    return Number(value.toPrecision(DATA_DENSITY_VALUE_PRECISION));
}
