import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { CompactPicker } from 'react-color';
import { IconButton } from '@/components/buttons/IconButton';
import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Close, PlusCircle } from '@/assets/icons/Icon';

interface GaugeOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const GaugeOptions = (props: GaugeOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleGaugeOption = (aValue: string | boolean, aKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: aValue,
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
            <div className="menu-style">
                <div>Min</div>
                <Input
                    pType="number"
                    pWidth={100}
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
                    pWidth={100}
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
                        pHeight={25}
                        pWidth={100}
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
                                <LineStyleValue
                                    key={aIdx}
                                    aIdx={aIdx}
                                    aAxisColor={aAxisColor}
                                    HandleItemColor={HandleItemColor}
                                    HandleItem={HandleItem}
                                    itemLen={pPanelOption.chartOptions?.axisLineStyleColor.length}
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
                        pHeight={25}
                        pWidth={100}
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
                        pHeight={25}
                        pWidth={100}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.valueFontSize}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'valueFontSize')}
                    />
                </div>
                <div className="menu-style">
                    <div>Offset form center</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={100}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.alignCenter}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'alignCenter')}
                    />
                </div>
                <div className="menu-style">
                    <div>Decimal places</div>
                    <Input
                        pType="number"
                        pHeight={25}
                        pWidth={100}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.gaugeValueLimit}
                        onChange={(aEvent: any) => handleGaugeOption(aEvent.target.value, 'gaugeValueLimit')}
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

interface LineStyle {
    aIdx: number;
    aAxisColor: (string | number)[];
    HandleItemColor: (key: string, target: any, idx: number) => void;
    HandleItem: (key: string, idx: number) => void;
    itemLen: number;
}

const LineStyleValue = (props: LineStyle) => {
    const { aIdx, aAxisColor, HandleItemColor, HandleItem, itemLen } = props;
    const sColorPickerRef = useRef<any>(null);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);
    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));
    return (
        <>
            <div className="menu-style">
                <div ref={sColorPickerRef} style={{ position: 'relative', display: 'flex' }}>
                    <div style={{ marginRight: '10px' }}>
                        <Input
                            pType="number"
                            pWidth={100}
                            pHeight={25}
                            pBorderRadius={4}
                            pMin={0}
                            pMax={1}
                            pValue={aAxisColor[0] as string}
                            onChange={(aEvent) => HandleItemColor('l', aEvent.target.value, aIdx)}
                        />
                    </div>
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pIcon={
                            <div
                                style={{
                                    width: '14px',
                                    cursor: 'pointer',
                                    height: '14px',
                                    marginRight: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: aAxisColor[1] as any,
                                }}
                            ></div>
                        }
                        onClick={() => setIsColorPicker(!sIsColorPicker)}
                    />

                    {sIsColorPicker && (
                        <div className="color-picker" style={{ position: 'absolute', zIndex: 999 }}>
                            <CompactPicker
                                color={aAxisColor[1] as any}
                                onChangeComplete={(aInfo: any) => {
                                    HandleItemColor('r', aInfo.hex, aIdx);
                                }}
                            />
                        </div>
                    )}
                </div>
                {itemLen === aIdx + 1 ? (
                    <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={() => HandleItem('add', aIdx)} />
                ) : (
                    <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => HandleItem('remove', aIdx)} />
                )}
            </div>
        </>
    );
};
