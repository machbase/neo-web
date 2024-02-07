import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { ChartXAxisTypeList } from '@/utils/constants';

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
            <CheckBox pText="Stack mode" pDefaultChecked={pPanelOption.chartOptions?.isStack ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isStack', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Large data mode" pDefaultChecked={pPanelOption.chartOptions?.isLarge ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isLarge', true)} />
            <div style={{ height: '10px' }} />
            <Collapse title="Polar option" isOpen={pPanelOption.chartOptions?.isPolar ?? false}>
                <CheckBox pText="Polar mode" pDefaultChecked={pPanelOption.chartOptions?.isPolar ?? false} onChange={(aEvent: any) => handleBarOption(aEvent, 'isPolar', true)} />
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
                    <span>Start angle</span>
                    <Input
                        pType="number"
                        pWidth={50}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pValue={pPanelOption.chartOptions?.startAngle}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'startAngle', false)}
                    />
                </div>
                <div style={sPolarMenuStyle}>
                    <span>Radius</span>
                    <Input
                        pType="number"
                        pWidth={50}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pValue={pPanelOption.chartOptions?.polarRadius}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'polarRadius', false)}
                    />
                </div>
                <div style={sPolarMenuStyle}>
                    <span>Polar size</span>
                    <Input
                        pType="number"
                        pWidth={50}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pValue={pPanelOption.chartOptions?.polarSize}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'polarSize', false)}
                    />
                </div>
                <div style={sPolarMenuStyle}>
                    <span>Polar axis</span>
                    <Select
                        pWidth={100}
                        pHeight={25}
                        pBorderRadius={4}
                        pIsDisabled={!pPanelOption.chartOptions?.isPolar}
                        pInitValue={pPanelOption.chartOptions?.polarAxis}
                        onChange={(aEvent: any) => handleBarOption(aEvent, 'polarAxis', false)}
                        pOptions={ChartXAxisTypeList}
                    />
                </div>
            </Collapse>
        </div>
    );
};
