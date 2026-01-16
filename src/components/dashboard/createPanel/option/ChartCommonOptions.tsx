import { ChartThemeList, ChartTooltipTriggerList, ChartLegendLeftList, ChartLegendTopList, ChartLegendOrientList } from '@/utils/constants';
import { generateUUID } from '@/utils';
import { HierarchicalCombobox, ColorPicker, Dropdown, Input, Page, Checkbox } from '@/design-system/components';
import { findUnitById, UNITS } from '@/utils/Chart/AxisConstants';

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
        let sValue: any = aValue;
        if (aKey === 'tooltipUnit') sValue = findUnitById(aValue as string);
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                id: generateUUID(),
                commonOptions: {
                    ...aPrev.commonOptions,
                    [aKey]: sValue,
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
            <Page.Divi />
            <Page.Collapse pTrigger="Panel option">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Input
                        label={
                            <Page.DpRowBetween>
                                <span>Title</span>
                                {pPanelOption.type === 'Geomap' && (
                                    <ColorPicker color={(pPanelOption?.titleColor as string) ?? '#000000'} onChange={(color: string) => handleCustomOption(color, 'titleColor')} />
                                )}
                            </Page.DpRowBetween>
                        }
                        type="text"
                        fullWidth
                        value={pPanelOption.title}
                        onChange={(aEvent: any) => handleTitle(aEvent)}
                    />
                    <Dropdown.Root
                        label="Theme"
                        options={ChartThemeList.map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.theme}
                        onChange={(value: string) => handleCustomOption(value, 'theme')}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                </Page.ContentBlock>
            </Page.Collapse>

            {pPanelOption?.type !== 'Text' && pPanelOption?.type !== 'Geomap' && (
                <>
                    <Page.Divi />
                    <Page.Collapse pTrigger="Legend">
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            <Checkbox
                                size="sm"
                                label="Show legend"
                                defaultChecked={pPanelOption.commonOptions.isLegend}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isLegend')}
                            />
                            <Dropdown.Root
                                label="Vertical"
                                options={ChartLegendTopList.map((option) => ({ label: option, value: option }))}
                                value={pPanelOption.commonOptions.legendTop}
                                onChange={(value: string) => handleCommonOption(value, 'legendTop')}
                                disabled={!pPanelOption.commonOptions.isLegend}
                                fullWidth
                            >
                                <Dropdown.Trigger />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                            <Dropdown.Root
                                label="Horizontal"
                                options={ChartLegendLeftList.map((option) => ({ label: option, value: option }))}
                                value={pPanelOption.commonOptions.legendLeft}
                                onChange={(value: string) => handleCommonOption(value, 'legendLeft')}
                                disabled={!pPanelOption.commonOptions.isLegend}
                                fullWidth
                            >
                                <Dropdown.Trigger />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                            <Dropdown.Root
                                label="Alignment type"
                                options={ChartLegendOrientList.map((option) => ({ label: option, value: option }))}
                                value={pPanelOption.commonOptions.legendOrient}
                                onChange={(value: string) => handleCommonOption(value, 'legendOrient')}
                                disabled={!pPanelOption.commonOptions.isLegend}
                                fullWidth
                            >
                                <Dropdown.Trigger />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                        </Page.ContentBlock>
                    </Page.Collapse>
                    <Page.Divi />
                    <Page.Collapse pTrigger="Panel padding">
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            <Input
                                label="Top"
                                type="number"
                                fullWidth
                                value={pPanelOption.commonOptions.gridTop}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridTop')}
                            />
                            <Input
                                label="Bottom"
                                type="number"
                                fullWidth
                                value={pPanelOption.commonOptions.gridBottom}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridBottom')}
                            />
                            <Input
                                label="Left"
                                type="number"
                                fullWidth
                                value={pPanelOption.commonOptions.gridLeft}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridLeft')}
                            />
                            <Input
                                label="Right"
                                type="number"
                                fullWidth
                                value={pPanelOption.commonOptions.gridRight}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.value, 'gridRight')}
                            />
                        </Page.ContentBlock>
                    </Page.Collapse>
                    <Page.Divi />
                    <Page.Collapse pTrigger="Tooltip">
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            <Checkbox
                                size="sm"
                                label="Show tooltip"
                                defaultChecked={pPanelOption.commonOptions.isTooltip}
                                onChange={(aEvent: any) => handleCommonOption(aEvent.target.checked, 'isTooltip')}
                            />
                            <Dropdown.Root
                                label="Type"
                                options={ChartTooltipTriggerList.map((option) => ({ label: option, value: option }))}
                                value={pPanelOption.commonOptions.tooltipTrigger}
                                onChange={(value: string) => handleCommonOption(value, 'tooltipTrigger')}
                                disabled={!pPanelOption.commonOptions.isTooltip}
                                fullWidth
                            >
                                <Dropdown.Trigger />
                                <Dropdown.Menu>
                                    <Dropdown.List />
                                </Dropdown.Menu>
                            </Dropdown.Root>
                            <HierarchicalCombobox.Root
                                label="Unit"
                                value={pPanelOption?.commonOptions?.tooltipUnit?.id ?? ''}
                                categories={UNITS}
                                onChange={(value) => handleCommonOption(value, 'tooltipUnit')}
                            >
                                <HierarchicalCombobox.Input />
                                <HierarchicalCombobox.Menu>
                                    <HierarchicalCombobox.List emptyMessage="No units available" />
                                </HierarchicalCombobox.Menu>
                            </HierarchicalCombobox.Root>
                            <Input
                                label="Decimals"
                                type="number"
                                fullWidth
                                placeholder="auto"
                                disabled={!pPanelOption.commonOptions.isTooltip}
                                value={pPanelOption.commonOptions?.tooltipDecimals ?? ''}
                                onChange={(aEvent) => handleCommonOption(aEvent.target.value, 'tooltipDecimals')}
                            />
                        </Page.ContentBlock>
                    </Page.Collapse>
                </>
            )}
        </>
    );
};
