import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    TagAnalyzerPanelDisplayDraft,
    EditorCheckboxInputEvent,
    EditorInputEvent,
} from '../PanelEditorTypes';
import { parseEditorNumber } from '../PanelEditorTypes';

// Used by DisplaySection to type flag field.
type DisplayFlagField = 'show_point' | 'show_legend';
// Used by DisplaySection to type numeric field.
type DisplayNumericField = 'point_radius' | 'fill' | 'stroke';

// Used by DisplaySection to type chart type option.
type ChartTypeOption = {
    type: string;
    src: string;
    alt: string;
};

const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
    { type: 'Zone', src: InnerLine, alt: 'Zone Chart' },
    { type: 'Dot', src: Scatter, alt: 'Dot Chart' },
    { type: 'Line', src: Line, alt: 'Line Chart' },
];

// Controls how the panel is drawn visually.
// It switches chart style and updates legend, point, fill, and stroke display options.
const DisplaySection = ({
    pDisplayConfig,
    pOnChangeDisplayConfig,
}: {
    pDisplayConfig: TagAnalyzerPanelDisplayDraft;
    pOnChangeDisplayConfig: (aConfig: TagAnalyzerPanelDisplayDraft) => void;
}) => {
    const updateDisplayConfig = (aPatch: Partial<TagAnalyzerPanelDisplayDraft>) => {
        pOnChangeDisplayConfig({ ...pDisplayConfig, ...aPatch });
    };

    const changeChartType = (aValue: string) => {
        if (aValue === 'Zone') {
            updateDisplayConfig({
                chart_type: aValue,
                show_point: false,
                point_radius: 0,
                fill: 0.15,
                stroke: 1,
            });
        } else if (aValue === 'Dot') {
            updateDisplayConfig({
                chart_type: aValue,
                show_point: true,
                point_radius: 2,
                fill: 0,
                stroke: 0,
            });
        } else {
            updateDisplayConfig({
                chart_type: aValue,
                show_point: true,
                point_radius: 0,
                fill: 0,
                stroke: 1,
            });
        }
    };

    const setDisplayFlag = (aField: DisplayFlagField, aChecked: boolean) => {
        updateDisplayConfig({
            [aField]: aChecked,
        } as Partial<TagAnalyzerPanelDisplayDraft>);
    };

    const setDisplayNumber = (aField: DisplayNumericField, aValue: string) => {
        updateDisplayConfig({
            [aField]: parseEditorNumber(aValue),
        } as Partial<TagAnalyzerPanelDisplayDraft>);
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
                        {CHART_TYPE_OPTIONS.map((aOption) => {
                            const sIsActive = pDisplayConfig.chart_type === aOption.type;
                            return (
                                <img
                                    key={aOption.type}
                                    onClick={() => changeChartType(aOption.type)}
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
                                    src={aOption.src}
                                    alt={aOption.alt}
                                />
                            );
                        })}
                    </div>
                    <Checkbox
                        checked={pDisplayConfig.show_point}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setDisplayFlag('show_point', aEvent.target.checked)
                        }
                        label="Display data points in the line chart"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />
                    <Checkbox
                        checked={pDisplayConfig.show_legend}
                        onChange={(aEvent: EditorCheckboxInputEvent) =>
                            setDisplayFlag('show_legend', aEvent.target.checked)
                        }
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
                        onChange={(aEvent: EditorInputEvent) =>
                            setDisplayNumber('point_radius', aEvent.target.value)
                        }
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
                        onChange={(aEvent: EditorInputEvent) =>
                            setDisplayNumber('fill', aEvent.target.value)
                        }
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
                        onChange={(aEvent: EditorInputEvent) =>
                            setDisplayNumber('stroke', aEvent.target.value)
                        }
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

export default DisplaySection;
