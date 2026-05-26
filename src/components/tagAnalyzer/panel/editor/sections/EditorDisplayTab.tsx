import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    EditorChartType,
    EditorCheckboxInputEvent,
    EditorInputEvent,
    PanelDisplayDraft,
} from '../EditorTypes';
import { CHART_TYPE_OPTIONS } from '../EditorConstants';
import { parseEditorNumber } from '../PanelEditorUtils';

const EditorDisplayTab = ({
    pDisplayConfig,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: PanelDisplayDraft;
    pOnChangeDisplayConfig: (config: PanelDisplayDraft) => void;
}) => {
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
        >
            <Page.DpRow style={{ gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Page.ContentText pContent="Chart Type" />
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
                    />
                    <Checkbox
                        checked={pDisplayConfig.connect_nulls}
                        onChange={(event: EditorCheckboxInputEvent) => {
                            pOnChangeDisplayConfig({
                                ...pDisplayConfig,
                                connect_nulls: event.target.checked,
                            });
                        }}
                        label="Connect gaps between missing data points"
                        size="sm"
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
                    />
                </Page.DpRow>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};

export default EditorDisplayTab;
