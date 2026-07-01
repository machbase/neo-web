import { Checkbox, Input, Page } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import type {
    PanelDisplay,
    PanelEChartType,
} from '../../../domain/panel/PanelConfig';
import { cx, parseEditorNumber } from './EditorFieldUtils';
import styles from '../PanelEditor.module.scss';

type ChartTypeOption = {
    type: PanelEChartType;
    src?: string;
    alt: string;
};

const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
    { type: 'Zone', src: InnerLine, alt: 'Zone Chart' },
    { type: 'Dot', src: Scatter, alt: 'Dot Chart' },
    { type: 'Line', src: Line, alt: 'Line Chart' },
    { type: 'Custom', alt: 'Custom Chart' },
];

const CHART_TYPE_PRESETS: Partial<Record<PanelEChartType, Partial<PanelDisplay>>> = {
    Zone: { showPoint: false, pointRadius: 0, fill: 0.15, stroke: 1 },
    Dot: { showPoint: true, pointRadius: 2, fill: 0, stroke: 0 },
    Line: { showPoint: true, pointRadius: 0, fill: 0, stroke: 1 },
};

const DISPLAY_CHECKBOXES = [
    { field: 'showPoint', label: 'Display data points in the line chart', forceCustom: true },
    { field: 'showLegend', label: 'Display legend' },
    { field: 'connectNulls', label: 'Connect gaps between missing data points' },
] satisfies Array<{
    field: keyof Pick<
        PanelDisplay,
        'showPoint' | 'showLegend' | 'connectNulls'
    >;
    label: string;
    forceCustom?: boolean;
}>;

const DISPLAY_NUMBER_INPUTS = [
    { field: 'pointRadius', label: 'Point Radius' },
    { field: 'fill', label: 'Opacity Of Fill Area' },
    { field: 'stroke', label: 'Line Thickness' },
] satisfies Array<{
    field: keyof Pick<PanelDisplay, 'pointRadius' | 'fill' | 'stroke'>;
    label: string;
}>;

const EditorDisplayTab = ({
    pDisplayConfig,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: PanelDisplay;
    pOnChangeDisplayConfig: (config: PanelDisplay) => void;
}) => {
    const updateDisplayConfig = (patch: Partial<PanelDisplay>) => {
        pOnChangeDisplayConfig({ ...pDisplayConfig, ...patch });
    };

    const updateCustomStyle = (patch: Partial<PanelDisplay>) => {
        updateDisplayConfig({ ...patch, chartType: 'Custom' });
    };

    const changeChartType = (chartType: PanelEChartType) => {
        updateDisplayConfig({
            chartType: chartType === 'Custom' ? 'Custom' : chartType,
            ...(CHART_TYPE_PRESETS[chartType] ?? {}),
        });
    };

    const chartTypeOptionClass = (isActive: boolean, isCustom: boolean) =>
        cx(
            styles.chartTypeOption,
            isCustom && styles.chartTypeOptionCustom,
            isActive && styles.chartTypeOptionActive,
        );

    return (
        <Page.ContentBlock style={{ padding: 0, margin: 0 }} pHoverNone>
            <Page.DpRow className={styles.displayTabRow}>
                <div className={styles.displayChartColumn}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Chart Type</span>
                    </div>
                    <div className={styles.chartTypeOptionRow}>
                        {CHART_TYPE_OPTIONS.map((option) => {
                            const sIsActive = pDisplayConfig.chartType === option.type;
                            const sClassName = chartTypeOptionClass(
                                sIsActive,
                                !option.src,
                            );
                            return option.src ? (
                                <img
                                    key={option.type}
                                    onClick={() => changeChartType(option.type)}
                                    className={sClassName}
                                    src={option.src}
                                    alt={option.alt}
                                />
                            ) : (
                                <button
                                    key={option.type}
                                    type="button"
                                    onClick={() => changeChartType(option.type)}
                                    className={sClassName}
                                >
                                    Custom
                                </button>
                            );
                        })}
                    </div>
                    {DISPLAY_CHECKBOXES.map(({ field, label, forceCustom }) => (
                        <Checkbox
                            key={field}
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
                </div>
                <Page.DpRow className={styles.displayNumberColumn}>
                    {DISPLAY_NUMBER_INPUTS.map(({ field, label }) => (
                        <Input
                            key={field}
                            label={label}
                            labelPosition="left"
                            type="number"
                            value={pDisplayConfig[field] ?? ''}
                            onChange={(event) =>
                                updateCustomStyle({
                                    [field]: parseEditorNumber(event.target.value),
                                })
                            }
                            size="md"
                            // The design-system Input exposes wrapper sizing only
                            // via `style` (not `className`), and this input is
                            // label-left, so the fixed width/height stay inline.
                            style={{ width: '150px', height: '30px' }}
                        />
                    ))}
                </Page.DpRow>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorDisplayTab;
