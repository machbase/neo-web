import { Checkbox, Input } from '@/design-system/components';
import {
    PANEL_DISPLAY_PRESETS,
    type PanelDisplay,
    type PanelEChartType,
} from '../../panelModel';
import { Inline, Section } from '../../../ui/Presentation';
import { PANEL_CHART_TYPES } from '../../chartTypeOptions';
import styles from '../PanelEditorTab.module.scss';
import controls from '../../../ui/Controls.module.scss';

export default function EditorDisplayTab({
    pDisplayConfig,
    pOnChangeDisplayConfig,
    pIsActive,
}: {
    pDisplayConfig: PanelDisplay;
    pOnChangeDisplayConfig: (config: PanelDisplay) => void;
    pIsActive: boolean;
}) {
    if (!pIsActive) return null;
    const updateDisplayConfig = (patch: Partial<PanelDisplay>) => {
        pOnChangeDisplayConfig({ ...pDisplayConfig, ...patch });
    };

    const updateCustomStyle = (patch: Partial<PanelDisplay>) => {
        updateDisplayConfig({ ...patch, chartType: 'Custom' });
    };

    const changeChartType = (chartType: PanelEChartType) => {
        updateDisplayConfig({
            chartType,
            ...(chartType === 'Custom' ? {} : PANEL_DISPLAY_PRESETS[chartType]),
        });
    };

    return (
        <Inline gap={12} align="stretch" wrap>
            <Section
                title="Preset"
                className={styles.displayColumn}
                testId="editor-display-preset"
            >
                <Inline gap={8} wrap>
                    {CHART_TYPE_OPTIONS.map((option) => (
                        <button
                            key={option.type}
                            data-testid={`chart-type-${option.type}`}
                            type="button"
                            onClick={() => changeChartType(option.type)}
                            className={`${controls.selectable} ${styles.chartTypeOption} ${pDisplayConfig.chartType === option.type ? 'chartTypeOptionActive' : ''}`}
                            aria-pressed={pDisplayConfig.chartType === option.type}
                        >
                            {option.src ? (
                                <img
                                    className={pDisplayConfig.chartType === option.type ? 'chartTypeOptionActive' : undefined}
                                    src={option.src}
                                    alt={option.alt}
                                />
                            ) : 'Custom'}
                        </button>
                    ))}
                </Inline>
            </Section>
            <Section
                title="Chart Config"
                className={styles.displayColumn}
                testId="editor-display-chart-config"
            >
                {DISPLAY_CHECKBOXES.map(({ field, label, forceCustom }) => (
                    <Checkbox
                        key={field}
                        data-testid={field}
                        checked={pDisplayConfig[field]}
                        onChange={(event) =>
                            (forceCustom ? updateCustomStyle : updateDisplayConfig)({
                                [field]: event.target.checked,
                            })
                        }
                        label={label}
                        size="sm"
                    />
                ))}
                {DISPLAY_NUMBER_INPUTS.map(({ field, label }) => (
                    <Input
                        key={field}
                        data-testid={field}
                        label={label}
                        labelPosition="left"
                        type="number"
                        value={
                            Number.isFinite(pDisplayConfig[field] ?? NaN)
                                ? pDisplayConfig[field]
                                : ''
                        }
                        onChange={(event) =>
                            updateCustomStyle({
                                [field]:
                                    event.target.value === ''
                                        ? undefined
                                        : Number(event.target.value),
                            })
                        }
                        size="md"
                        fullWidth
                    />
                ))}
            </Section>
        </Inline>
    );
}

// -------------------- Local --------------------

const CHART_TYPE_OPTIONS = [
    ...PANEL_CHART_TYPES,
    { type: 'Custom', src: undefined, alt: 'Custom Chart' },
] as const;

const DISPLAY_CHECKBOXES = [
    { field: 'showPoint', label: 'Display data points in the line chart', forceCustom: true },
    { field: 'showLegend', label: 'Display legend', forceCustom: false },
    { field: 'connectNulls', label: 'Connect gaps between missing data points', forceCustom: false },
] as const;

const DISPLAY_NUMBER_INPUTS = [
    { field: 'pointRadius', label: 'Point Radius' },
    { field: 'fill', label: 'Opacity Of Fill Area' },
    { field: 'stroke', label: 'Line Thickness' },
] as const;
