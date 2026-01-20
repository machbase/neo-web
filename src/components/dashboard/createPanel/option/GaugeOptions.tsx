import { HierarchicalCombobox, Input, Checkbox, Page } from '@/design-system/components';
import { MultiColorPkr } from './MultiColorPkr';
import { findUnitById, UNITS } from '@/utils/Chart/AxisConstants';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GaugeOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleGaugeOption = (aValue: string | boolean, aKey: string) => {
        let sValue: any = aValue;
        if (aKey === 'unit') {
            const sTargetUnit = findUnitById(aValue as string);
            sValue = sTargetUnit;
        }
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: sValue,
                },
            };
        });
    };

    const HandleItem = (key: string, idx: number) => {
        const sNewList = JSON.parse(JSON.stringify(pPanelOption.chartOptions.axisLineStyleColor));
        if (key === 'add') sNewList.push(sNewList.at(-1));
        else sNewList.splice(idx, 1);

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    axisLineStyleColor: sNewList,
                },
            };
        });
    };

    const HandleItemColor = (key: string, target: any, idx: number) => {
        const sTmpColorList = pPanelOption.chartOptions.axisLineStyleColor.map((aColorItem: any, aIdx: number) => {
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
                    axisLineStyleColor: sTmpColorList,
                },
            };
        });
    };

    return (
        <>
            <HierarchicalCombobox.Root label="Unit" value={pPanelOption?.chartOptions?.unit?.id ?? ''} categories={UNITS} onChange={(value) => handleGaugeOption(value, 'unit')}>
                <HierarchicalCombobox.Input />
                <HierarchicalCombobox.Menu>
                    <HierarchicalCombobox.List emptyMessage="No units available" />
                </HierarchicalCombobox.Menu>
            </HierarchicalCombobox.Root>
            <Input label="Decimal" type="number" fullWidth value={pPanelOption.chartOptions?.digit} onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'digit')} />
            <Input label="Min" type="number" fullWidth value={pPanelOption.chartOptions?.min} onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'min')} />
            <Input label="Max" type="number" fullWidth value={pPanelOption.chartOptions?.max} onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'max')} />
            <Page.Divi />
            <Page.Collapse title="Axis">
                <Page.ContentBlock pHoverNone style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Input
                        label="Label distance"
                        type="number"
                        fullWidth
                        value={pPanelOption.chartOptions?.axisLabelDistance}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'axisLabelDistance')}
                    />
                    <Checkbox
                        size="sm"
                        label="Show axis tick"
                        defaultChecked={pPanelOption.chartOptions?.isAxisTick ?? false}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAxisTick')}
                    />
                    <Checkbox
                        size="sm"
                        label="Setting line colors (0 ~ 1)"
                        defaultChecked={pPanelOption.chartOptions?.isAxisLineStyleColor ?? false}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAxisLineStyleColor')}
                    />
                    {pPanelOption.chartOptions?.isAxisLineStyleColor && (
                        <>
                            <div style={{ height: '10px', marginRight: '0 !important' }} />
                            {pPanelOption.chartOptions?.axisLineStyleColor.map((aAxisColor: any, aIdx: number) => {
                                return (
                                    <MultiColorPkr
                                        key={aIdx}
                                        aIdx={aIdx}
                                        aAxisColor={aAxisColor}
                                        HandleItemColor={HandleItemColor}
                                        HandleItem={HandleItem}
                                        itemLen={pPanelOption.chartOptions?.axisLineStyleColor.length}
                                        min={0}
                                        max={1}
                                    />
                                );
                            })}
                        </>
                    )}
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Anchor">
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Checkbox
                        size="sm"
                        label="Show anchor"
                        defaultChecked={pPanelOption.chartOptions?.isAnchor ?? false}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAnchor')}
                    />
                    <Input
                        label="Size"
                        type="number"
                        fullWidth
                        disabled={!pPanelOption.chartOptions?.isAnchor}
                        value={pPanelOption.chartOptions?.anchorSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'anchorSize')}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
            <Page.Divi />
            <Page.Collapse title="Display value">
                <Page.ContentBlock pHoverNone style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Input
                        label="Font size"
                        type="number"
                        fullWidth
                        value={pPanelOption.chartOptions?.valueFontSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'valueFontSize')}
                    />
                    <Input
                        label="Offset form center"
                        type="number"
                        fullWidth
                        value={pPanelOption.chartOptions?.alignCenter}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'alignCenter')}
                    />
                    <Checkbox
                        size="sm"
                        label="Active animation"
                        defaultChecked={pPanelOption.chartOptions?.valueAnimation ?? false}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'valueAnimation')}
                    />
                </Page.ContentBlock>
            </Page.Collapse>
        </>
    );
};
