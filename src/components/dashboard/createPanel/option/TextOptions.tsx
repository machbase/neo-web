import { InputSelect, Dropdown, Input, Page, Button, ColorPicker, BadgeSelect, type BadgeSelectItem, HierarchicalCombobox } from '@/design-system/components';
import { useEffect, useMemo } from 'react';
import { MultiColorPkr } from './MultiColorPkr';
import { PlusCircle } from '@/assets/icons/Icon';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { E_BLOCK_TYPE } from '@/utils/Chart/TransformDataParser';
import { ChartThemeTextColor } from '@/utils/constants';
import { findUnitById, UNITS } from '@/utils/Chart/AxisConstants';

interface ChartOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TextOptions = (props: ChartOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    // Flatten UNITS for InputSelect
    const unitOptions = useMemo(() => {
        return UNITS.flatMap(
            (category) =>
                category.items?.map((item) => ({
                    label: item.label,
                    value: item.id,
                })) || []
        );
    }, []);

    // Apply theme color to text option and chart option when theme changes or panel type changes to text
    useEffect(() => {
        if (pPanelOption.type === 'Text') {
            const sThemeColor = ChartThemeTextColor[pPanelOption.theme as keyof typeof ChartThemeTextColor] || '#333333';
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    chartOptions: {
                        ...aPrev.chartOptions,
                        color: [[pPanelOption.chartOptions?.color?.[0]?.[0] ?? 0, sThemeColor]],
                        chartColor: sThemeColor,
                    },
                };
            });
        }
    }, [pPanelOption.theme]);

    const getBlockList = useMemo((): any[] => {
        const sTmpBlockList = JSON.parse(JSON.stringify(pPanelOption?.blockList));
        const sTmpTrxBlockList = JSON.parse(JSON.stringify(pPanelOption?.transformBlockList ?? []));

        const sBlockResult =
            sTmpBlockList?.map((block: any, idx: number) => {
                return {
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
                    type: E_BLOCK_TYPE.STD,
                };
            }) ?? [];

        const sTrxBlockResult = sTmpTrxBlockList?.map((trxB: any, idx: number) => {
            return {
                name: trxB?.alias ? trxB?.alias : `TRANSFORM_VALUE(${idx})`,
                color: trxB?.color,
                idx: idx + 100,
                type: E_BLOCK_TYPE.TRX,
            };
        });

        return sBlockResult?.concat(sTrxBlockResult ?? []);
    }, [pPanelOption?.blockList, pPanelOption?.transformBlockList]);

    const handleSeriesOption = (aKey: string, aItem: BadgeSelectItem) => {
        let sTargetItem: undefined | number = aItem.idx;

        if (sTargetItem === pPanelOption?.chartOptions?.[aKey]?.[0]) sTargetItem = undefined;

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: [sTargetItem],
                },
            };
        });
    };

    const HandleOption = (aEvent: any, aKey: any) => {
        let sValue: any = '';
        if (aKey === 'unit') {
            const sTargetUnit = findUnitById(aEvent);
            sValue = sTargetUnit;
        } else sValue = aEvent.target.value;

        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: sValue,
                },
            };
        });
    };

    const HandleItem = (key: string, idx: number) => {
        const sNewList = JSON.parse(JSON.stringify(pPanelOption.chartOptions.color));
        if (key === 'add') sNewList.push([0, sNewList.at(-1)[1]]);
        else sNewList.splice(idx, 1);

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    color: sNewList,
                },
            };
        });
    };

    const HandleItemColor = (key: string, target: any, idx: number) => {
        const sTmpColorList = pPanelOption.chartOptions.color.map((aColorItem: any, aIdx: number) => {
            if (aIdx === idx) {
                if (key === 'l') return [target, aColorItem[1]];
                else return [aColorItem[0], target];
            } else return aColorItem;
        });

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    color: sTmpColorList,
                },
            };
        });
    };

    return (
        <>
            <Page.Collapse title="Text option">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <HierarchicalCombobox.Root label="Unit" value={pPanelOption?.chartOptions?.unit?.id ?? ''} categories={UNITS} onChange={(value) => HandleOption(value, 'unit')}>
                        <HierarchicalCombobox.Input />
                        <HierarchicalCombobox.Menu>
                            <HierarchicalCombobox.List emptyMessage="No units available" />
                        </HierarchicalCombobox.Menu>
                    </HierarchicalCombobox.Root>
                    <Input label="Decimals" type="number" fullWidth value={pPanelOption.chartOptions?.digit ?? 0} onChange={(aEvent: any) => HandleOption(aEvent, 'digit')} />
                    <Input
                        label="Font size"
                        type="number"
                        fullWidth
                        value={pPanelOption.chartOptions?.fontSize ?? 50}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'fontSize')}
                    />
                    <Page.Divi />
                    <Page.Collapse title="Color" size="sm">
                        <Page.ContentBlock style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }} pHoverNone>
                            {pPanelOption.chartOptions?.color.map((aAxisColor: any, aIdx: number) => {
                                if (aIdx === 0)
                                    return (
                                        <Page.DpRow key={aIdx} style={{ gap: '8px' }}>
                                            <Page.ContentDesc>Default</Page.ContentDesc>
                                            <ColorPicker color={pPanelOption.chartOptions?.color[0][1] as string} onChange={(color: string) => HandleItemColor('r', color, 0)} />
                                            {pPanelOption.chartOptions?.color.length === 1 && (
                                                <Button size="side" variant="ghost" icon={<PlusCircle size={16} />} onClick={() => HandleItem('add', 1)} />
                                            )}
                                        </Page.DpRow>
                                    );

                                return (
                                    <MultiColorPkr
                                        alwayRmBtn
                                        prefix="Over"
                                        aIdx={aIdx}
                                        aAxisColor={aAxisColor}
                                        HandleItemColor={HandleItemColor}
                                        HandleItem={HandleItem}
                                        itemLen={pPanelOption.chartOptions?.color.length}
                                    />
                                );
                            })}
                        </Page.ContentBlock>
                    </Page.Collapse>
                    <Page.Divi />
                    <BadgeSelect
                        label="Series"
                        selectedList={pPanelOption?.chartOptions?.textSeries}
                        list={getBlockList}
                        onChange={(item) => handleSeriesOption('textSeries', item)}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Chart option">
                <Page.ContentBlock pHoverNone style={{ padding: 0, gap: '8px', display: 'flex', flexDirection: 'column' }}>
                    <Dropdown.Root
                        label="Type"
                        options={['line', 'bar', 'scatter'].map((option) => ({ label: option, value: option }))}
                        value={pPanelOption.chartOptions?.chartType}
                        onChange={(value: string) => HandleOption({ target: { value } }, 'chartType')}
                        fullWidth
                    >
                        <Dropdown.Trigger />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    {pPanelOption.chartOptions?.chartType === 'line' && (
                        <Input
                            label="Opacity (0 ~ 1)"
                            type="number"
                            fullWidth
                            min={0}
                            max={1}
                            value={pPanelOption.chartOptions?.fillOpacity}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'fillOpacity')}
                        />
                    )}
                    {pPanelOption.chartOptions?.chartType !== 'bar' && (
                        <Input
                            label="Symbol size"
                            type="number"
                            fullWidth
                            value={pPanelOption.chartOptions?.symbolSize}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'symbolSize')}
                        />
                    )}
                    <Page.DpRow style={{ gap: '8px' }}>
                        <Page.ContentDesc>Color</Page.ContentDesc>
                        <ColorPicker color={pPanelOption.chartOptions?.chartColor} onChange={(color: string) => HandleOption({ target: { value: color } }, 'chartColor')} />
                    </Page.DpRow>
                    <Page.Divi />
                    <BadgeSelect
                        label="Series"
                        selectedList={pPanelOption?.chartOptions?.chartSeries}
                        list={getBlockList}
                        onChange={(item) => handleSeriesOption('chartSeries', item)}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
        </>
    );
};
