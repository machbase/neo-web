import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';

interface BarOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const BarOptions = (props: BarOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;

    const sPolarMenuStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: '10px',
        marginBottom: '5px',
    };

    const handleBarOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
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
        <div>
            <CheckBox pText="Stack Mode" pDefaultChecked={pPanelOption.chartOptions?.isStack ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isStack', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Large Data Mode" pDefaultChecked={pPanelOption.chartOptions?.isLarge ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isLarge', true)} />
            <div style={{ height: '10px' }} />
            <Collapse title="polar option">
                <CheckBox pText="Polar Mode" pDefaultChecked={pPanelOption.chartOptions?.isPolar ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isPolar', true)} />
                <div style={sPolarMenuStyle}>
                    <span>Max</span>
                    <Input
                        pWidth={50}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pValue={pPanelOption.chartOptions?.maxValue}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'maxValue', false)}
                    />
                </div>
                <div style={sPolarMenuStyle}>
                    <span>Start Angle</span>
                    <Input
                        pWidth={50}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pValue={pPanelOption.chartOptions?.startAngle}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'startAngle', false)}
                    />
                </div>
            </Collapse>
        </div>
    );
};