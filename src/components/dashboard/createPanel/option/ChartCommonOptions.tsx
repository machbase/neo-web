import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartThemeList } from '@/utils/constants';
import CheckBox from '@/components/inputs/CheckBox';
import { Collapse } from '@/components/collapse/Collapse';

interface ChartCommonOptionsProps {
    pPanelOption: any;
    pHandleDefaultOption: any;
    pHandleCheckboxOption: any;
}

export const ChartCommonOptions = (props: ChartCommonOptionsProps) => {
    const { pPanelOption, pHandleDefaultOption, pHandleCheckboxOption } = props;
    return (
        <>
            <Collapse title="Panel Option">
                <div className="panel-name-wrap">Title</div>
                <Input
                    pType="text"
                    pIsFullWidth
                    pHeight={30}
                    pValue={pPanelOption.name}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => pHandleDefaultOption(aEvent, 'name')}
                />
                <div style={{ height: '10px' }} />
                <div className="panel-name-wrap">Theme</div>
                <Select
                    pFontSize={14}
                    pIsFullWidth
                    pBorderRadius={4}
                    pInitValue={pPanelOption.theme}
                    pHeight={30}
                    onChange={(aEvent: any) => pHandleDefaultOption(aEvent, 'theme')}
                    pOptions={ChartThemeList}
                />
            </Collapse>
            <div className="divider" />
            <Collapse title="Legend">
                <CheckBox pText="Show Legend" pDefaultChecked={pPanelOption.isLegend} onChange={(aEvent: any) => pHandleCheckboxOption(aEvent, 'isLegend')} />
            </Collapse>
            <div className="divider" />
            <Collapse title="Tooltip">
                <CheckBox pText="Show Tooltip" pDefaultChecked={pPanelOption.isTooltip} onChange={(aEvent: any) => pHandleCheckboxOption(aEvent, 'isTooltip')} />
            </Collapse>
            <div className="divider" />
            <Collapse title="Data Zoom">
                <CheckBox pText="Use Zoom" pDefaultChecked={pPanelOption.isDataZoom} onChange={(aEvent: any) => pHandleCheckboxOption(aEvent, 'isDataZoom')} />
            </Collapse>
        </>
    );
};
