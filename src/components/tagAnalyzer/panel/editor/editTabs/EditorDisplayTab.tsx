import { Checkbox, Input, Page } from '@/design-system/components';
import type { PanelEChartType } from '../../../domain/PanelDomain';
import {
    CHART_TYPE_OPTIONS,
    parseEditorNumber,
    type PanelDisplayDraft,
} from '../PanelEditor';
import styles from '../PanelEditor.module.scss';

const CHART_TYPE_OPTION_STYLE = { width: '80px', height: '64px', borderRadius: '4px', cursor: 'pointer' } as const;

const CHART_TYPE_PRESETS: Partial<Record<PanelEChartType, Partial<PanelDisplayDraft>>> = {
    Zone: { show_point: false, point_radius: 0, fill: 0.15, stroke: 1 },
    Dot: { show_point: true, point_radius: 2, fill: 0, stroke: 0 },
    Line: { show_point: true, point_radius: 0, fill: 0, stroke: 1 },
};

const DISPLAY_CHECKBOXES = [
    { field: 'show_point', label: 'Display data points in the line chart', forceCustom: true },
    { field: 'show_legend', label: 'Display legend' },
    { field: 'connect_nulls', label: 'Connect gaps between missing data points' },
] satisfies Array<{
    field: keyof Pick<
        PanelDisplayDraft,
        'show_point' | 'show_legend' | 'connect_nulls'
    >;
    label: string;
    forceCustom?: boolean;
}>;

const DISPLAY_NUMBER_INPUTS = [
    { field: 'point_radius', label: 'Point Radius' },
    { field: 'fill', label: 'Opacity Of Fill Area' },
    { field: 'stroke', label: 'Line Thickness' },
] satisfies Array<{
    field: keyof Pick<PanelDisplayDraft, 'point_radius' | 'fill' | 'stroke'>;
    label: string;
}>;

const CUSTOM_CHART_TYPE_STYLE = {
    ...CHART_TYPE_OPTION_STYLE, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: 'rgba(255, 255, 255, 0.72)',
    fontSize: '12px', background: 'transparent',
} as const;

const EditorDisplayTab = ({
    pDisplayConfig,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: PanelDisplayDraft;
    pOnChangeDisplayConfig: (config: PanelDisplayDraft) => void;
}) => {
    const updateDisplayConfig = (patch: Partial<PanelDisplayDraft>) => {
        pOnChangeDisplayConfig({ ...pDisplayConfig, ...patch });
    };

    const updateCustomStyle = (patch: Partial<PanelDisplayDraft>) => {
        updateDisplayConfig({ ...patch, chart_type: 'Custom' });
    };

    const changeChartType = (chartType: PanelEChartType) => {
        updateDisplayConfig({
            chart_type: chartType === 'Custom' ? 'Custom' : chartType,
            ...(CHART_TYPE_PRESETS[chartType] ?? {}),
        });
    };

    const getChartTypeOptionStyle = (isActive: boolean, isCustom: boolean) => ({
        ...(isCustom ? CUSTOM_CHART_TYPE_STYLE : CHART_TYPE_OPTION_STYLE),
        border: isActive ? 'solid 0.5px #4199ff' : 'solid 0.5px #b8c8da41',
        boxShadow: isActive
            ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)'
            : 'none',
    });

    return (
        <Page.ContentBlock style={{ padding: 0, margin: 0 }} pHoverNone>
            <Page.DpRow style={{ gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Chart Type</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {CHART_TYPE_OPTIONS.map((option) => {
                            const sIsActive = pDisplayConfig.chart_type === option.type;
                            const sStyle = getChartTypeOptionStyle(sIsActive, !option.src);
                            return option.src ? (
                                <img
                                    key={option.type}
                                    onClick={() => changeChartType(option.type)}
                                    style={sStyle}
                                    src={option.src}
                                    alt={option.alt}
                                />
                            ) : (
                                <button
                                    key={option.type}
                                    type="button"
                                    onClick={() => changeChartType(option.type)}
                                    style={sStyle}
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
                <Page.DpRow
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'start',
                        gap: '16px',
                        marginTop: '8px',
                    }}
                >
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
                            style={{ width: '150px', height: '30px' }}
                        />
                    ))}
                </Page.DpRow>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorDisplayTab;
