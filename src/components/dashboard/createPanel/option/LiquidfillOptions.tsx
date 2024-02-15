import { IconButton } from '@/components/buttons/IconButton';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef, useState } from 'react';
import { CompactPicker } from 'react-color';

interface LiquidfillOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LiquidfillOptions = (props: LiquidfillOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const sShapeList = ['container', 'circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow'];
    const sColorPickerRef = useRef<any>(null);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

    const sMenuStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: '10px',
        marginBottom: '5px',
    };

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
            <div style={{ ...sMenuStyle, zIndex: 999, overflow: 'none' }}>
                <span>Shape</span>
                <Select
                    pFontSize={12}
                    pWidth={100}
                    pBorderRadius={4}
                    pHeight={25}
                    pInitValue={pPanelOption.chartOptions?.shape}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'shape')}
                    pOptions={sShapeList}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Unit</span>
                <Input
                    pType="text"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.unit ?? '%'}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'unit')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
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
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Min</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.minData ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'minData')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Max</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.maxData ?? 100}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'maxData')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
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
            <div style={{ height: '10px' }} />
            <div style={sMenuStyle}>
                <span>Wave amplitude</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.amplitude ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => HandleOption(aEvent, 'amplitude')}
                />
            </div>
            <div style={{ height: '10px' }} />
            <div ref={sColorPickerRef} style={{ position: 'relative', ...sMenuStyle }}>
                <span>Background color</span>
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
                                backgroundColor: pPanelOption.chartOptions?.backgroundColor as string,
                            }}
                        ></div>
                    }
                    onClick={() => setIsColorPicker(!sIsColorPicker)}
                />
                {sIsColorPicker && (
                    <div className="color-picker" style={{ position: 'absolute', zIndex: 999 }}>
                        <CompactPicker
                            color={pPanelOption.chartOptions?.backgroundColor as string}
                            onChangeComplete={(aInfo: any) => {
                                HandleOption({ target: { value: aInfo.hex } }, 'backgroundColor');
                            }}
                        />
                    </div>
                )}
            </div>

            <div style={{ height: '10px' }} />
            <CheckBox
                pText="Wave animation"
                pDefaultChecked={pPanelOption.chartOptions?.waveAnimation ?? false}
                onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'waveAnimation')}
            />
            <div style={{ height: '10px' }} />
            <CheckBox
                pText="Outline"
                pDefaultChecked={pPanelOption.chartOptions?.isOutline ?? false}
                onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'isOutline')}
            />
        </div>
    );
};
