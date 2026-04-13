import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Input, Checkbox, Page } from '@/design-system/components';
import type {
    TagAnalyzerEditorNumericValue,
    TagAnalyzerPanelDisplayDraft,
} from '../PanelEditorTypes';

// Used by Display to type flag field.
type DisplayFlagField = 'show_point' | 'show_legend';
// Used by Display to type numeric field.
type DisplayNumericField = 'point_radius' | 'fill' | 'stroke';
// Used by Display to type checkbox input event.
type CheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};
// Used by Display to type number input event.
type NumberInputEvent = {
    target: {
        value: string;
    };
};

const parseEditorNumber = (aValue: string): TagAnalyzerEditorNumericValue => {
    return aValue === '' ? '' : Number(aValue);
};

// Controls how the panel is drawn visually.
// It switches chart style and updates legend, point, fill, and stroke display options.
const Display = ({
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
                show_point: 'N',
                point_radius: 0,
                fill: 0.15,
                stroke: 1,
            });
        } else if (aValue === 'Dot') {
            updateDisplayConfig({
                chart_type: aValue,
                show_point: 'Y',
                point_radius: 2,
                fill: 0,
                stroke: 0,
            });
        } else {
            updateDisplayConfig({
                chart_type: aValue,
                show_point: 'Y',
                point_radius: 0,
                fill: 0,
                stroke: 1,
            });
        }
    };

    const setDisplayFlag = (aField: DisplayFlagField, aChecked: boolean) => {
        updateDisplayConfig({
            [aField]: aChecked ? 'Y' : 'N',
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
                        <img
                            onClick={() => changeChartType('Zone')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border:
                                    pDisplayConfig.chart_type === 'Zone'
                                        ? 'solid 0.5px #4199ff'
                                        : 'solid 0.5px transparent',
                                boxShadow:
                                    pDisplayConfig.chart_type === 'Zone'
                                        ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)'
                                        : 'none',
                            }}
                            src={InnerLine}
                            alt="Zone Chart"
                        />
                        <img
                            onClick={() => changeChartType('Dot')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border:
                                    pDisplayConfig.chart_type === 'Dot'
                                        ? 'solid 0.5px #4199ff'
                                        : 'solid 0.5px transparent',
                                boxShadow:
                                    pDisplayConfig.chart_type === 'Dot'
                                        ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)'
                                        : 'none',
                            }}
                            src={Scatter}
                            alt="Dot Chart"
                        />
                        <img
                            onClick={() => changeChartType('Line')}
                            style={{
                                width: '80px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                border:
                                    pDisplayConfig.chart_type === 'Line'
                                        ? 'solid 0.5px #4199ff'
                                        : 'solid 0.5px transparent',
                                boxShadow:
                                    pDisplayConfig.chart_type === 'Line'
                                        ? 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)'
                                        : 'none',
                            }}
                            src={Line}
                            alt="Line Chart"
                        />
                    </div>
                    <Checkbox
                        checked={pDisplayConfig.show_point === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) =>
                            setDisplayFlag('show_point', aEvent.target.checked)
                        }
                        label="Display data points in the line chart"
                        size="sm"
                        error={undefined}
                        helperText={undefined}
                        indeterminate={undefined}
                    />
                    <Checkbox
                        checked={pDisplayConfig.show_legend === 'Y'}
                        onChange={(aEvent: CheckboxInputEvent) =>
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
                        onChange={(aEvent: NumberInputEvent) =>
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
                        onChange={(aEvent: NumberInputEvent) =>
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
                        onChange={(aEvent: NumberInputEvent) =>
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

export default Display;
