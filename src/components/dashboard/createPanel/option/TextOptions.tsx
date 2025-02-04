import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef, useState } from 'react';
import CompactPicker from 'react-color/lib/components/compact/Compact';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const TextOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sChartColorPickerRef = useRef<any>(null);
    const sColorPickerRef = useRef<any>(null);
    const [sIsChartColorPicker, setIsChartColorPicker] = useState<boolean>(false);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);

    useOutsideClick(sChartColorPickerRef, () => setIsChartColorPicker(false));
    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

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

    return (
        <div>
            <div className="menu-style">
                <span>Type</span>
                <Select
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pFontSize={12}
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
                        pBorderRadius={4}
                        pValue={pPanelOption.chartOptions?.symbolSize}
                        onChange={(aEvent: any) => HandleOption(aEvent, 'symbolSize')}
                    />
                </div>
            )}
            <div style={{ height: '10px' }} />
            <div className="menu-style" ref={sChartColorPickerRef} style={{ position: 'relative' }}>
                <span>Color</span>
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
            <div className="divider" />
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
            <div className="menu-style" ref={sColorPickerRef} style={{ position: 'relative' }}>
                <span>Text color</span>
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
                                backgroundColor: pPanelOption.chartOptions?.color as string,
                            }}
                        ></div>
                    }
                    onClick={() => setIsColorPicker(!sIsColorPicker)}
                />
                {sIsColorPicker && (
                    <div className="color-picker">
                        <CompactPicker
                            color={pPanelOption.chartOptions?.color as string}
                            onChangeComplete={(aInfo: any) => {
                                HandleOption({ target: { value: aInfo.hex } }, 'color');
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
