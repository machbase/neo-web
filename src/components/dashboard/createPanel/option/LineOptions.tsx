import { Dropdown, Input, Checkbox, Page } from '@/design-system/components';
import { ChartSymbolList } from '@/utils/constants';

interface LineOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LineOptions = (props: LineOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handleLineOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    [aKey]: aIsCheckbox ? aEvent.target.checked : aEvent.target.value,
                },
            };
        });
    };

    return (
        <div>
            <Checkbox
                size="sm"
                label="Fill area"
                defaultChecked={pPanelOption.chartOptions?.areaStyle ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'areaStyle', true)}
            />
            <div style={{ height: '10px' }} />
            {pPanelOption.chartOptions?.areaStyle ? (
                <>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Input
                            label="Opacity (0 ~ 1)"
                            type="number"
                            fullWidth
                            min={0}
                            max={1}
                            value={pPanelOption.chartOptions?.fillOpacity}
                            onChange={(aEvent: any) => handleLineOption(aEvent, 'fillOpacity', false)}
                        />
                    </Page.ContentBlock>
                    <div style={{ height: '10px' }} />
                </>
            ) : (
                <></>
            )}
            <Checkbox
                size="sm"
                label="Smooth line"
                defaultChecked={pPanelOption.chartOptions?.smooth ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'smooth', true)}
            />
            <div style={{ height: '10px' }} />
            <Checkbox
                size="sm"
                label="Step line"
                defaultChecked={pPanelOption.chartOptions?.isStep ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'isStep', true)}
            />
            <div style={{ height: '10px' }} />
            <Checkbox
                size="sm"
                label="Stack mode"
                defaultChecked={pPanelOption.chartOptions?.isStack ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'isStack', true)}
            />
            <div style={{ height: '10px' }} />
            <Checkbox
                size="sm"
                label="Large data mode"
                defaultChecked={pPanelOption.chartOptions?.isSampling ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'isSampling', true)}
            />
            <Page.Divi />
            <Checkbox
                size="sm"
                label="Symbol"
                defaultChecked={pPanelOption.chartOptions?.isSymbol ?? true}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'isSymbol', true)}
            />
            <div style={{ height: '10px' }} />
            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                <Dropdown.Root
                    label="Type"
                    options={ChartSymbolList.map((option) => ({ label: option, value: option }))}
                    value={pPanelOption.chartOptions?.symbol}
                    onChange={(value: string) => handleLineOption({ target: { value } }, 'symbol', false)}
                    fullWidth
                    disabled={!pPanelOption.chartOptions?.isSymbol}
                >
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
                <Input
                    label="Size"
                    type="text"
                    fullWidth
                    disabled={pPanelOption.chartOptions?.symbol === 'none' || !pPanelOption.chartOptions?.isSymbol}
                    value={pPanelOption.chartOptions?.symbolSize}
                    onChange={(aEvent: any) => handleLineOption(aEvent, 'symbolSize', false)}
                />
            </Page.ContentBlock>
        </div>
    );
};
