import { IconButton } from '@/components/buttons/IconButton';
import { Collapse } from '@/components/collapse/Collapse';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef, useState } from 'react';
import CompactPicker from 'react-color/lib/components/compact/Compact';
import { MultiColorPkr } from './MultiColorPkr';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TextOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sChartColorPickerRef = useRef<any>(null);
    const sColorPickerRef = useRef<any>(null);
    const [sIsChartColorPicker, setIsChartColorPicker] = useState<boolean>(false);

    useOutsideClick(sChartColorPickerRef, () => setIsChartColorPicker(false));

    const HandleOption = (aEvent: any, aKey: any) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: aEvent.target.value,
                },
            };
        });
    };

    const HandleItem = (key: string, idx: number) => {
        const sNewList = JSON.parse(JSON.stringify(pPanelOption.chartOptions.color));
        if (key === 'add') sNewList.push(sNewList.at(-1));
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
        <div className="text-options-wrap">
            <Collapse title="Text option" isOpen>
                <div className="menu-style">
                    <span>Font size</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.fontSize ?? 50}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'fontSize')}
                    />
                </div>
                <div className="menu-style">
                    <span>Unit</span>
                    <Input
                        pType="text"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.unit ?? ''}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'unit')}
                    />
                </div>
                <div className="menu-style">
                    <span>Digit</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.digit ?? 0}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'digit')}
                    />
                </div>
                <div className="menu-style">
                    <span>Min</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.min ?? 0}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'min')}
                    />
                </div>
                <div className="menu-style">
                    <span>Max</span>
                    <Input
                        pType="number"
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.max ?? 0}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'max')}
                    />
                </div>
                <div style={{ height: '10px', marginRight: '0 !important' }} />
                <div className="menu-style" ref={sColorPickerRef} style={{ position: 'relative' }}>
                    <span>Color</span>
                </div>
                <>
                    {pPanelOption.chartOptions?.color.map((aAxisColor: any, aIdx: number) => {
                        return (
                            <MultiColorPkr
                                key={aIdx}
                                aIdx={aIdx}
                                aAxisColor={aAxisColor}
                                HandleItemColor={HandleItemColor}
                                HandleItem={HandleItem}
                                itemLen={pPanelOption.chartOptions?.color.length}
                            />
                        );
                    })}
                </>
            </Collapse>
            <div className="divider" />
            <Collapse title="Chart option" isOpen isDisable={pPanelOption.blockList.length < 2}>
                <div className="menu-style">
                    <span>Type</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pFontSize={12}
                        pIsDisabled={pPanelOption.blockList.length < 2}
                        pInitValue={pPanelOption.chartOptions?.chartType}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'chartType')}
                        pOptions={['line', 'bar', 'scatter']}
                    />
                </div>
                {pPanelOption.chartOptions?.chartType === 'line' && (
                    <div className="menu-style">
                        <span>Opacity (0 ~ 1)</span>
                        <Input
                            pType="number"
                            pWidth={100}
                            pHeight={25}
                            pMin={0}
                            pIsDisabled={pPanelOption.blockList.length < 2}
                            pMax={1}
                            pBorderRadius={4}
                            pValue={pPanelOption.chartOptions?.fillOpacity}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'fillOpacity')}
                        />
                    </div>
                )}
                {pPanelOption.chartOptions?.chartType !== 'bar' && (
                    <div className="menu-style">
                        <div>Symbol size</div>
                        <Input
                            pType="number"
                            pHeight={25}
                            pWidth={100}
                            pIsDisabled={pPanelOption.blockList.length < 2}
                            pBorderRadius={4}
                            pValue={pPanelOption.chartOptions?.symbolSize}
                            onChange={(aEvent: any) => HandleOption(aEvent, 'symbolSize')}
                        />
                    </div>
                )}
                <div className="menu-style" ref={sChartColorPickerRef} style={{ position: 'relative' }}>
                    <span>Color</span>
                    <IconButton
                        pWidth={20}
                        pHeight={20}
                        pDisabled={pPanelOption.blockList.length < 2}
                        pIcon={
                            <div
                                style={{
                                    width: '14px',
                                    cursor: 'inherit',
                                    height: '14px',
                                    marginRight: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: pPanelOption.chartOptions?.chartColor as string,
                                }}
                            ></div>
                        }
                        onClick={() => setIsChartColorPicker(!sIsChartColorPicker)}
                    />
                    {sIsChartColorPicker && (
                        <div className="color-picker">
                            <CompactPicker
                                color={pPanelOption.chartOptions?.chartColor as string}
                                onChangeComplete={(aInfo: any) => {
                                    HandleOption({ target: { value: aInfo.hex } }, 'chartColor');
                                }}
                            />
                        </div>
                    )}
                </div>
            </Collapse>
        </div>
    );
};
