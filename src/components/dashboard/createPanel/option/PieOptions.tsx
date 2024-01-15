import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

interface PieOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const PieOptions = (props: PieOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const sMenuStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: '10px',
        marginBottom: '5px',
    };

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
            <div style={sMenuStyle}>
                <span>Doughnut Ratio</span>
                <Input
                    pType="number"
                    pWidth={50}
                    pHeight={25}
                    pBorderRadius={4}
                    pValue={pPanelOption.chartOptions?.doughnutRatio ?? 0}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => handlePieOption(aEvent, 'doughnutRatio', false)}
                />
            </div>
            <div style={{ height: '10px' }} />
            <CheckBox
                pText="Nightingale Mode"
                pDefaultChecked={pPanelOption.chartOptions?.roseType ?? false}
                onChange={(aEvent: any) => handlePieOption(aEvent, 'roseType', true)}
            />
        </div>
    );
};
