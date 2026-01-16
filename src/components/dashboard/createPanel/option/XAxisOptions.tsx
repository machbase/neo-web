import { HierarchicalCombobox, Dropdown, Input, Checkbox, Page, BadgeSelect, type BadgeSelectItem } from '@/design-system/components';
import { E_CHART_TYPE } from '@/type/eChart';
import { ChartAxisUnits, findUnitById, UNITS } from '@/utils/Chart/AxisConstants';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { useMemo } from 'react';

interface XAxisOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const XAxisOptions = (props: XAxisOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sIntervalTypeList = ['none', 'sec', 'min', 'hour'];

    const handleAxisInterval = (aType: string, aValue: number | string) => {
        pSetPanelOption((aPrev: any) => {
            const sResult = {
                ...aPrev,
                axisInterval: {
                    IntervalType: aType === 'none' ? '' : aType,
                    IntervalValue: aValue,
                },
            };
            return sResult;
        });
    };

    const handleSeries = (aItem: BadgeSelectItem) => {
        const sTmpUseSecondXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions[0]));
        if (sTmpUseSecondXAxis.useBlockList.includes(aItem.idx)) return;
        else sTmpUseSecondXAxis.useBlockList = [aItem.idx];

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: [sTmpUseSecondXAxis],
            };
        });
    };

    const getBlockList = useMemo((): any[] => {
        return (
            pPanelOption?.blockList?.map((block: any, idx: number) => ({
                name: block.customFullTyping.use
                    ? 'custom'
                    : getChartSeriesName({
                          alias: block?.useCustom ? block?.values[0]?.alias : block?.alias,
                          table: block?.table,
                          column: block?.useCustom ? block?.values[0]?.value : block?.value,
                          aggregator: block?.useCustom ? block?.values[0]?.aggregator : block?.aggregator,
                      }),
                color: block.color,
                idx: idx,
            })) ?? []
        );
    }, [pPanelOption.blockList]);

    const HandleMinMax = (aTarget: string, aValue: number | string) => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions));
        sCurrentXAxis[0][aTarget] = aValue;
        if (sCurrentXAxis[0]['min'] && sCurrentXAxis[0]['min'] !== '' && sCurrentXAxis[0]['max'] && sCurrentXAxis[0]['max'] !== '') sCurrentXAxis[0]['useMinMax'] = true;
        else sCurrentXAxis[0]['useMinMax'] = false;
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };

    const handleXAxisOption = (aKey: string, aEvent: any) => {
        const sCurrentXAxis = JSON.parse(JSON.stringify(pPanelOption.xAxisOptions));
        if (aKey === 'unit') {
            const sTargetUnit = findUnitById(aEvent);
            sCurrentXAxis[0].unit = sTargetUnit;
        } else if (aKey === 'key') {
            const sTargetLabel = ChartAxisUnits.find((unit) => unit[aKey] === aEvent.target.value);
            sCurrentXAxis[0].label = sTargetLabel;
        } else if (aKey === 'decimals') sCurrentXAxis[0].label[aKey] = aEvent.target.value;
        else sCurrentXAxis[0][aKey] = !aEvent.target.checked;

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                xAxisOptions: sCurrentXAxis,
            };
        });
    };

    return (
        <>
            <Page.Divi />
            <Page.Collapse title="xAxis">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Dropdown.Root
                        label="Interval type"
                        options={sIntervalTypeList.map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.axisInterval.IntervalType || 'none'}
                        onChange={(value: string) => handleAxisInterval(value, pPanelOption.axisInterval.IntervalValue)}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    <Input
                        label="Interval value"
                        type="number"
                        fullWidth
                        placeholder="auto"
                        value={pPanelOption.axisInterval.IntervalValue.toString() ?? ''}
                        onChange={(aEvent) => handleAxisInterval(pPanelOption.axisInterval.IntervalType, aEvent.target.value)}
                    />
                    {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && (
                        <>
                            <Page.Divi />
                            <Page.Collapse title="Options">
                                <Page.ContentBlock pHoverNone style={{ padding: 0, gap: '8px', display: 'flex', flexDirection: 'column' }}>
                                    <HierarchicalCombobox.Root
                                        label="Unit"
                                        value={pPanelOption?.xAxisOptions[0]?.unit?.id ?? ''}
                                        categories={UNITS}
                                        onChange={(value) => handleXAxisOption('unit', value)}
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
                                        value={pPanelOption?.xAxisOptions[0]?.label?.decimals ?? ''}
                                        onChange={(aEvent) => handleXAxisOption('decimals', aEvent)}
                                    />
                                    <Input
                                        label="Min"
                                        type="number"
                                        fullWidth
                                        placeholder="auto"
                                        value={pPanelOption?.xAxisOptions[0]?.min ?? ''}
                                        onChange={(aEvent: any) => HandleMinMax('min', aEvent.target.value)}
                                    />
                                    <Input
                                        label="Max"
                                        type="number"
                                        fullWidth
                                        placeholder="auto"
                                        value={pPanelOption?.xAxisOptions[0]?.max ?? ''}
                                        onChange={(aEvent: any) => HandleMinMax('max', aEvent.target.value)}
                                    />
                                    <Checkbox
                                        size="sm"
                                        label="Start at zero"
                                        defaultChecked={!pPanelOption?.xAxisOptions[0]?.scale}
                                        onChange={(aEvent: any) => handleXAxisOption('scale', aEvent)}
                                    />
                                </Page.ContentBlock>
                            </Page.Collapse>
                        </>
                    )}
                    {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && (
                        <>
                            <Page.Divi />
                            <BadgeSelect label="Series" selectedList={pPanelOption?.xAxisOptions[0]?.useBlockList || [0]} list={getBlockList} onChange={handleSeries} />
                        </>
                    )}
                </Page.ContentBlock>
            </Page.Collapse>
        </>
    );
};
