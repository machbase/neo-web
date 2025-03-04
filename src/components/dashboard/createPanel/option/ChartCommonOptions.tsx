import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartThemeList, ChartTooltipTriggerList, ChartLegendLeftList, ChartLegendTopList, ChartLegendOrientList } from '@/utils/constants';
import CheckBox from '@/components/inputs/CheckBox';
import { Collapse } from '@/components/collapse/Collapse';
import { generateUUID } from '@/utils';

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
                id: generateUUID(),
                [aKey]: aValue,
            };
        });
    };

    const handleCommonOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                id: generateUUID(),
                commonOptions: {
                    ...aPrev.commonOptions,
                    [aKey]: aValue,
                    isInsideTitle: true,
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
            <Collapse title="Panel option" isOpen>
                <div className="panel-name-wrap" style={{ marginBottom: '4px' }}>
                    Title
                </div>
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
                {/* <CheckBox
                    pText="Display inside title"
                    pDefaultChecked={pPanelOption.commonOptions.isInsideTitle}
                    onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isInsideTitle')}
                /> */}
                <div style={{ height: '10px' }} />
                <div className="menu-style">
                    <span>Theme</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pFontSize={14}
                        pBorderRadius={4}
                        pInitValue={pPanelOption.theme}
                        onChange={(aEvent: any) => handleCustomOption(aEvent.target.value, 'theme')}
                        pOptions={ChartThemeList}
                    />
                </div>
            </Collapse>
            {pPanelOption?.type !== 'Text' && pPanelOption?.type !== 'Geomap' && (
                <>
                    <div className="divider" />
                    <Collapse title="Legend">
                        <CheckBox
                            pText="Show legend"
                            pDefaultChecked={pPanelOption.commonOptions.isLegend}
                            onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isLegend')}
                        />
                        <div style={{ height: '10px' }} />
                        <div className="menu-style">
                            <span>Vertical</span>
                            <Select
                                pFontSize={14}
                                pWidth={100}
                                pBorderRadius={4}
                                pIsDisabled={!pPanelOption.commonOptions.isLegend}
                                pInitValue={pPanelOption.commonOptions.legendTop}
                                pHeight={25}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'legendTop')}
                                pOptions={ChartLegendTopList}
                            />
                        </div>
                        <div className="menu-style">
                            <span>Horizontal</span>
                            <Select
                                pFontSize={14}
                                pWidth={100}
                                pBorderRadius={4}
                                pIsDisabled={!pPanelOption.commonOptions.isLegend}
                                pInitValue={pPanelOption.commonOptions.legendLeft}
                                pHeight={25}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'legendLeft')}
                                pOptions={ChartLegendLeftList}
                            />
                        </div>
                        <div className="menu-style">
                            <span>Alignment type</span>
                            <Select
                                pFontSize={14}
                                pWidth={100}
                                pBorderRadius={4}
                                pIsDisabled={!pPanelOption.commonOptions.isLegend}
                                pInitValue={pPanelOption.commonOptions.legendOrient}
                                pHeight={25}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'legendOrient')}
                                pOptions={ChartLegendOrientList}
                            />
                        </div>
                    </Collapse>
                    <div className="divider" />
                    <Collapse title="Panel padding">
                        <div className="menu-style">
                            <span>Top</span>
                            <Input
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pValue={pPanelOption.commonOptions.gridTop}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridTop')}
                            />
                        </div>
                        <div className="menu-style">
                            <span>Bottom</span>
                            <Input
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pValue={pPanelOption.commonOptions.gridBottom}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridBottom')}
                            />
                        </div>
                        <div className="menu-style">
                            <span>Left</span>
                            <Input
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pValue={pPanelOption.commonOptions.gridLeft}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridLeft')}
                            />
                        </div>
                        <div className="menu-style">
                            <span>Right</span>
                            <Input
                                pWidth={100}
                                pHeight={25}
                                pBorderRadius={4}
                                pValue={pPanelOption.commonOptions.gridRight}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridRight')}
                            />
                        </div>
                    </Collapse>
                    <div className="divider" />
                    <Collapse title="Tooltip">
                        <CheckBox
                            pText="Show tooltip"
                            pDefaultChecked={pPanelOption.commonOptions.isTooltip}
                            onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isTooltip')}
                        />
                        <div style={{ height: '10px' }} />
                        <div className="menu-style">
                            <span>Type</span>
                            <Select
                                pWidth={100}
                                pHeight={25}
                                pFontSize={14}
                                pBorderRadius={4}
                                pIsDisabled={!pPanelOption.commonOptions.isTooltip}
                                pInitValue={pPanelOption.commonOptions.tooltipTrigger}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'tooltipTrigger')}
                                pOptions={ChartTooltipTriggerList}
                            />
                        </div>
                        <div className="menu-style">
                            <div>Unit</div>
                            <Input
                                pType="text"
                                pWidth={100}
                                pHeight={25}
                                pPlaceHolder="none"
                                pIsDisabled={!pPanelOption.commonOptions.isTooltip}
                                pBorderRadius={4}
                                pValue={pPanelOption.commonOptions?.tooltipUnit ?? ''}
                                onChange={(aEvent) => handleCommonOption(aEvent.target.value, 'tooltipUnit')}
                            />
                        </div>
                        <div className="menu-style">
                            <div>Decimals</div>
                            <Input
                                pType="number"
                                pWidth={100}
                                pHeight={25}
                                pPlaceHolder="auto"
                                pBorderRadius={4}
                                pIsDisabled={!pPanelOption.commonOptions.isTooltip}
                                pValue={pPanelOption.commonOptions?.tooltipDecimals ?? ''}
                                onChange={(aEvent) => handleCommonOption(aEvent.target.value, 'tooltipDecimals')}
                            />
                        </div>
                    </Collapse>
                </>
            )}
        </>
    );
};
