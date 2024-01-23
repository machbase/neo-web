import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartThemeList, ChartTooltipTriggerList } from '@/utils/constants';
import CheckBox from '@/components/inputs/CheckBox';
import { Collapse } from '@/components/collapse/Collapse';

interface ChartCommonOptionsProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const ChartCommonOptions = (props: ChartCommonOptionsProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleCustomOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                [aKey]: aValue,
            };
        });
    };

    const handleCommonOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                commonOptions: {
                    ...aPrev.commonOptions,
                    [aKey]: aValue,
                },
            };
        });
    };

    const handleTitle = (aEvent: any) => {
        handleCustomOption(aEvent.target.value, 'title');
        handleCommonOption(aEvent.target.value, 'title');
    };

    return (
        <>
            <Collapse title="Panel Option">
                <div className="panel-name-wrap">Title</div>
                <Input
                    pType="text"
                    pIsFullWidth
                    pHeight={30}
                    pValue={pPanelOption.title}
                    pSetValue={() => null}
                    pBorderRadius={4}
                    onChange={(aEvent: any) => handleTitle(aEvent)}
                />
                <div style={{ height: '10px' }} />
                <CheckBox
                    pText="Display Inside Title"
                    pDefaultChecked={pPanelOption.commonOptions.isInsideTitle}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isInsideTitle')}
                />
                <div style={{ height: '10px' }} />
                <div className="panel-name-wrap">Theme</div>
                <Select
                    pFontSize={14}
                    pIsFullWidth
                    pBorderRadius={4}
                    pInitValue={pPanelOption.theme}
                    pHeight={30}
                    onChange={(aEvent: any) => handleCustomOption(aEvent.target.value, 'theme')}
                    pOptions={ChartThemeList}
                />
            </Collapse>
            <div className="divider" />
            <Collapse title="Legend">
                <CheckBox
                    pText="Show Legend"
                    pDefaultChecked={pPanelOption.commonOptions.isLegend}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isLegend')}
                />
            </Collapse>
            <div className="divider" />
            <Collapse title="Tooltip">
                <CheckBox
                    pText="Show Tooltip"
                    pDefaultChecked={pPanelOption.commonOptions.isTooltip}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isTooltip')}
                />
                <div style={{ height: '10px' }} />
                <Select
                    pFontSize={14}
                    pIsFullWidth
                    pBorderRadius={4}
                    pIsDisabled={!pPanelOption.commonOptions.isTooltip}
                    pInitValue={pPanelOption.commonOptions.tooltipTrigger}
                    pHeight={30}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'tooltipTrigger')}
                    pOptions={ChartTooltipTriggerList}
                />
            </Collapse>
            <div className="divider" />
            <Collapse title="Data Zoom">
                <CheckBox
                    pText="Use Zoom"
                    pDefaultChecked={pPanelOption.commonOptions.isDataZoom}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isDataZoom')}
                />
            </Collapse>
        </>
    );
};
