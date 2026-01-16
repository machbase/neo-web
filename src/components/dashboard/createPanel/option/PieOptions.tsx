import { Input, Checkbox, Page } from '@/design-system/components';

interface PieOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const PieOptions = (props: PieOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const handlePieOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
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
        <Page.DpRow style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '8px' }}>
            <Input
                label="Doughnut ratio"
                type="number"
                fullWidth
                value={pPanelOption.chartOptions?.doughnutRatio ?? 0}
                onChange={(aEvent: any) => handlePieOption(aEvent, 'doughnutRatio', false)}
            />
            <Checkbox
                size="sm"
                label="Nightingale mode"
                defaultChecked={pPanelOption.chartOptions?.roseType ?? false}
                onChange={(aEvent: any) => handlePieOption(aEvent, 'roseType', true)}
            />
        </Page.DpRow>
    );
};
