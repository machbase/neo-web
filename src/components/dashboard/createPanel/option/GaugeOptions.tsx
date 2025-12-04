import './options.scss';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { MultiColorPkr } from './MultiColorPkr';
import { HierarchicalCombobox } from '@/design-system/components';
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
        <div>
            <div className="menu-style" style={{ display: 'flex', flex: 1, width: '100%', paddingRight: '10px' }}>
                <span>Unit</span>
                <HierarchicalCombobox.Root value={pPanelOption?.chartOptions?.unit?.id ?? ''} categories={UNITS} onChange={(value) => handleGaugeOption(value, 'unit')}>
                    <HierarchicalCombobox.Input />
                    <HierarchicalCombobox.Menu>
                        <HierarchicalCombobox.List emptyMessage="No units available" />
                    </HierarchicalCombobox.Menu>
                </HierarchicalCombobox.Root>
            </div>
            <div className="menu-style">
                <div>Decimal</div>
                <Input
                    pType="number"
                    pHeight={25}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.digit}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'digit')}
                />
            </div>
            <div className="menu-style">
                <div>Min</div>
                <Input
                    pType="number"
                    pWidth={'100%'}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.min}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'min')}
                />
            </div>
            <div className="menu-style">
                <div>Max</div>
                <Input
                    pType="number"
                    pWidth={'100%'}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.max}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'max')}
                />
            </div>
            <div className="divider" />
            <Collapse title="Axis">
                <div className="menu-style">
                    <div>Label distance</div>
                    <Input
                        pType="number"
                        pWidth={'100%'}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.axisLabelDistance}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'axisLabelDistance')}
                    />
                </div>
                <CheckBox
                    pText="Show axis tick"
                    pDefaultChecked={pPanelOption.chartOptions?.isAxisTick ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAxisTick')}
                />
                <div style={{ height: '10px' }} />
                <CheckBox
                    pText="Setting line colors (0 ~ 1)"
                    pDefaultChecked={pPanelOption.chartOptions?.isAxisLineStyleColor ?? false}
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
            </Collapse>
            <div className="divider" />
            <Collapse title="Anchor">
                <CheckBox
                    pText="Show anchor"
                    pDefaultChecked={pPanelOption.chartOptions?.isAnchor ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'isAnchor')}
                />
                <div style={{ height: '10px' }} />
                <div className="menu-style">
                    <div>Size</div>
                    <Input
                        pType="number"
                        pWidth={'100%'}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isAnchor}
                        pValue={pPanelOption.chartOptions?.anchorSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'anchorSize')}
                    />
                </div>
            </Collapse>
            <div className="divider" />
            <Collapse title="Display value">
                <div className="menu-style">
                    <div>Font size</div>
                    <Input
                        pType="number"
                        pWidth={'100%'}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.valueFontSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'valueFontSize')}
                    />
                </div>
                <div className="menu-style">
                    <div>Offset form center</div>
                    <Input
                        pType="number"
                        pWidth={'100%'}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.alignCenter}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'alignCenter')}
                    />
                </div>

                <CheckBox
                    pText="Active animation"
                    pDefaultChecked={pPanelOption.chartOptions?.valueAnimation ?? false}
                    onChange={(aEvent: any) => handleGaugeOption(aEvent.target.checked, 'valueAnimation')}
                />
            </Collapse>
        </div>
    );
};
