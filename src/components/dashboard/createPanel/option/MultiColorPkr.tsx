import { Close, PlusCircle } from '@/assets/icons/Icon';
import { Input, ColorPicker, Button, Page } from '@/design-system/components';

interface MultiColorPkrStyle {
    aIdx: number;
    aAxisColor: (string | number)[];
    HandleItemColor: (key: string, target: any, idx: number) => void;
    HandleItem: (key: string, idx: number) => void;
    itemLen: number;
    prefix?: string;
    alwayRmBtn?: boolean;
    min?: number;
    max?: number;
}

export const MultiColorPkr = (props: MultiColorPkrStyle) => {
    const { aIdx, aAxisColor, HandleItemColor, HandleItem, itemLen, alwayRmBtn, min = undefined, max = undefined, prefix } = props;

    return (
        <Page.DpRow style={{ gap: '8px' }}>
            {prefix && <Page.ContentDesc style={{ textWrap: 'nowrap' }}>{prefix}</Page.ContentDesc>}
            <Input type="number" size="sm" min={min} max={max} value={aAxisColor[0] as string} onChange={(aEvent) => HandleItemColor('l', aEvent.target.value, aIdx)} />
            <ColorPicker color={aAxisColor[1] as string} onChange={(color: string) => HandleItemColor('r', color, aIdx)} />
            {itemLen === aIdx + 1 ? (
                <Button size="side" variant="ghost" icon={<PlusCircle size={16} />} onClick={() => HandleItem('add', aIdx)} />
            ) : (
                <Button size="side" variant="ghost" icon={<Close size={16} />} onClick={() => HandleItem('remove', aIdx)} />
            )}
            {itemLen === aIdx + 1 && alwayRmBtn && <Button size="side" variant="ghost" icon={<Close size={16} />} onClick={() => HandleItem('remove', aIdx)} />}
        </Page.DpRow>
    );
};
