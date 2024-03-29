import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

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
        <div>
            <div className="menu-style">
                <span>Doughnut ratio</span>
                <Input
                    pType="number"
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.doughnutRatio ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => handlePieOption(aEvent, 'doughnutRatio', false)}
                />
            </div>
            <CheckBox
                pText="Nightingale mode"
                pDefaultChecked={pPanelOption.chartOptions?.roseType ?? false}
                onChange={(aEvent: any) => handlePieOption(aEvent, 'roseType', true)}
            />
        </div>
    );
};
