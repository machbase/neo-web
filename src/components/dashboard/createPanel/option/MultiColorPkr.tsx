import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef, useState } from 'react';
import CompactPicker from 'react-color/lib/components/compact/Compact';

interface MultiColorPkrStyle {
    aIdx: number;
    aAxisColor: (string | number)[];
    HandleItemColor: (key: string, target: any, idx: number) => void;
    HandleItem: (key: string, idx: number) => void;
    itemLen: number;
}

export const MultiColorPkr = (props: MultiColorPkrStyle) => {
    const { aIdx, aAxisColor, HandleItemColor, HandleItem, itemLen } = props;
    const sColorPickerRef = useRef<any>(null);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

    return (
        <div className="gauge-options-wrape">
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
                        <div className="color-picker">
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
        </div>
    );
};
