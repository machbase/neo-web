import { Dropdown, Input, Page } from '@/design-system/components';
import { ChartSymbolList } from '@/utils/constants';

interface ScatterOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const AdvancedScatterOptions = (props: ScatterOptionProps) => {
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
        <Page.Collapse title="Chart option" data-testid="chart-option-section">
            {/* <Checkbox
                size="sm"
                label="Large data mode"
                defaultChecked={pPanelOption.chartOptions?.isLarge ?? false}
                onChange={(aEvent: any) => handleScatterOption(aEvent, 'isLarge', true)}
                data-testid="large-data-mode"
            />
            <Page.Divi /> */}
            <Page.ContentBlock pHoverNone style={{ padding: 0, gap: '8px', display: 'flex', flexDirection: 'column' }}>
                <Page.ContentDesc>Symbol</Page.ContentDesc>
                <Dropdown.Root
                    label="Type"
                    options={ChartSymbolList.map((option) => ({ label: option, value: option }))}
                    value={pPanelOption.chartOptions?.symbol}
                    onChange={(value: string) => handleScatterOption({ target: { value } }, 'symbol', false)}
                    fullWidth
                >
                    <Dropdown.Trigger data-testid="type" />
                    <Dropdown.Menu data-testid="dashboard-panel-editor-dropdown-menu">
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
                <Input
                    label="Size"
                    type="text"
                    fullWidth
                    value={pPanelOption.chartOptions?.symbolSize}
                    onChange={(aEvent: any) => handleScatterOption(aEvent, 'symbolSize', false)}
                    data-testid="size"
                />
            </Page.ContentBlock>
        </Page.Collapse>
    );
};
