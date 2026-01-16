import { IconButton } from '@/components/buttons/IconButton';
import { HierarchicalCombobox, Dropdown, Input, Checkbox, Page, ColorPicker } from '@/design-system/components';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef, useState } from 'react';
import { CompactPicker } from 'react-color';
// import './options.scss';
import { findUnitById, UNITS } from '@/utils/Chart/AxisConstants';

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

    return (
        <>
            <HierarchicalCombobox.Root label="Unit" value={pPanelOption?.chartOptions?.unit?.id ?? ''} categories={UNITS} onChange={(value) => HandleOption(value, 'unit')}>
                <HierarchicalCombobox.Input />
                <HierarchicalCombobox.Menu>
                    <HierarchicalCombobox.List emptyMessage="No units available" />
                </HierarchicalCombobox.Menu>
            </HierarchicalCombobox.Root>
            <Input label="Decimals" type="number" fullWidth value={pPanelOption.chartOptions?.digit ?? 0} onChange={(aEvent: any) => HandleOption(aEvent, 'digit')} />
            <Input label="Min" type="number" fullWidth value={pPanelOption.chartOptions?.minData ?? 0} onChange={(aEvent: any) => HandleOption(aEvent, 'minData')} />
            <Input label="Max" type="number" fullWidth value={pPanelOption.chartOptions?.maxData ?? 100} onChange={(aEvent: any) => HandleOption(aEvent, 'maxData')} />
            <Page.Divi />
            <Dropdown.Root
                label="Shape"
                options={sShapeList.map((option) => ({ label: option, value: option }))}
                value={pPanelOption.chartOptions?.shape}
                onChange={(value: string) => HandleOption({ target: { value } }, 'shape')}
                fullWidth
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <Input label="Font size" type="number" fullWidth value={pPanelOption.chartOptions?.fontSize ?? 50} onChange={(aEvent: any) => HandleOption(aEvent, 'fontSize')} />
            <Input label="Wave amplitude" type="number" fullWidth value={pPanelOption.chartOptions?.amplitude ?? 0} onChange={(aEvent: any) => HandleOption(aEvent, 'amplitude')} />
            <Page.Divi />
            <Page.DpRow style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'start', alignItems: 'start', flex: 1, width: '100%' }}>
                <Page.DpRow style={{ gap: '8px' }}>
                    <ColorPicker
                        color={(pPanelOption.chartOptions?.backgroundColor as string) ?? '#000000'}
                        onChange={(color: string) => HandleOption({ target: { value: color } }, 'backgroundColor')}
                    />
                    <Page.ContentDesc>Background color</Page.ContentDesc>
                </Page.DpRow>
                <Checkbox
                    size="sm"
                    label="Wave animation"
                    defaultChecked={pPanelOption.chartOptions?.waveAnimation ?? false}
                    onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'waveAnimation')}
                />
                <Checkbox
                    size="sm"
                    label="Outline"
                    defaultChecked={pPanelOption.chartOptions?.isOutline ?? false}
                    onChange={(aEvent: any) => HandleOption({ target: { value: aEvent.target.checked } }, 'isOutline')}
                />
            </Page.DpRow>
        </>
    );
};
