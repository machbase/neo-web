import { Dropdown, Input, Checkbox, Page } from '@/design-system/components';
import { ChartXAxisTypeList } from '@/utils/constants';

interface BarOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const BarOptions = (props: BarOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleBarOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        const sValue = aIsCheckbox ? aEvent.target.checked : isNaN(Number(aEvent.target.value)) ? aEvent.target.value : Number(aEvent.target.value);
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

    return (
        <div>
            <Checkbox size="sm" label="Stack mode" defaultChecked={pPanelOption.chartOptions?.isStack ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isStack', true)} />
            <div style={{ height: '10px' }} />
            <Checkbox size="sm" label="Large data mode" defaultChecked={pPanelOption.chartOptions?.isLarge ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isLarge', true)} />
            <Page.Divi />
            <Checkbox size="sm" label="Polar mode" defaultChecked={pPanelOption.chartOptions?.isPolar ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isPolar', true)} />
            <div style={{ height: '10px' }} />
            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                <Input
                    label="Max"
                    type="number"
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isPolar}
                    value={pPanelOption.chartOptions?.maxValue}
                    onChange={(aEvent: any) => handleBarOption(aEvent, 'maxValue', false)}
                />
                <Input
                    label="Start angle"
                    type="number"
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isPolar}
                    value={pPanelOption.chartOptions?.startAngle}
                    onChange={(aEvent: any) => handleBarOption(aEvent, 'startAngle', false)}
                />
                <Input
                    label="Radius"
                    type="number"
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isPolar}
                    value={pPanelOption.chartOptions?.polarRadius}
                    onChange={(aEvent: any) => handleBarOption(aEvent, 'polarRadius', false)}
                />
                <Input
                    label="Polar size"
                    type="number"
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isPolar}
                    value={pPanelOption.chartOptions?.polarSize}
                    onChange={(aEvent: any) => handleBarOption(aEvent, 'polarSize', false)}
                />
                <Dropdown.Root
                    label="Polar axis"
                    options={ChartXAxisTypeList.map((option) => ({ label: option, value: option }))}
                    value={pPanelOption.chartOptions?.polarAxis}
                    onChange={(value: string) => handleBarOption({ target: { value } }, 'polarAxis', false)}
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isPolar}
                >
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </Page.ContentBlock>
        </div>
    );
};
