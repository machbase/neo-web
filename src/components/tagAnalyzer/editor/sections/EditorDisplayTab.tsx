import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    EditorChartType,
    EditorCheckboxInputEvent,
    EditorDisplayTabProps,
    EditorInputEvent,
} from '../EditorTypes';
import { CHART_TYPE_OPTIONS } from '../EditorConstants';
import { parseEditorNumber } from '../PanelEditorUtils';

/**
 * Controls how the panel is drawn visually.
 * Intent: Keep chart-type toggles and display style fields together in one section.
 * @param {PanelDisplayDraft} pDisplayConfig The current display draft.
 * @param {(aConfig: PanelDisplayDraft) => void} pOnChangeDisplayConfig Updates the display draft.
 * @returns {JSX.Element}
 */
const EditorDisplayTab = ({
    pDisplayConfig,
    pOnChangeDisplayConfig,
}: EditorDisplayTabProps) => {
    /**
     * Applies the display defaults for one chart type selection.
     * Intent: Keep the chart-type presets synchronized with the manual display inputs.
     * @param {PanelEChartType} value The selected chart type.
     * @returns {void}
     */
    const changeChartType = (value: EditorChartType) => {
        if (value === 'Zone') {
            pOnChangeDisplayConfig({
                ...pDisplayConfig,
                chart_type: value,
                show_point: false,
                point_radius: 0,
                fill: 0.15,
                stroke: 1,
            });
        } else if (value === 'Dot') {
            pOnChangeDisplayConfig({
                ...pDisplayConfig,
                chart_type: value,
                show_point: true,
                point_radius: 2,
                fill: 0,
                stroke: 0,
            });
        } else {
            pOnChangeDisplayConfig({
                ...pDisplayConfig,
                chart_type: value,
                show_point: true,
                point_radius: 0,
                fill: 0,
                stroke: 1,
            });
        }
    };

    return (
        <Page.ContentBlock
            style={{ padding: 0, margin: 0 }}
            pHoverNone
            pActive={undefined}
            pSticky={undefined}
        >
            <Page.DpRow style={{ gap: '20px' }} className={undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Page.ContentText pContent="Chart Type" pWrap={undefined} style={undefined} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {CHART_TYPE_OPTIONS.map((option) => {
                            const sIsActive = pDisplayConfig.chart_type === option.type;
                            return (
                                <img
                                    key={option.type}
                                    onClick={() => changeChartType(option.type)}
                                    style={{
                                        width: '80px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        border: sIsActive
                                            ? 'solid 0.5px #4199ff'
                                            : 'solid 0.5px transparent',
                                        boxShadow: sIsActive
                                            ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)'
                                            : 'none',
                                    }}
                                    src={option.src}
                                    alt={option.alt}
                                />
                            );
                        })}
                    </div>
                    <Checkbox
                        checked={pDisplayConfig.show_point}
                        onChange={(event: EditorCheckboxInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                show_point: event.target.checked,
                            });
                        }}
                        label="Display data points in the line chart"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />
                    <Checkbox
                        checked={pDisplayConfig.show_legend}
                        onChange={(event: EditorCheckboxInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                show_legend: event.target.checked,
                            });
                        }}
                        label="Display legend"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />
                </div>
                <Page.DpRow
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'start',
                        gap: '16px',
                        marginTop: '8px',
                    }}
                    className={undefined}
                >
                    <Input
                        label="Point Radius"
                        labelPosition="left"
                        type="number"
                        value={pDisplayConfig.point_radius}
                        onChange={(event: EditorInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                point_radius: parseEditorNumber(event.target.value),
                            });
                        }}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                        variant={undefined}
                        error={undefined}
                        helperText={undefined}
                        fullWidth={undefined}
                        leftIcon={undefined}
                        rightIcon={undefined}
                    />
                    <Input
                        label="Opacity Of Fill Area"
                        labelPosition="left"
                        type="number"
                        value={pDisplayConfig.fill}
                        onChange={(event: EditorInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                fill: parseEditorNumber(event.target.value),
                            });
                        }}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                        variant={undefined}
                        error={undefined}
                        helperText={undefined}
                        fullWidth={undefined}
                        leftIcon={undefined}
                        rightIcon={undefined}
                    />
                    <Input
                        label="Line Thickness"
                        labelPosition="left"
                        type="number"
                        value={pDisplayConfig.stroke}
                        onChange={(event: EditorInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                stroke: parseEditorNumber(event.target.value),
                            });
                        }}
                        size="md"
                        style={{ width: '150px', height: '30px' }}
                        variant={undefined}
                        error={undefined}
                        helperText={undefined}
                        fullWidth={undefined}
                        leftIcon={undefined}
                        rightIcon={undefined}
                    />
                </Page.DpRow>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorDisplayTab;
