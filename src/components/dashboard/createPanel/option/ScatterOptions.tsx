import { Dropdown, Input, Checkbox, Page } from '@/design-system/components';
import { ChartSymbolList } from '@/utils/constants';

interface ScatterOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const ScatterOptions = (props: ScatterOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleScatterOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartOptions: {
                    ...aPrev.chartOptions,
                    [aKey]: aIsCheckbox ? aEvent.target.checked : aEvent.target.value,
                },
            };
        });
    };

    return (
        <>
            <Checkbox
                size="sm"
                label="Large data mode"
                defaultChecked={pPanelOption.chartOptions?.isLarge ?? false}
                onChange={(aEvent: any) => handleScatterOption(aEvent, 'isLarge', true)}
            />
            <Page.Divi />
            <Page.ContentDesc>Symbol</Page.ContentDesc>
            <Page.Space />
            <Dropdown.Root
                label="Type"
                options={ChartSymbolList.map((option) => ({ label: option, value: option }))}
                value={pPanelOption.chartOptions?.symbol}
                onChange={(value: string) => handleScatterOption({ target: { value } }, 'symbol', false)}
                fullWidth
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <Input label="Size" type="text" fullWidth value={pPanelOption.chartOptions?.symbolSize} onChange={(aEvent: any) => handleScatterOption(aEvent, 'symbolSize', false)} />
        </>
    );
};
